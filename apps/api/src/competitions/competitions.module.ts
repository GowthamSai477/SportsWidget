import { Module } from "@nestjs/common";
import { CompetitionsController } from "./competitions.controller";

@Module({
  controllers: [CompetitionsController],
})
export class CompetitionsModule {}
