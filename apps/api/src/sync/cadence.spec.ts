import { classifyEventForSync } from "./cadence";

const NOW = new Date("2026-08-22T12:00:00Z");
const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

describe("classifyEventForSync (adaptive refresh policy)", () => {
  const base = { hasResults: false, now: NOW };

  it("polls live events every tick", () => {
    expect(
      classifyEventForSync({ ...base, status: "LIVE", startTime: new Date(NOW.getTime() - 30 * MIN), endTime: null }),
    ).toBe("live");
    expect(
      classifyEventForSync({ ...base, status: "PAUSED", startTime: new Date(NOW.getTime() - 30 * MIN), endTime: null }),
    ).toBe("live");
  });

  it("treats a started-but-not-flipped session as live until shortly after its end", () => {
    const start = new Date(NOW.getTime() - 5 * MIN);
    const end = new Date(NOW.getTime() + 85 * MIN);
    expect(classifyEventForSync({ ...base, status: "SCHEDULED", startTime: start, endTime: end })).toBe("live");

    const longOver = new Date(NOW.getTime() - 3 * HOUR);
    expect(
      classifyEventForSync({
        ...base,
        status: "SCHEDULED",
        startTime: new Date(longOver),
        endTime: new Date(longOver.getTime() + 2 * HOUR),
      }),
    ).toBe("results"); // FINISHED-by-time path: no results yet
  });

  it("schedules medium-frequency refreshes within 24h and hourly within 1h", () => {
    expect(
      classifyEventForSync({ ...base, status: "CONFIRMED", startTime: new Date(NOW.getTime() + 23 * HOUR), endTime: null }),
    ).toBe("schedule");
    expect(
      classifyEventForSync({ ...base, status: "SCHEDULED", startTime: new Date(NOW.getTime() + 30 * MIN), endTime: null }),
    ).toBe("schedule");
  });

  it("ignores events more than 24h away (nightly sweep covers them)", () => {
    expect(
      classifyEventForSync({ ...base, status: "SCHEDULED", startTime: new Date(NOW.getTime() + 25 * HOUR), endTime: null }),
    ).toBeNull();
    expect(
      classifyEventForSync({ ...base, status: "TBC", startTime: new Date(NOW.getTime() + 3 * DAY), endTime: null }),
    ).toBeNull();
  });

  it("rechecks uncertain events (TBC/postponed) inside a 48h window", () => {
    expect(
      classifyEventForSync({ ...base, status: "POSTPONED", startTime: new Date(NOW.getTime() + 10 * HOUR), endTime: null }),
    ).toBe("schedule");
    expect(
      classifyEventForSync({ ...base, status: "POSTPONED", startTime: new Date(NOW.getTime() + 49 * HOUR), endTime: null }),
    ).toBeNull();
  });

  it("pulls results exactly once for finished events and never for cancelled ones", () => {
    expect(
      classifyEventForSync({ ...base, status: "FINISHED", startTime: new Date(NOW.getTime() - DAY), endTime: null }),
    ).toBe("results");
    expect(
      classifyEventForSync({ hasResults: true, now: NOW, status: "FINISHED", startTime: new Date(NOW.getTime() - DAY), endTime: null }),
    ).toBeNull();
    expect(
      classifyEventForSync({ ...base, status: "CANCELLED", startTime: new Date(NOW.getTime() + HOUR), endTime: null }),
    ).toBeNull();
  });
});
