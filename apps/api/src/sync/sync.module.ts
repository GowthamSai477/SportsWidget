import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { NotificationsModule } from "../notifications/notifications.module";
import { MappingsService } from "./mappings.service";
import { QUEUE_SYNC } from "./queues";
import { SyncController } from "./sync.controller";
import { SyncProcessor } from "./sync.processor";
import { SyncScheduler } from "./sync.scheduler";
import { SyncService } from "./sync.service";

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_SYNC }), NotificationsModule],
  controllers: [SyncController],
  providers: [MappingsService, SyncService, SyncScheduler, SyncProcessor],
  exports: [SyncService],
})
export class SyncModule {}
