import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { PrismaService } from "../infra/prisma/prisma.service";

@ApiTags("teams")
@Controller("teams")
export class TeamsController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get(":ref")
  @ApiOperation({ summary: "Team detail with players (id or slug)" })
  async detail(@Param("ref") ref: string) {
    const team =
      (await this.prisma.team.findUnique({
        where: { slug: ref },
        include: {
          sport: { select: { slug: true, name: true } },
          players: {
            where: { isActive: true },
            orderBy: [{ number: { sort: "asc", nulls: "last" } }],
            select: { id: true, slug: true, name: true, shortName: true, number: true, nationality: true, photoUrl: true },
          },
        },
      })) ??
      (await this.prisma.team.findUnique({ where: { id: ref }, include: { sport: { select: { slug: true, name: true } }, players: true } }));
    if (!team) throw new NotFoundException(`Team ${ref} not found`);
    return team;
  }

  @Public()
  @Get(":ref/events")
  @ApiOperation({ summary: "Events involving this team" })
  async events(@Param("ref") ref: string) {
    const team = await this.prisma.team.findUnique({ where: { slug: ref }, select: { id: true } }) ?? await this.prisma.team.findUnique({ where: { id: ref }, select: { id: true } });
    if (!team) throw new NotFoundException(`Team ${ref} not found`);

    const participants = await this.prisma.eventParticipant.findMany({
      where: { teamId: team.id },
      take: 50,
      orderBy: { event: { startTime: "desc" } },
      include: {
        event: {
          select: {
            id: true, type: true, name: true, startTime: true, endTime: true, status: true, statusDetail: true,
            sport: { select: { slug: true, name: true, accentColor: true } },
            competition: { select: { slug: true, name: true } },
            round: { select: { number: true, label: true } },
            venue: { select: { city: true, country: true } },
          },
        },
      },
    });
    return participants.map((p) => p.event);
  }
}
