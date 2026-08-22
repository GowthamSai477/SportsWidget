import { Body, Controller, Delete, Get, NotFoundException, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { FavoriteType } from "@prisma/client";
import { IsEnum, IsString } from "class-validator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { PrismaService } from "../infra/prisma/prisma.service";

export class AddFavoriteDto {
  @IsEnum(FavoriteType) type!: FavoriteType;
  @IsString() targetId!: string;
}

interface ExpandedFavorite {
  id: string;
  type: FavoriteType;
  targetId: string;
  target: unknown; // minimal display shape per type
  createdAt: Date;
}

@ApiTags("favorites")
@ApiBearerAuth()
@Controller("users/me/favorites")
export class FavoritesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "List favorites with display targets" })
  async list(@CurrentUser() auth: { id: string }): Promise<ExpandedFavorite[]> {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId: auth.id },
      orderBy: { createdAt: "desc" },
    });

    const byType = (t: FavoriteType) => favorites.filter((f) => f.type === t);
    const ids = (t: FavoriteType) => byType(t).map((f) => f.targetId);

    const [sports, competitions, teams, players, events] = await Promise.all([
      this.prisma.sport.findMany({ where: { id: { in: ids("SPORT") } } }),
      this.prisma.competition.findMany({
        where: { id: { in: ids("COMPETITION") } },
        include: { sport: true },
      }),
      this.prisma.team.findMany({ where: { id: { in: ids("TEAM") } } }),
      this.prisma.player.findMany({ where: { id: { in: ids("PLAYER") } }, include: { team: true } }),
      this.prisma.event.findMany({ where: { id: { in: ids("EVENT") } } }),
    ]);

    const sportById = new Map(sports.map((s) => [s.id, s]));
    const compById = new Map(competitions.map((c) => [c.id, c]));
    const teamById = new Map(teams.map((t) => [t.id, t]));
    const playerById = new Map(players.map((p) => [p.id, p]));
    const eventById = new Map(events.map((e) => [e.id, e]));

    return favorites.map((fav): ExpandedFavorite => {
      let target: unknown = null;
      switch (fav.type) {
        case "SPORT": {
          const s = sportById.get(fav.targetId);
          target = s ? { slug: s.slug, name: s.name, accentColor: s.accentColor } : null;
          break;
        }
        case "COMPETITION": {
          const c = compById.get(fav.targetId);
          target = c ? { slug: c.slug, name: c.name, sportSlug: c.sport.slug } : null;
          break;
        }
        case "TEAM": {
          const t = teamById.get(fav.targetId);
          target = t ? { slug: t.slug, name: t.name, shortName: t.shortName, color: t.color } : null;
          break;
        }
        case "PLAYER": {
          const p = playerById.get(fav.targetId);
          target = p
            ? { slug: p.slug, name: p.name, shortName: p.shortName, number: p.number, teamShortName: p.team?.shortName }
            : null;
          break;
        }
        case "EVENT":
          target = eventById.get(fav.targetId) ?? null;
          break;
      }
      return { id: fav.id, type: fav.type, targetId: fav.targetId, target, createdAt: fav.createdAt };
    });
  }

  @Post()
  @ApiOperation({ summary: "Add a favorite (idempotent)" })
  async add(@CurrentUser() auth: { id: string }, @Body() dto: AddFavoriteDto) {
    await this.assertTargetExists(dto.type, dto.targetId);
    return this.prisma.favorite.upsert({
      where: {
        userId_type_targetId: { userId: auth.id, type: dto.type, targetId: dto.targetId },
      },
      update: {},
      create: { userId: auth.id, type: dto.type, targetId: dto.targetId },
    });
  }

  @Delete(":type/:targetId")
  async remove(
    @CurrentUser() auth: { id: string },
    @Param("type") type: FavoriteType,
    @Param("targetId") targetId: string,
  ) {
    await this.prisma.favorite.deleteMany({
      where: { userId: auth.id, type, targetId },
    });
    return { removed: { type, targetId } };
  }

  private async assertTargetExists(type: FavoriteType, targetId: string): Promise<void> {
    const found =
      type === "SPORT"
        ? await this.prisma.sport.findUnique({ where: { id: targetId }, select: { id: true } })
        : type === "COMPETITION"
          ? await this.prisma.competition.findUnique({ where: { id: targetId }, select: { id: true } })
          : type === "TEAM"
            ? await this.prisma.team.findUnique({ where: { id: targetId }, select: { id: true } })
            : type === "PLAYER"
              ? await this.prisma.player.findUnique({ where: { id: targetId }, select: { id: true } })
              : await this.prisma.event.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!found) throw new NotFoundException(`${type} ${targetId} does not exist`);
  }
}
