import type { EventStatus } from "@prisma/client";

/**
 * Provider abstraction (spec section 6): every sport adapter emits these
 * normalized shapes; nothing below this line may leak into services or API.
 * `mock: true` marks fixture-derived payloads so they are never presented as real data.
 */

export interface ProviderContext {
  seasonName: string;
}

export interface NormalizedVenue {
  externalId: string;
  name: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  lengthKm?: number;
}

export interface NormalizedSession {
  externalId: string;
  type: string; // per-sport vocabulary, documented in DATABASE.md
  name: string;
  startTime: Date;
  endTime?: Date;
  status: EventStatus;
  metadata?: Record<string, unknown>;
}

export interface NormalizedRound {
  externalId: string;
  number?: number;
  label: string;
  startTime?: Date;
  endTime?: Date;
  venue?: NormalizedVenue;
  sessions: NormalizedSession[];
}

export interface ProviderSchedule {
  seasonName: string;
  rounds: NormalizedRound[];
  mock: boolean;
}

export type StandingsKind = "DRIVERS" | "CONSTRUCTORS" | "LEAGUE";

export interface NormalizedStandingEntry {
  externalId: string;
  name: string;
  code?: string; // 3-letter driver code / team short code
  shortName?: string;
  number?: number;
  nationality?: string;
  position: number;
  points: number;
  wins?: number;
  teamExternalId?: string;
  teamName?: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderStandings {
  kind: StandingsKind;
  entries: NormalizedStandingEntry[];
  mock: boolean;
}

export interface NormalizedResultRow {
  participantExternalId: string;
  name: string;
  code?: string;
  shortName?: string;
  number?: number;
  teamExternalId?: string;
  gridPosition?: number;
  position?: number;
  positionText?: string;
  points?: number;
  timeMs?: number;
  gapMs?: number;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface ProviderResults {
  roundExternalId: string;
  rows: NormalizedResultRow[];
  mock: boolean;
}

export interface LiveStateUpdate {
  status: Extract<EventStatus, "LIVE" | "PAUSED" | "DELAYED">;
  statusDetail?: string;
  lastUpdated: Date;
  mock: boolean;
}

export interface ProviderCapabilities {
  schedule: boolean;
  standings: boolean;
  results: boolean;
  live: boolean;
}

export interface SportsProvider {
  readonly slug: string;
  readonly sportSlug: string;
  capabilities(): ProviderCapabilities;
  getSchedule(ctx: ProviderContext): Promise<ProviderSchedule>;
  getStandings(ctx: ProviderContext, kind: StandingsKind): Promise<ProviderStandings>;
  getResults(ctx: ProviderContext, roundExternalId: string): Promise<ProviderResults>;
  getLiveState?(ctx: ProviderContext, ref: { eventExternalId?: string }): Promise<LiveStateUpdate | null>;
}
