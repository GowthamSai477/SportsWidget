import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectQueue } from "@nestjs/bullmq";
import { Job, Queue } from "bullmq";
import type { ScheduleJobData, StandingsJobData, ResultsJobData, LiveJobData } from "./queues";
import { QUEUE_SYNC, SYNC_JOB } from "./queues";
import { CADENCE } from "./cadence";
import { SyncService } from "./sync.service";
import { PrismaService } from "../infra/prisma/prisma.service";

/**
 * Adaptive scheduler (spec section 14): a per-minute tick classifies events via
 * cadence rules and enqueues idempotent jobs (jobId dedup + removeOnComplete).
 */
@Injectable()
export class SyncScheduler {
  private readonly logger = new Logger(SyncScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: SyncService,
    @InjectQueue(QUEUE_SYNC) private readonly queue: Queue,
  ) {
    // The queue owns its own ioredis connections; without this listener a
    // transient Redis error surfaces as an unhandled 'error' event.
    this.queue.on("error", (err: Error) => {
      this.logger.warn(`Sync queue error: ${err.message}`);
    });
  }

  @Cron("* * * * *")
  async tick(): Promise<void> {
    const due = await this.sync.dueEvents();
    if (due.length === 0) return;
    const now = Date.now();
    let enqueued = 0;

    for (const item of due) {
      try {
        if (item.action === "live") {
          // NOTE: BullMQ forbids ":" in custom job ids — use "|" separators.
          const jobId = `${SYNC_JOB.live}|${item.eventId}|${Math.floor(now / CADENCE.livePollMs)}`;
          await this.queue.add(SYNC_JOB.live, { eventId: item.eventId } satisfies LiveJobData, {
            jobId,
            removeOnComplete: { age: 300 },
            removeOnFail: { age: 3600 },
          });
          enqueued++;
        } else if (item.action === "schedule") {
          const t = item.startTimeMs - now;
          const bucketMs = t < 3600_000 ? CADENCE.nearScheduleMs : CADENCE.dayScheduleMs;
          const jobId = `${SYNC_JOB.schedule}|${item.competitionSlug}|${Math.floor(now / bucketMs)}`;
          await this.queue.add(SYNC_JOB.schedule, { competitionSlug: item.competitionSlug } satisfies ScheduleJobData, {
            jobId,
            removeOnComplete: { age: 7200 },
            removeOnFail: { age: 86400 },
          });
          enqueued++;
        } else if (item.action === "results") {
          await this.queue.add(SYNC_JOB.results, { eventId: item.eventId } satisfies ResultsJobData, {
            jobId: `${SYNC_JOB.results}|${item.eventId}`,
            attempts: 3,
            backoff: { type: "exponential", delay: 30_000 },
            removeOnComplete: { age: 86_400 },
            removeOnFail: { age: 86_400 },
          });
          enqueued++;
        }
      } catch (err) {
        this.logger.warn(`Failed enqueueing ${item.action} for ${item.eventId}: ${(err as Error).message}`);
      }
    }

    if (enqueued > 0) this.logger.debug(`tick enqueued ${enqueued}/${due.length} due items`);
  }

  /** Nightly full sweep for every active competition (covers far-future events). */
  @Cron("0 3 * * *")
  async nightlySweep(): Promise<void> {
    const competitions = await this.prisma.competition.findMany({
      where: { isActive: true, seasons: { some: { isCurrent: true } } },
      select: { slug: true },
    });
    const dateBucket = new Date().toISOString().slice(0, 10);
    for (const comp of competitions) {
      await this.queue.add(SYNC_JOB.schedule, { competitionSlug: comp.slug } satisfies ScheduleJobData, {
        jobId: `nightly|${SYNC_JOB.schedule}|${comp.slug}|${dateBucket}`,
        removeOnComplete: { age: 172_800 },
      });
      await this.queue.add(SYNC_JOB.standings, { competitionSlug: comp.slug } satisfies StandingsJobData, {
        jobId: `nightly|${SYNC_JOB.standings}|${comp.slug}|${dateBucket}`,
        removeOnComplete: { age: 172_800 },
      });
    }
    this.logger.log(`nightly sweep queued ${competitions.length} competitions`);
  }
}
