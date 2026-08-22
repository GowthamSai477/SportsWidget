import { Module } from "@nestjs/common";
import { EntitlementsModule } from "../entitlements/entitlements.module";
import { WidgetDataController } from "./widget-data.controller";
import { WidgetsController } from "./widgets.controller";
import { WidgetsService } from "./widgets.service";

@Module({
  imports: [EntitlementsModule],
  controllers: [WidgetsController, WidgetDataController],
  providers: [WidgetsService],
})
export class WidgetsModule {}
