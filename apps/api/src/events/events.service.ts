import { Injectable, NotFoundException } from "@nestjs/common";
import { EventStatus, Prisma } from "@prisma/client";
import { Paginated, paginated } from "@widgets/shared";
import { CacheService, CACHE_TTL } from "../infra/cache/cache.service";
import { PrismaService } from "../infra/prisma/prisma.service";
import { ListEventsQuery } from "./dto/list-events.query";

const EVENT_CARD_SELECT = {
  id: true,
  type: true,
  name: true,
  shortName: true,
  startTime: true,
  endTime: true,
  status: true,
  statusDetail: true,
  metadata: true,
  sport: { select: { slug: true, name: true, accentColor: true } },
  competition: { select: { slug: true, name: true } },
  round: { select: { number: true, label: true } },
  venue: { select: { name: true, city: true, country: true } },
} satisfies Prisma.EventSelect;

export type EventCard = Prisma.EventGetPayload<{ select: typeof EVENT_CARD_SELECT }>;

const UPCOMING_EXCLUDED: EventStatus[] = ["FINISHED", "CANCELLED"];

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async list(query: ListEventsQuery): Promise<Paginated<EventCard>> {
    const where: Prisma.EventWhereInput = {
      ...(query.sport ? { sport: { slug: query.sport } } : {}),
      ...(query.competition ? { competition: { slug: query.competition } } : {}),
      ...(query.season ? { season: { name: query.season } } : {}),
      ...(query.roundId ? { roundId: query.roundId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: { in: query.status } } : {}),
      ...(query.from || query.to
        ? { startTime: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        orderBy: { startTime: query.sort },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: EVENT_CARD_SELECT,
      }),
      this.prisma.event.count({ where }),
    ]);

    return paginated(items, query.page, query.limit, total);
  }

  async upcoming(opts: { sportSlug?: string; competitionSlug?: string; limit: number }): Promise<EventCard[]> {
    const key = this.cache.buildKey("events", "upcoming", opts.sportSlug ?? "all", opts.competitionSlug ?? "all", opts.limit);
    const cached = await this.cache.getJson<EventCard[]>(key);
    if (cached) return cached;

    const events = await this.prisma.event.findMany({
      where: {
        startTime: { gte: new Date() },
        status: { notIn: UPCOMING_EXCLUDED },
        ...(opts.sportSlug ? { sport: { slug: opts.sportSlug } } : {}),
        ...(opts.competitionSlug ? { competition: { slug: opts.competitionSlug } } : {}),
      },
      orderBy: { startTime: "asc" },
      take: opts.limit,
      select: EVENT_CARD_SELECT,
    });

    await this.cache.setJson(key, events, CACHE_TTL.schedule);
    return events;
  }

  async live(sportSlug?: string): Promise<EventCard[]> {
    const key = this.cache.buildKey("events", "live", sportSlug ?? "all");
    const cached = await this.cache.getJson<EventCard[]>(key);
    if (cached) return cached;

    const events = await this.prisma.event.findMany({
      where: {
        status: { in: ["LIVE", "PAUSED"] satisfies EventStatus[] },
        ...(sportSlug ? { sport: { slug: sportSlug } } : {}),
      },
      orderBy: { startTime: "desc" },
      take: 20,
      select: EVENT_CARD_SELECT,
    });

    await this.cache.setJson(key, events, 10);
    return events;
  }

  async detail(id: string) {
    const cached = await this.cache.getJson(`evt:${id}`);
    if (cached) return cached;

    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        sport: { select: { slug: true, name: true, accentColor: true } },
        competition: { select: { slug: true, name: true } },
        season: { select: { name: true } },
        round: { select: { number: true, label: true, startTime: true } },
        venue: true,
        participants: {
          include: {
            team: { select: { slug: true, name: true, shortName: true, color: true } },
            player: { select: { slug: true, name: true, shortName: true, number: true } },
            results: true,
          },
        },
      },
    });
    if (!event) throw new NotFoundException(`Event ${id} not found`);

    // Results embedded per-participant; flatten for the wire.
    const results = event.participants
      .flatMap((p) => p.results.map((r) => ({ ...r, participant: p })))
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
      .map((r) => ({
        positionText: r.positionText ?? (r.position != null ? String(r.position) : null),
        points: r.points,
        timeMs: r.timeMs,
        gapMs: r.gapMs,
        status: r.status,
        metadata: r.metadata,
        player: r.participant.player
          ? { slug: r.participant.player.slug, name: r.participant.player.name, shortName: r.participant.player.shortName, number: r.participant.player.number }
          : null,
        team: r.participant.team
          ? { slug: r.participant.team.slug, name: r.participant.team.name, shortName: r.participant.team.shortName }
          : null,
        gridPosition: r.participant.position,
      }));

    const payload = { ...event, participants: undefined, results };
    await this.cache.setJson(`evt:${id}`, payload, CACHE_TTL.schedule / 2);
    return payload;
  }

}
