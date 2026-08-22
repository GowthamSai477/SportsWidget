import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { StandingsService } from "./standings.service";

@ApiTags("standings")
@Controller("standings")
export class StandingsController {
  constructor(private readonly standings: StandingsService) {}

  @Public()
  @Get(":competitionRef")
  @ApiOperation({ summary: "Standings tables for a competition (id or slug)" })
  @ApiQuery({ name: "type", required: false, enum: ["DRIVERS", "CONSTRUCTORS", "LEAGUE", "CUSTOM"] })
  @ApiQuery({ name: "season", required: false })
  forCompetition(
    @Param("competitionRef") competitionRef: string,
    @Query("type") type?: "DRIVERS" | "CONSTRUCTORS" | "LEAGUE" | "CUSTOM",
    @Query("season") season?: string,
  ) {
    return this.standings.forCompetition(competitionRef, { type, season });
  }
}
