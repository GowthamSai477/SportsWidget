import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { CacheService, CACHE_TTL } from "../infra/cache/cache.service";
import { PrismaService } from "../infra/prisma/prisma.service";

@ApiTags("competitions")
@Controller()
export class CompetitionsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /** `leagues` is a documented alias of `competitions` (see DECISIONS.md D3). */
  @Public()
  @Get(["competitions", "leagues"])
  @ApiOperation({ summary: "List competitions, optionally filtered by sport slug" })
  @ApiQuery({ name: "sport", required: false })
  async list(@Query("sport") sportSlug?: string) {
    const key = this.cache.buildKey("competitions", sportSlug ?? "all");
    const cached = await this.cache.getJson(key);
    if (cached) return cached;

    const competitions = await this.prisma.competition.findMany({
      where: { isActive: true, ...(sportSlug ? { sport: { slug: sportSlug } } : {}) },
      orderBy: [{ sport: { sortOrder: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        shortName: true,
        region: true,
        logoUrl: true,
        sport: { select: { slug: true, name: true, accentColor: true } },
      },
    });

    await this.cache.setJson(key, competitions, CACHE_TTL.competitionMeta);
    return competitions;
  }

  @Public()
  @Get(["competitions/:slug", "leagues/:slug"])
  @ApiOperation({ summary: "Competition detail with current season" })
  async detail(@Param("slug") slug: string) {
    const key = this.cache.buildKey("competition", slug);
    const cached = await this.cache.getJson(key);
    if (cached) return cached;

    const competition = await this.prisma.competition.findUnique({
      where: { slug },
      include: {
        sport: { select: { slug: true, name: true, accentColor: true } },
        seasons: { where: { isCurrent: true }, take: 1 },
      },
    });
    if (!competition) throw new NotFoundException(`Competition ${slug} not found`);

    await this.cache.setJson(key, competition, CACHE_TTL.competitionMeta);
    return competition;
  }

  @Public()
  @Get("competitions/:slug/teams")
  @ApiOperation({ summary: "Teams (with drivers) for a competition's current season" })
  async teams(@Param("slug") slug: string) {
    const key = this.cache.buildKey("teams", slug);
    const cached = await this.cache.getJson(key);
    if (cached) return cached;

    const competition = await this.prisma.competition.findUnique({
      where: { slug },
      select: {
        id: true,
        seasons: { where: { isCurrent: true }, select: { id: true }, take: 1 },
      },
    });
    if (!competition) throw new NotFoundException(`Competition ${slug} not found`);

    const standingsTables = await this.prisma.standings.findMany({
      where: { competitionId: competition.id, seasonId: competition.seasons[0]?.id },
      select: {
        type: true,
        entries: { select: { type: true, teamId: true, playerId: true, position: true, points: true } },
      },
    });

    const teams = await this.prisma.team.findMany({
      where: { sport: { competitions: { some: { slug } } }, isActive: true },
      orderBy: { name: "asc" },
      include: {
        players: {
          where: { isActive: true },
          select: { id: true, slug: true, name: true, shortName: true, number: true },
        },
      },
    });

    // Team context comes from the CONSTRUCTORS table only; driver context
    // from the DRIVERS table — never mix the two point systems.
    const entryByTeam = new Map<string, { position: number; points: number }>();
    const entryByPlayer = new Map<string, { position: number; points: number }>();
    for (const table of standingsTables) {
      for (const e of table.entries) {
        if (table.type === "CONSTRUCTORS" && e.teamId) {
          entryByTeam.set(e.teamId, { position: e.position, points: e.points });
        }
        if (table.type === "DRIVERS" && e.playerId) {
          entryByPlayer.set(e.playerId, { position: e.position, points: e.points });
        }
      }
    }

    const payload = teams.map((team) => ({
      id: team.id,
      slug: team.slug,
      name: team.name,
      shortName: team.shortName,
      championship: entryByTeam.get(team.id) ?? null,
      drivers: team.players.map((p) => ({
        ...p,
        championship: entryByPlayer.get(p.id) ?? null,
      })),
    }));
    payload.sort((a, b) => (a.championship?.position ?? 99) - (b.championship?.position ?? 99));

    await this.cache.setJson(key, payload, CACHE_TTL.standings);
    return payload;
  }

  @Public()
  @Get("competitions/:slug/seasons")
  @ApiOperation({ summary: "Seasons for a competition" })
  async seasons(@Param("slug") slug: string) {
    return this.prisma.season.findMany({
      where: { competition: { slug } },
      orderBy: { year: "desc" },
    });
  }
}
