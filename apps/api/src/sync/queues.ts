export const QUEUE_SYNC = "sync";

export const SYNC_JOB = {
  schedule: "schedule",
  standings: "standings",
  results: "results",
  live: "live",
} as const;

export type SyncJobName = (typeof SYNC_JOB)[keyof typeof SYNC_JOB];

export interface ScheduleJobData {
  competitionSlug: string;
  providerSlug?: string;
}

export interface StandingsJobData {
  competitionSlug: string;
  providerSlug?: string;
}

export interface ResultsJobData {
  eventId: string;
  providerSlug?: string;
}

export interface LiveJobData {
  eventId: string;
  providerSlug?: string;
}
