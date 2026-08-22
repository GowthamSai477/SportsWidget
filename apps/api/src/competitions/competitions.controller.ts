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
  @Get("competitions/:slug/seasons")
  @ApiOperation({ summary: "Seasons for a competition" })
  async seasons(@Param("slug") slug: string) {
    return this.prisma.season.findMany({
      where: { competition: { slug } },
      orderBy: { year: "desc" },
    });
  }
}
