import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { EventsService } from "./events.service";
import { ListEventsQuery } from "./dto/list-events.query";

@ApiTags("events")
@Controller("events")
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Public()
  @Get("upcoming")
  @ApiOperation({ summary: "Next events across sports (or scoped by sport/competition)" })
  @ApiQuery({ name: "limit", required: false, example: 10 })
  upcoming(
    @Query("sport") sport?: string,
    @Query("competition") competition?: string,
    @Query("limit") limit: string = "10",
  ) {
    return this.events.upcoming({
      sportSlug: sport,
      competitionSlug: competition,
      limit: Math.min(Math.max(parseInt(limit, 10) || 10, 1), 50),
    });
  }

  @Public()
  @Get("live")
  @ApiOperation({ summary: "Currently live or paused events" })
  live(@Query("sport") sport?: string) {
    return this.events.live(sport);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: "Paginated event list with filters" })
  list(@Query() query: ListEventsQuery) {
    return this.events.list(query);
  }

  @Public()
  @Get(":id")
  @ApiOperation({ summary: "Event detail with participants and results" })
  detail(@Param("id") id: string) {
    return this.events.detail(id);
  }
}
