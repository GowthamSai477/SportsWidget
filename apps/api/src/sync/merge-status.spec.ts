import { describe, expect, it } from "@jest/globals";
import { mergeStatus } from "./sync.service";

const NOW = new Date("2026-08-22T12:00:00Z");

function hoursAgo(h: number): Date {
  return new Date(NOW.getTime() - h * 3600_000);
}

describe("mergeStatus (provider -> stored status reconciliation)", () => {
  it("never revives terminal states", () => {
    expect(mergeStatus("SCHEDULED", "FINISHED", null, NOW)).toBe("FINISHED");
    expect(mergeStatus("LIVE", "CANCELLED", null, NOW)).toBe("CANCELLED");
  });

  it("finishes sessions whose end time passed without an explicit provider state", () => {
    expect(mergeStatus("SCHEDULED", "SCHEDULED", hoursAgo(3), NOW)).toBe("FINISHED");
  });

  it("respects explicit non-terminal overrides like POSTPONED even after end time", () => {
    expect(mergeStatus("POSTPONED", "SCHEDULED", hoursAgo(1), NOW)).toBe("POSTPONED");
    expect(mergeStatus("DELAYED", "SCHEDULED", hoursAgo(1), NOW)).toBe("DELAYED");
  });

  it("keeps LIVE when a stale schedule says SCHEDULED", () => {
    expect(mergeStatus("SCHEDULED", "LIVE", null, NOW)).toBe("LIVE");
  });

  it("passes through provider-driven transitions", () => {
    expect(mergeStatus("LIVE", "SCHEDULED", null, NOW)).toBe("LIVE");
    expect(mergeStatus("PAUSED", "LIVE", null, NOW)).toBe("PAUSED");
  });
});
