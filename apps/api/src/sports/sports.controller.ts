import { Controller, Get, NotFoundException, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { CacheService, CACHE_TTL } from "../infra/cache/cache.service";
import { PrismaService } from "../infra/prisma/prisma.service";

@ApiTags("sports")
@Controller("sports")
export class SportsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Sports catalogue (cached)" })
  @ApiQuery({ name: "includeInactive", required: false, type: Boolean })
  async list(@Query("includeInactive") includeInactive?: string) {
    const key = this.cache.buildKey("sports", includeInactive === "true" ? "all" : "active");
    const cached = await this.cache.getJson<Awaited<ReturnType<typeof this.querySports>>>(key);
    if (cached) return cached;

    const sports = await this.querySports(includeInactive === "true");
    await this.cache.setJson(key, sports, CACHE_TTL.sportsCatalog);
    return sports;
  }

  private querySports(includeInactive: boolean) {
    return this.prisma.sport.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        category: true,
        iconUrl: true,
        accentColor: true,
        isActive: true,
      },
    });
  }

  @Public()
  @Get(":slug")
  @ApiOperation({ summary: "Sport detail with competitions" })
  async detail(@Param("slug") slug: string) {
    const key = this.cache.buildKey("sport", slug);
    const cached = await this.cache.getJson(key);
    if (cached) return cached;

    const sport = await this.prisma.sport.findUnique({
      where: { slug },
      include: {
        competitions: {
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, slug: true, name: true, shortName: true, region: true, logoUrl: true },
        },
      },
    });
    if (!sport) throw new NotFoundException(`Sport ${slug} not found`);

    await this.cache.setJson(key, sport, CACHE_TTL.competitionMeta);
    return sport;
  }
}
