// Shared wire contracts between apps/api and apps/mobile.
// Keep this file dependency-light (zod only) so both runtimes consume it.

import { z } from "zod";

// ---------- Domain enums (mirror of Prisma enums, wire-safe) ----------

export const EVENT_STATUSES = [
  "SCHEDULED",
  "CONFIRMED",
  "LIVE",
  "PAUSED",
  "FINISHED",
  "POSTPONED",
  "CANCELLED",
  "DELAYED",
  "TBC",
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const WIDGET_TYPES = ["BASIC", "SCHEDULE", "ENHANCED", "LIVE", "PREMIUM"] as const;
export type WidgetType = (typeof WIDGET_TYPES)[number];

export const PLAN_TIERS = ["FREE", "SILVER", "GOLD"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export const ENTITLEMENT_KEYS = [
  "WIDGET_SWIPE",
  "LIVE_DATA",
  "PREMIUM_WIDGET",
  "LOCK_SCREEN",
  "MULTI_DEVICE",
] as const;
export type EntitlementKey = (typeof ENTITLEMENT_KEYS)[number];

export const FAVORITE_TYPES = ["SPORT", "COMPETITION", "TEAM", "PLAYER", "EVENT"] as const;
export type FavoriteType = (typeof FAVORITE_TYPES)[number];

export const DEVICE_PLATFORMS = ["IOS", "ANDROID"] as const;
export type DevicePlatform = (typeof DEVICE_PLATFORMS)[number];

// ---------- Wire shapes ----------

export const VenueLiteSchema = z.object({
  city: z.string().nullable(),
  country: z.string().nullable(),
});
export type VenueLite = z.infer<typeof VenueLiteSchema>;

export const CircuitInfoSchema = z.object({
  name: z.string(),
  lengthKm: z.number().nullable().optional(),
});
export type CircuitInfo = z.infer<typeof CircuitInfoSchema>;

export const EventLiteSchema = z.object({
  id: z.string(),
  type: z.string(), // RACE | QUALIFYING | PRACTICE_1..3 | SPRINT | MATCH ...
  name: z.string(),
  startTime: z.string(), // ISO-8601 UTC
  endTime: z.string().nullable().optional(),
  status: z.enum(EVENT_STATUSES),
  statusDetail: z.string().nullable().optional(),
  venue: VenueLiteSchema.nullable().optional(),

  circuit: CircuitInfoSchema.nullable().optional(),
});
export type EventLite = z.infer<typeof EventLiteSchema>;

export const StandingRowSchema = z.object({
  position: z.number().int(),
  positionText: z.string().optional(),
  code: z.string(), // driver code or team short name
  name: z.string(),
  points: z.number(),
  wins: z.number().int().nullable().optional(),
  gapToLeader: z.number().nullable().optional(), // in points
  isTeam: z.boolean(),
});
export type StandingRow = z.infer<typeof StandingRowSchema>;

export const ResultRowSchema = z.object({
  positionText: z.string(),
  code: z.string(),
  name: z.string(),
  gapText: z.string().nullable().optional(), // "+5.673" / "DNF"
  points: z.number().nullable().optional(),
});
export type ResultRow = z.infer<typeof ResultRowSchema>;

export const LiveStateSchema = z.object({
  status: z.enum(["LIVE", "PAUSED"]),
  detail: z.string().nullable().optional(), // "Lap 23/70"
  lastUpdated: z.string(), // ISO
  mock: z.boolean().default(false), // true => provider fixture, never real data
});
export type LiveState = z.infer<typeof LiveStateSchema>;

/// The single lightweight payload every widget consumes (spec sections 16, 30, 31).
export const WidgetPayloadSchema = z.object({
  widgetId: z.string(),
  instanceToken: z.string(),
  type: z.enum(WIDGET_TYPES),
  size: z.enum(["small", "medium", "large"]).catch("medium"),
  sport: z.object({ slug: z.string(), name: z.string(), accentColor: z.string().nullable() }),
  competition: z.object({ slug: z.string(), name: z.string() }).nullable(),
  updatedAt: z.string(),
  ttlSeconds: z.number().int().positive(),
  primary: EventLiteSchema.nullable(), // next upcoming or the live event
  schedule: z.array(EventLiteSchema).max(10),
  live: LiveStateSchema.nullable(),
  standings: z.array(StandingRowSchema).max(24),
  previous: z
    .object({
      event: EventLiteSchema,
      topResults: z.array(ResultRowSchema).max(3),
    })
    .nullable(),
  mock: z.boolean().default(false), // payload derived from mock fixtures
});
export type WidgetPayload = z.infer<typeof WidgetPayloadSchema>;

// ---------- API envelope helpers ----------

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

export function paginated<T>(items: T[], page: number, limit: number, total: number): Paginated<T> {
  return { items, page, limit, total };
}

/** Subscription plan feature flags (spec section 35); enforced post-development-mode. */
export interface PlanFeatures {
  maxWidgets: number;
  maxSports: number;
  swipe: boolean;
  premiumWidgets: number; // 0 = none
  liveData: boolean;
  lockScreen: boolean;
  multiDevice?: number; // undefined = unlimited during development
}
