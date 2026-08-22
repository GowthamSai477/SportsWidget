import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { WidgetsService } from "./widgets.service";

/**
 * Widget data endpoint (spec sections 31, 15): authenticated by the widget's
 * opaque instance token, not a user JWT — native widgets cannot hold refresh
 * tokens safely. Token grants read-only access to exactly one widget payload.
 */
@ApiTags("widgets")
@Controller("widgets")
export class WidgetDataController {
  constructor(private readonly widgets: WidgetsService) {}

  @Public()
  @Get(":instanceToken/data")
  @ApiOperation({ summary: "Lightweight widget payload by opaque instance token" })
  data(@Param("instanceToken") instanceToken: string) {
    return this.widgets.buildPayload(instanceToken);
  }
}
