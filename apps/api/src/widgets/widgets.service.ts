import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { EventStatus, Prisma, WidgetType } from "@prisma/client";
import type { EventLite, ResultRow, StandingRow, WidgetPayload } from "@widgets/shared";
import { TTL_BY_PRIMARY_STATUS, UNKNOWN_STATUS_TTL_SECONDS } from "../infra/cache/cache.service";
import { PrismaService } from "../infra/prisma/prisma.service";
import { EntitlementsService } from "../entitlements/entitlements.service";

const STANDINGS_ROWS_BY_SIZE: Record<string, number> = {
  small: 3,
  medium: 5,
  large: 10,
};
import { IsEnum, IsIn, IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateWidgetDto {
  @IsEnum(WidgetType) type!: WidgetType;
  @IsOptional() @IsString() @MaxLength(80) name?: string;
  @IsOptional() @IsIn(["small", "medium", "large"]) size?: "small" | "medium" | "large";
  @IsOptional() @IsString() sportSlug?: string;
  @IsOptional() @IsString() competitionSlug?: string;
  @IsOptional() @IsObject() config?: Record<string, unknown>;
}

@Injectable()
export class WidgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async create(userId: string, dto: CreateWidgetDto) {
    const count = await this.prisma.widget.count({ where: { userId, isActive: true } });
    const max = await this.entitlements.maxWidgets(userId);
    if (count >= max) throw new ForbiddenException(`Widget limit reached (${max})`);

    if ((dto.type === "PREMIUM" || dto.type === "LIVE") && !(await this.entitlements.hasFeature(userId, "PREMIUM_WIDGET"))) {
      throw new ForbiddenException("Plan does not include premium widgets");
    }

    const sport = dto.sportSlug ? await this.prisma.sport.findUnique({ where: { slug: dto.sportSlug } }) : null;
    const competition = dto.competitionSlug
      ? await this.prisma.competition.findUnique({ where: { slug: dto.competitionSlug } })
      : null;

    return this.prisma.widget.create({
      data: {
        userId,
        type: dto.type,
        name: dto.name ?? `${dto.type} widget`,
        size: dto.size ?? "medium",
        sportId: sport?.id ?? competition?.sportId ?? null,
        competitionId: competition?.id ?? null,
        config: (dto.config ?? {}) as Prisma.InputJsonValue,
        instanceToken: randomBytes(16).toString("hex"),
      },
    });
  }

  listForUser(userId: string) {
    return this.prisma.widget.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        sport: { select: { slug: true, name: true } },
        competition: { select: { slug: true, name: true } },
      },
    });
  }
  async update(
    userId: string,
    widgetId: string,
    patch: { name?: string; isActive?: boolean; config?: Record<string, unknown>; size?: string },
  ) {
    await this.assertOwnership(userId, widgetId);
    return this.prisma.widget.update({
      where: { id: widgetId },
      data: {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
        ...(patch.size !== undefined ? { size: patch.size } : {}),
        ...(patch.config !== undefined ? { config: patch.config as Prisma.InputJsonValue } : {}),
      },
    });
  }

  async remove(userId: string, widgetId: string) {
    await this.assertOwnership(userId, widgetId);
    await this.prisma.widget.delete({ where: { id: widgetId } });
    return { removed: widgetId };
  }

  /**
   * The single payload every native widget consumes (spec sections 30-31):
   * status-aware primary event, weekend schedule, standings slice, previous
   * podium, live state. Minimal by design — widgets render it directly.
   */
  async buildPayload(instanceToken: string): Promise<WidgetPayload> {
    const widget = await this.prisma.widget.findUnique({
      where: { instanceToken },
      include: { sport: true, competition: true },
    });
    if (!widget || !widget.isActive) throw new NotFoundException("Widget not found");

    const scope = {
      sportId: widget.sportId ?? undefined,
      competitionId: widget.competitionId ?? undefined,
    };

    const now = new Date();
    const [liveEvent] = await this.prisma.event.findMany({
      where: { status: { in: ["LIVE", "PAUSED"] }, ...scope },
      orderBy: { startTime: "asc" },
      take: 1,
    });

    let primaryEvent = liveEvent;
    if (!primaryEvent) {
      [primaryEvent] = await this.prisma.event.findMany({
        where: { startTime: { gte: now }, status: { notIn: ["FINISHED", "CANCELLED"] }, ...scope },
        orderBy: { startTime: "asc" },
        take: 1,
      });
    }
    // Fallback: last event even if finished — better than an empty widget.
    if (!primaryEvent) {
      [primaryEvent] = await this.prisma.event.findMany({
        where: scope,
        orderBy: { startTime: "desc" },
        take: 1,
      });
    }

    // Schedule context: sessions of the primary event's race weekend when known,
    // else the next few events.
    const scheduleEvents = primaryEvent?.roundId
      ? await this.prisma.event.findMany({
          where: { roundId: primaryEvent.roundId, status: { notIn: ["CANCELLED"] } },
          orderBy: { startTime: "asc" },
          take: 8,
        })
      : await this.prisma.event.findMany({
          where: { startTime: { gte: now }, status: { notIn: ["FINISHED", "CANCELLED"] }, ...scope },
          orderBy: { startTime: "asc" },
          take: 5,
        });

    const standingsTable = await this.prisma.standings.findFirst({
      where: {
        competitionId: widget.competitionId ?? undefined,
        seasonId: primaryEvent?.seasonId ?? undefined,
        type: { in: ["DRIVERS", "LEAGUE"] },
      },
      orderBy: { dataUpdatedAt: "desc" },
      include: {
        entries: {
          orderBy: { position: "asc" },
          take: STANDINGS_ROWS_BY_SIZE[widget.size] ?? 5,
          include: {
            player: { select: { shortName: true, name: true } },
            team: { select: { shortName: true, name: true } },
          },
        },
      },
    });
    const leaderPoints = standingsTable?.entries.find((e) => e.position === 1)?.points ?? 0;
    const standings: StandingRow[] =
      standingsTable?.entries.map((e) => ({
        position: e.position,
        code: e.player?.shortName ?? e.team?.shortName ?? "?",
        name: e.player?.name ?? e.team?.name ?? "?",
        points: e.points,
        wins: e.wins ?? null,
        gapToLeader: e.position > 1 ? Math.round((leaderPoints - e.points) * 10) / 10 : null,
        isTeam: e.type === "TEAM",
      })) ?? [];

    const previous = await this.fetchPreviousResult(scope);

    const isMock = Boolean((primaryEvent?.metadata as { mock?: boolean } | null)?.mock);
    const ttlSeconds = primaryEvent ? TTL_BY_PRIMARY_STATUS[primaryEvent.status] : UNKNOWN_STATUS_TTL_SECONDS;

    return {
      widgetId: widget.id,
      instanceToken: widget.instanceToken,
      type: widget.type,
      size: (widget.size === "small" || widget.size === "large" ? widget.size : "medium") as WidgetPayload["size"],
      sport: widget.sport
        ? { slug: widget.sport.slug, name: widget.sport.name, accentColor: widget.sport.accentColor }
        : { slug: "unknown", name: "Unknown sport", accentColor: null },
      competition: widget.competition ? { slug: widget.competition.slug, name: widget.competition.name } : null,
      updatedAt: new Date().toISOString(),
      ttlSeconds,
      primary: primaryEvent ? toEventLite(primaryEvent) : null,
      schedule: scheduleEvents.map(toEventLite),
      live:
        primaryEvent && (primaryEvent.status === "LIVE" || primaryEvent.status === "PAUSED")
          ? {
              status: primaryEvent.status,
              detail: primaryEvent.statusDetail ?? undefined,
              lastUpdated: (primaryEvent.lastSyncedAt ?? new Date()).toISOString(),
              mock: isMock,
            }
          : null,
      standings,
      previous,
      mock: isMock,
    };
  }

  private async fetchPreviousResult(scope: { sportId?: string; competitionId?: string }) {
    const lastRace = await this.prisma.event.findFirst({
      where: { status: "FINISHED", type: { in: ["RACE", "MATCH"] }, ...scope },
      orderBy: { startTime: "desc" },
      include: {
        participants: {
          include: {
            player: { select: { shortName: true, name: true } },
            team: { select: { shortName: true, name: true } },
            results: true,
          },
        },
      },
    });
    if (!lastRace) return null;

    const rows: ResultRow[] = lastRace.participants
      .flatMap((p) => p.results.map((r) => ({ r, p })))
      .filter(({ r }) => r.position !== null && (r.position ?? 99) <= 3)
      .sort((a, b) => (a.r.position ?? 99) - (b.r.position ?? 99))
      .slice(0, 3)
      .map(({ r, p }) => ({
        positionText: r.positionText ?? String(r.position),
        code: p.player?.shortName ?? p.team?.shortName ?? "?",
        name: p.player?.name ?? p.team?.name ?? "?",
        gapText: formatGap(r.gapMs),
        points: r.points ?? undefined,
      }));

    return { event: toEventLite(lastRace), topResults: rows };
  }

  private async assertOwnership(userId: string, widgetId: string): Promise<void> {
    const widget = await this.prisma.widget.findUnique({ where: { id: widgetId }, select: { userId: true } });
    if (!widget || widget.userId !== userId) throw new NotFoundException("Widget not found");
  }
}

function formatGap(gapMs: number | null | undefined): string | undefined {
  if (gapMs === null || gapMs === undefined) return undefined;
  if (gapMs < 60_000) return `+${(gapMs / 1000).toFixed(3)}`;
  return `+${Math.floor(gapMs / 60_000)}m ${((gapMs % 60_000) / 1000).toFixed(0)}s`;
}

function toEventLite(event: {
  id: string;
  type: string;
  name: string;
  startTime: Date;
  endTime: Date | null;
  status: EventStatus;
  statusDetail: string | null;
}): EventLite {
  return {
    id: event.id,
    type: event.type,
    name: event.name,
    startTime: event.startTime.toISOString(),
    endTime: event.endTime?.toISOString(),
    status: event.status,
    statusDetail: event.statusDetail ?? undefined,
  };
}
