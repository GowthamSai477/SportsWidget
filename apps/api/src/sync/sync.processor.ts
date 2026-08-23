import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import type { LiveJobData, ResultsJobData, ScheduleJobData, StandingsJobData } from "./queues";
import { QUEUE_SYNC, SYNC_JOB } from "./queues";
import { SyncService } from "./sync.service";

@Processor(QUEUE_SYNC, { concurrency: 4 })
export class SyncProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(private readonly sync: SyncService) {
    super();
  }

  /** Worker/connection-level failures must log, never crash the API. */
  @OnWorkerEvent("error")
  onWorkerError(err: Error): void {
    this.logger.warn(`Sync worker error: ${err.message}`);
  }

  async process(job: Job): Promise<unknown> {
    switch (job.name) {
      case SYNC_JOB.schedule:
        return this.sync.syncSchedule((job.data as ScheduleJobData).competitionSlug, (job.data as ScheduleJobData).providerSlug);
      case SYNC_JOB.standings:
        return this.sync.syncStandings((job.data as StandingsJobData).competitionSlug, (job.data as StandingsJobData).providerSlug);
      case SYNC_JOB.results:
        return this.sync.syncResults((job.data as ResultsJobData).eventId, (job.data as ResultsJobData).providerSlug);
      case SYNC_JOB.live:
        return this.sync.syncLive((job.data as LiveJobData).eventId, (job.data as LiveJobData).providerSlug);
      default:
        this.logger.warn(`Unknown job ${job.name}`);
        return null;
    }
  }
}
