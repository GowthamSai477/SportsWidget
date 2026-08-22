import { Module } from "@nestjs/common";
import { SportsController } from "./sports.controller";

@Module({
  controllers: [SportsController],
})
export class SportsModule {}
