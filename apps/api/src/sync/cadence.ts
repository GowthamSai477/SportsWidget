import type { EventStatus } from "@prisma/client";

/**
 * Adaptive refresh policy (spec section 14): pure functions so the decision
 * table is unit-testable without Redis/BullMQ.
 *
 * >7 days away   -> nothing per-event (nightly full sweep covers it)
 * <24 hours away -> schedule refresh every 30 minutes
 * <1 hour away   -> schedule refresh every 5 minutes (countdown precision)
 * LIVE           -> live-state poll every 1 minute
 * FINISHED       -> one results pull until results land
 */

export type SyncAction = "live" | "schedule" | "results";

export const CADENCE = {
  livePollMs: 60_000,
  nearScheduleMs: 5 * 60_000,
  dayScheduleMs: 30 * 60_000,
} as const;

const MINUTE_MS = 60_000;
const HOUR_MS = 3600_000;
const DAY_MS = 24 * HOUR_MS;

/** Overrun buffer before an un-flipped started session is treated as done. */
const OVERTIME_GRACE_MS = 30 * MINUTE_MS;

export interface EventSyncClassInput {
  status: EventStatus;
  startTime: Date;
  endTime: Date | null;
  hasResults: boolean;
  now?: Date;
}

export function classifyEventForSync(input: EventSyncClassInput): SyncAction | null {
  const now = input.now ?? new Date();
  const t = input.startTime.getTime() - now.getTime();
  const endedAt = input.endTime ?? input.startTime;

  switch (input.status) {
    case "LIVE":
    case "PAUSED":
      return "live";

    case "SCHEDULED":
    case "CONFIRMED":
    case "DELAYED": {
      if (t <= 0) {
        // Started but not flipped yet: inside the overtime grace window treat
        // as live-ish; past it the session is effectively done — a results
        // pull also finalizes the status.
        if (now.getTime() < endedAt.getTime() + OVERTIME_GRACE_MS) return "live";
        return input.hasResults ? null : "results";
      }
      if (t < DAY_MS) return "schedule";
      return null; // >24h away: nightly sweep handles it
    }

    case "TBC":
    case "POSTPONED":
      // Uncertain scheduling: re-check while inside a 48h window.
      return t < 2 * DAY_MS ? "schedule" : null;

    case "FINISHED":
      return input.hasResults ? null : "results";

    case "CANCELLED":
      return null;
  }
}
