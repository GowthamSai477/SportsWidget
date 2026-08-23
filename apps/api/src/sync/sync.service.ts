import { Injectable, Logger } from "@nestjs/common";
import { NotificationCategory, Prisma, type ProviderSource } from "@prisma/client";
import { CacheService } from "../infra/cache/cache.service";
import { PrismaService } from "../infra/prisma/prisma.service";
import { ProviderRegistry } from "../providers/provider.registry";
import { ProviderError } from "../providers/provider.http";
import type {
  NormalizedRound,
  NormalizedSession,
  ProviderSchedule,
  SportsProvider,
} from "../providers/sports-provider";
import { NotificationsService } from "../notifications/notifications.service";
import { classifyEventForSync } from "./cadence";
import { MappingsService } from "./mappings.service";

export interface SyncSummary {
  provider: string;
  competition: string;
  rounds: number;
  eventsCreated: number;
  eventsUpdated: number;
  mock: boolean;
}

/** Status merge rules: never downgrade terminal states, apply time-derived finishes. */
export function mergeStatus(
  incoming: EventStatusLike,
  existing: EventStatusLike,
  endTime: Date | null,
  now: Date,
): EventStatusLike {
  const TERMINAL: EventStatusLike[] = ["FINISHED", "CANCELLED"];
  if (TERMINAL.includes(existing)) return existing;
  if (incoming === "SCHEDULED" && existing === "FINISHED") return "FINISHED";
  if (endTime && endTime < now && !["POSTPONED", "CANCELLED", "DELAYED", "LIVE", "PAUSED"].includes(incoming)) {
    return "FINISHED";
  }
  if (existing === "LIVE" && incoming === "SCHEDULED") return "LIVE"; // live beats stale schedule
  return incoming;
}
type EventStatusLike = "SCHEDULED" | "CONFIRMED" | "LIVE" | "PAUSED" | "FINISHED" | "POSTPONED" | "CANCELLED" | "DELAYED" | "TBC";

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mappings: MappingsService,
    private readonly registry: ProviderRegistry,
    private readonly cache: CacheService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Pick the active source for a sport. `preferred` overrides; otherwise the
   * first non-mock active source wins and the mock provider is the fallback
   * when the network fails (spec section 43).
   */
  private async pickSource(sportId: string, preferred?: string): Promise<ProviderSource> {
    const sources = await this.prisma.providerSource.findMany({ where: { sportId, isActive: true } });
    if (sources.length === 0) throw new Error("No active provider sources for sport");
    if (preferred) {
      const match = sources.find((s) => s.slug === preferred);
      if (!match) throw new Error(`Requested provider ${preferred} not found`);
      return match;
    }
    return sources.find((s) => !s.slug.startsWith("mock")) ?? sources[0];
  }

  async syncSchedule(competitionSlug: string, preferredProvider?: string): Promise<SyncSummary> {
    const competition = await this.prisma.competition.findUniqueOrThrow({
      where: { slug: competitionSlug },
      include: { sport: true },
    });
    const season = await this.prisma.season.findFirstOrThrow({
      where: { competitionId: competition.id, isCurrent: true },
    });

    let source = await this.pickSource(competition.sportId, preferredProvider);
    let provider = this.registry.require(source.slug);
    let schedule: ProviderSchedule;

    try {
      schedule = await provider.getSchedule({ seasonName: season.name });
    } catch (err) {
      const fallbackSlug = `mock-${competition.sport.slug}`;
      if (!source.slug.startsWith("mock") && this.registry.forSlug(fallbackSlug)) {
        this.logger.warn(`Provider ${source.slug} failed (${(err as Error).message}); falling back to ${fallbackSlug}`);
        source = await this.prisma.providerSource.findUniqueOrThrow({ where: { slug: fallbackSlug } });
        provider = this.registry.require(fallbackSlug);
        schedule = await provider.getSchedule({ seasonName: season.name });
      } else {
        await this.logSync(null, source.id, `${provider.slug}:schedule`, false, err as Error);
        throw err;
      }
    }

    let eventsCreated = 0;
    let eventsUpdated = 0;
    const now = new Date();

    for (const round of schedule.rounds) {
      const venueId = round.venue
        ? (
            await this.mappings.resolveInternalId(source, "venue", round.venue.externalId, async () => {
              const venueId = await this.mappings.adoptOnConflict(
                async () => {
                  const venue = await this.prisma.venue.create({
                    data: {
                      slug: round.venue!.externalId,
                      name: round.venue!.name,
                      city: round.venue!.city,
                      country: round.venue!.country,
                      latitude: round.venue!.latitude,
                      longitude: round.venue!.longitude,
                      metadata: schedule.mock ? { mock: true } : undefined,
                    },
                  });
                  return venue.id;
                },
                () =>
                  this.prisma.venue
                    .findUnique({ where: { slug: round.venue!.externalId }, select: { id: true } })
                    .then((v) => v?.id ?? null),
              );
              return venueId;
            })
          ).internalId
        : null;

      const roundId = (
        await this.mappings.resolveInternalId(source, "round", round.externalId, async () => {
          try {
            const created = await this.prisma.round.create({
              data: {
                seasonId: season.id,
                number: round.number,
                label: round.label,
                startTime: round.startTime,
                endTime: round.endTime,
                venueId,
                metadata: { mock: schedule.mock },
              },
            });
            return created.id;
          } catch (err) {
            // Another provider already owns this (season, roundNumber): adopt
            // the existing round instead of forking the calendar.
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002" && round.number !== undefined) {
              const existing = await this.prisma.round.findFirstOrThrow({
                where: { seasonId: season.id, number: round.number },
                select: { id: true },
              });
              return existing.id;
            }
            throw err;
          }
        })
      ).internalId;

      for (const session of round.sessions) {
        const result = await this.upsertSession(source, session, {
          sportId: competition.sportId,
          competitionId: competition.id,
          seasonId: season.id,
          roundId,
          mock: schedule.mock,
          now,
        });
        eventsCreated += result.created ? 1 : 0;
        eventsUpdated += result.created ? 0 : 1;
      }
    }

    await this.logSync(null, source.id, `${provider.slug}:schedule`, true, null, {
      rounds: schedule.rounds.length,
      recordsFetched: schedule.rounds.reduce((acc, r) => acc + r.sessions.length, 0),
      recordsUpdated: eventsUpdated + eventsCreated,
    });

    // Blunt but correct: sync touched many entities; drop read caches.
    await this.cache.invalidatePattern("*");

    return {
      provider: provider.slug,
      competition: competition.slug,
      rounds: schedule.rounds.length,
      eventsCreated,
      eventsUpdated,
      mock: schedule.mock,
    };
  }

  private async upsertSession(
    source: ProviderSource,
    session: NormalizedSession,
    ctx: { sportId: string; competitionId: string; seasonId: string; roundId: string; mock: boolean; now: Date },
  ): Promise<{ internalId: string; created: boolean }> {
    return this.mappings.resolveInternalId(
      source,
      "event",
      session.externalId,
      async () => {
        const event = await this.prisma.event.create({
          data: {
            sportId: ctx.sportId,
            competitionId: ctx.competitionId,
            seasonId: ctx.seasonId,
            roundId: ctx.roundId,
            type: session.type,
            name: session.name,
            shortName: (session.metadata?.sessionShort as string | undefined) ?? null,
            startTime: session.startTime,
            endTime: session.endTime,
            status: session.status,
            metadata: { ...(session.metadata ?? {}), mock: ctx.mock },
            lastSyncedAt: ctx.now,
          },
        });
        return event.id;
      },
    ).then(async ({ internalId, created }) => {
      if (!created) {
        const existing = await this.prisma.event.findUniqueOrThrow({ where: { id: internalId }, select: { status: true, name: true, startTime: true } });
        const status = mergeStatus(session.status, existing.status, session.endTime ?? null, ctx.now);
        await this.prisma.event.update({
          where: { id: internalId },
          data: {
            name: existing.name === session.name ? existing.name : session.name,
            startTime: session.startTime !== existing.startTime ? session.startTime : existing.startTime,
            endTime: session.endTime,
            status,
            lastSyncedAt: ctx.now,
          },
        });

        // Schedule-change notifications on material moves.
        if (existing.startTime.getTime() !== session.startTime.getTime()) {
          await this.notifications.notifyEventSubscribers(
            { id: internalId, sportId: ctx.sportId, competitionId: ctx.competitionId, name: session.name },
            NotificationCategory.SCHEDULE_CHANGE,
            "Schedule change",
            `${session.name} moved to ${session.startTime.toISOString()}`,
          );
        }
      }
      return { internalId, created };
    });
  }

  async syncStandings(competitionSlug: string, preferredProvider?: string): Promise<{ provider: string; tables: string[] }> {
    const competition = await this.prisma.competition.findUniqueOrThrow({ where: { slug: competitionSlug }, include: { sport: true } });
    const season = await this.prisma.season.findFirstOrThrow({ where: { competitionId: competition.id, isCurrent: true } });
    const source = await this.pickSource(competition.sportId, preferredProvider);
    const provider = this.registry.require(source.slug);

    const kinds = ["DRIVERS", "CONSTRUCTORS", "LEAGUE"] as const;
    const synced: string[] = [];

    for (const kind of kinds) {
      try {
        const standings = await provider.getStandings({ seasonName: season.name }, kind);
        await this.writeStandingsTable(source.id, competition.id, season.id, standings.kind, standings.entries, provider.slug);
        synced.push(standings.kind);
      } catch (err) {
        // Kind unsupported by this provider/sport — skip silently unless unexpected.
        if (!(err instanceof ProviderError)) {
          this.logger.warn(`Standings ${kind} failed for ${provider.slug}: ${(err as Error).stack ?? String(err)}`);
        }
      }
    }

    await this.logSync(null, source.id, `${provider.slug}:standings`, true, null, { recordsFetched: synced.length });
    await this.cache.invalidatePattern("standings*");
    await this.cache.invalidatePattern("*");
    return { provider: provider.slug, tables: synced };
  }

  private async writeStandingsTable(
    sourceId: string,
    competitionId: string,
    seasonId: string,
    kind: "DRIVERS" | "CONSTRUCTORS" | "LEAGUE",
    entries: Array<{
      externalId: string;
      name: string;
      code?: string;
      position: number;
      points: number;
      wins?: number;
      teamExternalId?: string;
      teamName?: string;
      nationality?: string;
      number?: number;
    }>,
    providerSlug: string,
  ): Promise<void> {
    const sport = await this.prisma.competition.findUniqueOrThrow({ where: { id: competitionId }, select: { sportId: true, sport: { select: { slug: true } } } });
    const sportId = sport.sportId;
    const sportPrefix = sport.sport.slug.replace(/[^a-z0-9-]/gi, "");

    const resolveTeam = async (
      teamExternalId?: string,
      teamName?: string,
      shortNameOverride?: string,
    ): Promise<string | null> => {
      if (!teamExternalId) return null;
      const { internalId } = await this.mappings.resolveInternalId(
        { id: sourceId },
        "team",
        teamExternalId,
        async () => {
          const teamSlug = `${sportPrefix}-${teamExternalId}`;
          const displayName = teamName ?? teamExternalId;
          const shortName = shortNameOverride ?? displayName.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase();
          const teamId = await this.mappings.adoptOnConflict(
            async () => {
              const team = await this.prisma.team.create({
                data: { sportId, slug: teamSlug, name: displayName, shortName, isActive: true },
              });
              return team.id;
            },
            () => this.prisma.team.findUnique({ where: { slug: teamSlug }, select: { id: true } }).then((t) => t?.id ?? null),
          );
          return teamId;
        },
      );
      // Refresh display fields on every pass — adopted rows may predate
      // correct naming, and provider names drift over a season.
      const displayName = teamName ?? teamExternalId;
      const shortName = shortNameOverride ?? displayName.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase();
      await this.prisma.team.update({
        where: { id: internalId },
        data: { name: displayName, shortName },
      });
      return internalId;
    };

    // Teams first (drivers reference them).
    const teamIds = new Map<string, string | null>();
    for (const entry of [...new Set(entries.map((e) => e.teamExternalId).filter((x): x is string => Boolean(x)))]) {
      const name = entries.find((e) => e.teamExternalId === entry)?.teamName;
      teamIds.set(entry, await resolveTeam(entry, name));
    }

    const participantIds: Array<{ entryIdx: number; teamId: string | null; playerId: string | null }> = [];
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const isTeamEntry = kind === "CONSTRUCTORS" || kind === "LEAGUE";
      let playerId: string | null = null;
      if (!isTeamEntry && entry.code !== undefined) {
        playerId = (
          await this.mappings.resolveInternalId({ id: sourceId }, "player", entry.externalId, async () => {
            const playerId = await this.mappings.adoptOnConflict(
              async () => {
                const player = await this.prisma.player.create({
                  data: {
                    sportId,
                    teamId: entry.teamExternalId ? teamIds.get(entry.teamExternalId) ?? null : null,
                    slug: entry.externalId,
                    name: entry.name,
                    shortName: entry.code?.toUpperCase(),
                    number: entry.number,
                    nationality: entry.nationality,
                    isActive: true,
                  },
                });
                return player.id;
              },
              () =>
                this.prisma.player
                  .findUnique({ where: { sportId_slug: { sportId, slug: entry.externalId } }, select: { id: true } })
                  .then((p) => p?.id ?? null),
            );
            return playerId;
          })
        ).internalId;
      }
      const teamId =
        isTeamEntry && entry.teamExternalId === undefined
          ? teamIds.get(entry.externalId) ?? (await resolveTeam(entry.externalId, entry.name, entry.code))
          : entry.teamExternalId
            ? teamIds.get(entry.teamExternalId) ?? null
            : null;
      participantIds.push({ entryIdx: i, teamId, playerId });
    }

    const standingsType = kind === "DRIVERS" ? "DRIVERS" : kind === "CONSTRUCTORS" ? "CONSTRUCTORS" : "LEAGUE";
    const table = await this.prisma.standings.upsert({
      where: { competitionId_seasonId_type: { competitionId, seasonId, type: standingsType } },
      update: { dataUpdatedAt: new Date(), name: STANDINGS_NAMES[standingsType] },
      create: {
        competitionId,
        seasonId,
        type: standingsType,
        name: STANDINGS_NAMES[standingsType],
        dataUpdatedAt: new Date(),
      },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.standingEntry.deleteMany({ where: { standingsId: table.id } });
      await tx.standingEntry.createMany({
        data: entries.map((entry, i) => ({
          standingsId: table.id,
          type: participantIds[i].playerId ? ("PLAYER" as const) : ("TEAM" as const),
          playerId: participantIds[i].playerId,
          teamId: participantIds[i].playerId ? participantIds[i].teamId : participantIds[i].teamId,
          position: entry.position,
          points: entry.points,
          wins: entry.wins,
        })),
      });
    });
    void providerSlug;
  }

  async syncResults(eventId: string, preferredProvider?: string): Promise<{ provider: string; rows: number }> {
    const event = await this.prisma.event.findUniqueOrThrow({
      where: { id: eventId },
      include: { season: true, competition: true },
    });
    if (!event.season || !event.roundId) throw new Error(`Event ${eventId} lacks season or round`);

    const competition = event.competition;
    const source = await this.pickSource(competition.sportId, preferredProvider);
    const provider = this.registry.require(source.slug);

    const roundMapping = await this.prisma.providerMapping.findFirst({
      where: { sourceId: source.id, entityType: "round", internalId: event.roundId },
      select: { externalId: true },
    });
    if (!roundMapping) throw new Error(`No provider mapping for round ${event.roundId}`);

    const results = await provider.getResults({ seasonName: event.season.name }, roundMapping.externalId);
    let writtenRows = 0;

    for (const row of results.rows) {
      const playerId = (
        await this.mappings.resolveInternalId(source, "player", row.participantExternalId, async () => {
            const playerId = await this.mappings.adoptOnConflict(
              async () => {
                const player = await this.prisma.player.create({
                  data: {
                    sportId: competition.sportId,
                    slug: row.participantExternalId,
                    name: row.name,
                    shortName: row.code?.toUpperCase(),
                    number: row.number,
                    teamId:
                      row.teamExternalId !== undefined
                        ? (
                            await this.mappings.resolveInternalId(source, "team", row.teamExternalId, () =>
                              this.mappings.adoptOnConflict(
                                async () => {
                                  const team = await this.prisma.team.create({
                                    data: {
                                      sportId: competition.sportId,
                                      slug: `f1-${row.teamExternalId}`,
                                      name: String(row.teamExternalId),
                                      isActive: true,
                                    },
                                  });
                                  return team.id;
                                },
                                () =>
                                  this.prisma.team
                                    .findUnique({ where: { slug: `f1-${row.teamExternalId}` }, select: { id: true } })
                                    .then((t) => t?.id ?? null),
                              ),
                            )
                          ).internalId
                        : null,
                    isActive: true,
                  },
                });
                return player.id;
              },
              () =>
                this.prisma.player
                  .findUnique({
                    where: { sportId_slug: { sportId: competition.sportId, slug: row.participantExternalId } },
                    select: { id: true },
                  })
                  .then((p) => p?.id ?? null),
            );
            return playerId;
          })
      ).internalId;

      let participant = await this.prisma.eventParticipant.findFirst({
        where: { eventId: event.id, playerId },
        select: { id: true },
      });
      if (!participant) {
        participant = await this.prisma.eventParticipant.create({
          data: { eventId: event.id, type: "PLAYER", playerId, position: row.gridPosition },
          select: { id: true },
        });
      }

      await this.prisma.eventResult.upsert({
        where: { eventId_participantId: { eventId: event.id, participantId: participant.id } },
        update: {
          position: row.position,
          positionText: row.positionText,
          points: row.points,
          timeMs: row.timeMs,
          gapMs: row.gapMs,
          status: row.status,
          metadata: row.metadata as Prisma.InputJsonValue | undefined,
        },
        create: {
          eventId: event.id,
          participantId: participant.id,
          position: row.position,
          positionText: row.positionText,
          points: row.points,
          timeMs: row.timeMs,
          gapMs: row.gapMs,
          status: row.status,
          metadata: row.metadata as Prisma.InputJsonValue | undefined,
        },
      });
      writtenRows++;
    }

    const hadResultsBefore = writtenRows > 0;
    await this.prisma.event.update({
      where: { id: event.id },
      data: { status: "FINISHED", lastSyncedAt: new Date() },
    });

    if (hadResultsBefore && results.mock === false) {
      await this.notifications.notifyEventSubscribers(
        { id: event.id, sportId: competition.sportId, competitionId: competition.id, name: event.name },
        NotificationCategory.RESULT_AVAILABLE,
        "Result available",
        `${event.name} result is in`,
      );
    }

    await this.logSync(null, source.id, `${provider.slug}:results`, true, null, {
      endpoint: roundMapping.externalId,
      recordsFetched: results.rows.length,
      recordsUpdated: writtenRows,
    });
    await this.cache.invalidatePattern("*");
    return { provider: provider.slug, rows: writtenRows };
  }

  async syncLive(eventId: string, preferredProvider?: string): Promise<{ changed: boolean; status: string }> {
    const event = await this.prisma.event.findUniqueOrThrow({
      where: { id: eventId },
      include: { season: true, competition: true },
    });
    const source = await this.pickSource(event.competition.sportId, preferredProvider);
    const provider = this.registry.require(source.slug);
    const now = new Date();

    let nextStatus: typeof event.status = event.status;
    let detail = event.statusDetail;

    if (provider.capabilities().live) {
      const mapping = await this.prisma.providerMapping.findFirst({
        where: { sourceId: source.id, entityType: "event", internalId: eventId },
        select: { externalId: true },
      });
      const state = provider.getLiveState
        ? await provider.getLiveState({ seasonName: event.season?.name ?? "" }, { eventExternalId: mapping?.externalId })
        : null;
      if (state) {
        nextStatus = state.status;
        detail = state.statusDetail ?? null;
      } else if (event.endTime && event.endTime < now && event.status === "LIVE") {
        nextStatus = "FINISHED";
      }
    } else if (event.endTime && event.endTime < now && ["LIVE", "SCHEDULED", "CONFIRMED"].includes(event.status)) {
      nextStatus = "FINISHED";
    }

    if (nextStatus !== event.status || detail !== event.statusDetail) {
      await this.prisma.event.update({
        where: { id: event.id },
        data: { status: nextStatus, statusDetail: detail, lastSyncedAt: now },
      });
      if (nextStatus === "LIVE" && event.status !== "LIVE") {
        await this.notifications.notifyEventSubscribers(
          { id: event.id, sportId: event.competition.sportId, competitionId: event.competitionId, name: event.name },
          NotificationCategory.LIVE_STARTED,
          "Event live",
          `${event.name} is live`,
        );
      }
      await this.cache.invalidatePattern("*");
      return { changed: true, status: nextStatus };
    }

    await this.prisma.event.update({ where: { id: event.id }, data: { lastSyncedAt: now } });
    return { changed: false, status: event.status };
  }

  /** Events currently worth polling, classified by the adaptive cadence rules. */
  async dueEvents(limit = 500): Promise<Array<{ eventId: string; action: string; competitionSlug: string; startTimeMs: number }>> {
    const candidates = await this.prisma.event.findMany({
      where: {
        OR: [
          { status: { in: ["LIVE", "PAUSED"] } },
          { startTime: { gte: new Date(Date.now() - 3 * 3600_000), lte: new Date(Date.now() + 2 * 24 * 3600_000) } },
          { status: "FINISHED", results: { none: {} }, endTime: { gte: new Date(Date.now() - 7 * 24 * 3600_000) } },
        ],
      },
      select: {
        id: true,
        status: true,
        startTime: true,
        endTime: true,
        competition: { select: { slug: true } },
        results: { select: { id: true }, take: 1 },
      },
      take: limit,
    });

    const due: Array<{ eventId: string; action: string; competitionSlug: string; startTimeMs: number }> = [];
    for (const ev of candidates) {
      const action = classifyEventForSync({
        status: ev.status,
        startTime: ev.startTime,
        endTime: ev.endTime,
        hasResults: ev.results.length > 0,
      });
      if (action) due.push({ eventId: ev.id, action, competitionSlug: ev.competition.slug, startTimeMs: ev.startTime.getTime() });
    }
    return due;
  }

  private async logSync(
    jobId: string | null,
    sourceId: string,
    endpoint: string,
    ok: boolean,
    error: Error | null,
    counts?: { endpoint?: string; rounds?: number; recordsFetched?: number; recordsUpdated?: number },
  ): Promise<void> {
    await this.prisma.syncLog.create({
      data: {
        jobId: jobId ?? undefined,
        sourceId,
        endpoint,
        completedAt: new Date(),
        ok,
        errors: error ? { message: error.message } : undefined,
        recordsFetched: counts?.recordsFetched ?? 0,
        recordsUpdated: counts?.recordsUpdated ?? 0,
      },
    }).catch((err) => this.logger.error(`Failed writing SyncLog: ${(err as Error).message}`));
  }
}

type StandingsTypeName = "DRIVERS" | "CONSTRUCTORS" | "LEAGUE";
const STANDINGS_NAMES: Record<StandingsTypeName, string> = {
  DRIVERS: "Drivers' Championship",
  CONSTRUCTORS: "Constructors' Championship",
  LEAGUE: "League Table",
};
