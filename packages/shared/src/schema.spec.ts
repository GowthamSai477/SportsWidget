import { describe, expect, it } from "@jest/globals";
import {
  EventLiteSchema,
  StandingRowSchema,
  WidgetPayloadSchema,
} from "./index";

const eventLite = {
  id: "evt1",
  type: "RACE",
  name: "Dutch Grand Prix",
  startTime: "2026-08-30T13:30:00.000Z",
  status: "SCHEDULED",
};

describe("WidgetPayloadSchema (wire contract)", () => {
  it("accepts a complete payload", () => {
    const parsed = WidgetPayloadSchema.parse({
      widgetId: "w1",
      instanceToken: "tok",
      type: "PREMIUM",
      size: "medium",
      sport: { slug: "formula-1", name: "Formula 1", accentColor: "#E10600" },
      competition: { slug: "formula-1", name: "F1" },
      updatedAt: "2026-08-22T12:00:00.000Z",
      ttlSeconds: 300,
      primary: eventLite,
      schedule: [eventLite],
      live: null,
      standings: [
        { position: 1, code: "VER", name: "Max Verstappen", points: 224, wins: 6, gapToLeader: null, isTeam: false },
      ],
      previous: null,
      mock: false,
    });
    expect(parsed.primary?.name).toBe("Dutch Grand Prix");
  });

  it("rejects an unknown event status", () => {
    expect(
      WidgetPayloadSchema.safeParse({
        widgetId: "w1",
        instanceToken: "tok",
        type: "BASIC",
        sport: { slug: "s", name: "s", accentColor: null },
        competition: null,
        updatedAt: "2026-08-22T12:00:00.000Z",
        ttlSeconds: 60,
        primary: { ...eventLite, status: "MAYBE" },
        schedule: [],
        live: null,
        standings: [],
        previous: null,
      }).success,
    ).toBe(false);
  });

  it("defaults missing mock flags to false", () => {
    const parsed = WidgetPayloadSchema.parse({
      widgetId: "w1",
      instanceToken: "tok",
      type: "LIVE",
      sport: { slug: "s", name: "s", accentColor: "#fff" },
      competition: null,
      updatedAt: "2026-08-22T12:00:00.000Z",
      ttlSeconds: 10,
      primary: null,
      schedule: [],
      live: null,
      standings: [],
      previous: null,
    });
    expect(parsed.mock).toBe(false);
  });

  it("validates standing rows are integers positioned from 1", () => {
    expect(StandingRowSchema.safeParse({ position: 1.5, code: "X", name: "x", points: 0 }).success).toBe(false);
    expect(EventLiteSchema.safeParse({ ...eventLite, startTime: "not-a-date" }).success).toBe(false);
  });
});
