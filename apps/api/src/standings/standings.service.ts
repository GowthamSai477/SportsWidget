import { Injectable, NotFoundException } from "@nestjs/common";
import { StandingType } from "@prisma/client";
import type { StandingRow } from "@widgets/shared";
import { CacheService, CACHE_TTL } from "../infra/cache/cache.service";
import { PrismaService } from "../infra/prisma/prisma.service";

export interface StandingsTable {
  type: string;
  name: string;
  rows: StandingRow[];
}

interface FetchedStandings {
  dataUpdatedAt: Date;
  tables: StandingsTable[];
}

export interface StandingsResponse {
  competition: { slug: string; name: string };
  season: string;
  updatedAt: Date;
  tables: StandingsTable[];
}

const VALID_TYPES = ["DRIVERS", "CONSTRUCTORS", "LEAGUE", "CUSTOM"] as const;

@Injectable()
export class StandingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async forCompetition(
    competitionRef: string,
    opts: { type?: (typeof VALID_TYPES)[number]; season?: string },
  ): Promise<StandingsResponse> {
    const competition =
      (await this.prisma.competition.findUnique({ where: { slug: competitionRef }, select: { id: true, slug: true, name: true } })) ??
      (await this.prisma.competition.findUnique({ where: { id: competitionRef }, select: { id: true, slug: true, name: true } }));
    if (!competition) throw new NotFoundException(`Competition ${competitionRef} not found`);

    const season = opts.season
      ? await this.prisma.season.findFirst({ where: { competitionId: competition.id, name: opts.season } })
      : await this.prisma.season.findFirst({ where: { competitionId: competition.id, isCurrent: true } });
    if (!season) throw new NotFoundException(`Season not found for ${competition.slug}`);

    const key = this.cache.buildKey("standings", competition.slug, season.name, opts.type ?? "all");
    const cached = await this.cache.getJson<FetchedStandings>(key);
    const fetched = cached ?? (await this.fetchTables(competition.id, season.id, opts.type));
    if (!cached) await this.cache.setJson(key, fetched, CACHE_TTL.standings);

    return {
      competition: { slug: competition.slug, name: competition.name },
      season: season.name,
      updatedAt: fetched.dataUpdatedAt,
      tables: fetched.tables,
    };
  }

  private async fetchTables(competitionId: string, seasonId: string, type?: string): Promise<FetchedStandings> {
    const standingsList = await this.prisma.standings.findMany({
      where: {
        competitionId,
        seasonId,
        ...(type && (VALID_TYPES as readonly string[]).includes(type) ? { type: type as StandingType } : {}),
      },
      include: {
        entries: {
          orderBy: { position: "asc" },
          include: {
            player: { select: { shortName: true, name: true } },
            team: { select: { shortName: true, name: true } },
          },
        },
      },
    });

    const tables = standingsList.map((s): StandingsTable => {
      const leaderPoints = s.entries.find((x) => x.position === 1)?.points ?? 0;
      return {
        type: s.type,
        name: s.name,
        rows: s.entries.map((e) => ({
          position: e.position,
          positionText: e.positionText ?? undefined,
          code: e.player?.shortName ?? e.team?.shortName ?? "?",
          name: e.player?.name ?? e.team?.name ?? "?",
          points: e.points,
          wins: e.wins ?? null,
          gapToLeader: e.position > 1 ? Math.round((leaderPoints - e.points) * 10) / 10 : null,
          isTeam: e.type === "TEAM",
        })),
      };
    });

    return { dataUpdatedAt: standingsList[0]?.dataUpdatedAt ?? new Date(0), tables };
  }
}
