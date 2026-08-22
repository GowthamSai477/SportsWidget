import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EventStatus } from "@prisma/client";
import type {
  NormalizedRound,
  ProviderContext,
  ProviderResults,
  ProviderSchedule,
  ProviderStandings,
  SportsProvider,
  StandingsKind,
} from "../sports-provider";
import { ProviderHttp, ProviderError } from "../provider.http";
import { TokenBucket } from "../rate-limiter";
import {
  ErgastConstructorStandingsResponse,
  ErgastDriverStandingsResponse,
  ErgastResultsResponse,
  ErgastScheduleResponse,
} from "./ergast.schema";

const SESSION_KEYS: Record<string, { type: string; name: string; short: string }> = {
  FirstPractice: { type: "PRACTICE_1", name: "Practice 1", short: "FP1" },
  SecondPractice: { type: "PRACTICE_2", name: "Practice 2", short: "FP2" },
  ThirdPractice: { type: "PRACTICE_3", name: "Practice 3", short: "FP3" },
  Qualifying: { type: "QUALIFYING", name: "Qualifying", short: "Q" },
  SprintQualifying: { type: "SPRINT_QUALIFYING", name: "Sprint Qualifying", short: "SQ" },
  Sprint: { type: "SPRINT", name: "Sprint", short: "S" },
};

function instant(dateIso: string, timeIso?: string): Date {
  // Ergast times are "HH:MM:SSZ"; date-only entries default to midnight UTC.
  return new Date(`${dateIso}T${timeIso ?? "00:00:00Z"}`);
}

function codeFrom(familyName: string, code?: string): string {
  return (code ?? familyName.replace(/[^a-zA-Z]/g, "").slice(0, 3)).toUpperCase();
}

/**
 * Jolpica-F1 adapter (https://api.jolpi.ca/ergast/f1) — keyless Ergast-compatible
 * successor. Honors documented unauthenticated limits (~4 req/s burst).
 */
@Injectable()
export class JolpicaF1Provider implements SportsProvider {
  readonly slug = "jolpica-f1";
  readonly sportSlug = "formula-1";
  private readonly baseUrl: string;
  private readonly bucket = new TokenBucket(4, 4);

  constructor(
    private readonly http: ProviderHttp,
    config: ConfigService,
  ) {
    this.baseUrl = (config.get<string>("providers.jolpicaF1BaseUrl") ?? "https://api.jolpi.ca/ergast/f1").replace(/\/$/, "");
  }

  capabilities() {
    return { schedule: true, standings: true, results: true, live: false };
  }

  async getSchedule(ctx: ProviderContext): Promise<ProviderSchedule> {
    const raw = await this.http.getJson<unknown>(`${this.baseUrl}/${ctx.seasonName}.json?limit=100`, { bucket: this.bucket });
    const data = ErgastScheduleResponse.parse(raw);

    const rounds: NormalizedRound[] = data.MRData.RaceTable.Races.map((race) => {
      const sessionSources: Array<[keyof typeof SESSION_KEYS, { date: string; time?: string } | undefined]> = [
        ["FirstPractice", race.FirstPractice],
        ["SecondPractice", race.SecondPractice],
        ["ThirdPractice", race.ThirdPractice],
        ["Qualifying", race.Qualifying],
        ["SprintQualifying", race.SprintQualifying],
        ["Sprint", race.Sprint],
      ];
      const sessions = sessionSources
        .flatMap(([key, st]) => {
          if (!st) return [];
          const def = SESSION_KEYS[key];
          const start = instant(st.date, st.time);
          return [
            {
              externalId: `${race.season}-r${race.round}-${def.short.toLowerCase()}`,
              type: def.type,
              name: `${race.raceName} — ${def.name}`,
              startTime: start,
              endTime: new Date(start.getTime() + 2 * 3600 * 1000),
              status: "SCHEDULED" as EventStatus,
              metadata: { sessionShort: def.short },
            },
          ];
        });

      const raceStart = instant(race.date, race.time);
      sessions.push({
        externalId: `${race.season}-r${race.round}-race`,
        type: "RACE",
        name: race.raceName,
        startTime: raceStart,
        endTime: new Date(raceStart.getTime() + 2 * 3600 * 1000),
        status: "SCHEDULED" as EventStatus,
        metadata: { sessionShort: "RACE" },
      });
      sessions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      return {
        externalId: `${race.season}-r${race.round}`,
        number: Number(race.round),
        label: race.raceName,
        startTime: sessions[0]?.startTime,
        endTime: sessions[sessions.length - 1]?.endTime,
        venue: {
          externalId: `circuit-${race.Circuit.circuitId}`,
          name: race.Circuit.circuitName,
          city: race.Circuit.Location.locality,
          country: race.Circuit.Location.country,
          latitude: Number(race.Circuit.Location.lat),
          longitude: Number(race.Circuit.Location.long),
        },
        sessions,
      };
    });

    return { seasonName: data.MRData.RaceTable.season, rounds, mock: false };
  }

  async getStandings(ctx: ProviderContext, kind: StandingsKind): Promise<ProviderStandings> {
    if (kind === "LEAGUE") {
      throw new ProviderError(this.slug, "standings:league", new Error("F1 has no league table"));
    }

    if (kind === "DRIVERS") {
      const raw = await this.http.getJson<unknown>(`${this.baseUrl}/${ctx.seasonName}/driverstandings.json`, { bucket: this.bucket });
      const data = ErgastDriverStandingsResponse.parse(raw);
      const list = data.MRData.StandingsTable.StandingsLists[0];
      return {
        kind,
        mock: false,
        entries:
          list?.DriverStandings.map((row) => ({
            externalId: row.Driver.driverId,
            name: `${row.Driver.givenName} ${row.Driver.familyName}`,
            code: row.Driver.code ? row.Driver.code.toUpperCase() : codeFrom(row.Driver.familyName),
            number: row.Driver.permanentNumber ? Number(row.Driver.permanentNumber) : undefined,
            nationality: row.Driver.nationality,
            position: Number(row.position),
            points: Number(row.points),
            wins: Number(row.wins),
            teamExternalId: row.Constructors[0].constructorId,
            teamName: row.Constructors[0].name,
          })) ?? [],
      };
    }

    const raw = await this.http.getJson<unknown>(`${this.baseUrl}/${ctx.seasonName}/constructorstandings.json`, { bucket: this.bucket });
    const data = ErgastConstructorStandingsResponse.parse(raw);
    const list = data.MRData.StandingsTable.StandingsLists[0];
    return {
      kind: kind,
      mock: false,
      entries:
        list?.ConstructorStandings.map((row) => ({
          externalId: row.Constructor.constructorId,
          name: row.Constructor.name,
          position: Number(row.position),
          points: Number(row.points),
          wins: Number(row.wins),
          nationality: row.Constructor.nationality,
        })) ?? [],
    };
  }

  async getResults(ctx: ProviderContext, roundExternalId: string): Promise<ProviderResults> {
    const match = /-r(\d+)$/.exec(roundExternalId);
    if (!match) throw new ProviderError(this.slug, roundExternalId, new Error(`Unparseable round ref ${roundExternalId}`));
    const roundNumber = match[1];

    const raw = await this.http.getJson<unknown>(`${this.baseUrl}/${ctx.seasonName}/${roundNumber}/results.json?limit=100`, {
      bucket: this.bucket,
    });
    const data = ErgastResultsResponse.parse(raw);
    const race = data.MRData.RaceTable.Races[0];
    const rows = race?.Results ?? [];

    const leaderMillis = rows.find((r) => r.position === "1")?.Time?.millis;
    return {
      roundExternalId,
      mock: false,
      rows: rows.map((r) => {
        const timeMs = r.Time?.millis ? Number(r.Time.millis) : undefined;
        return {
          participantExternalId: r.Driver.driverId,
          name: `${r.Driver.givenName} ${r.Driver.familyName}`,
          code: r.Driver.code ? r.Driver.code.toUpperCase() : codeFrom(r.Driver.familyName),
          number: r.Driver.permanentNumber ? Number(r.Driver.permanentNumber) : undefined,
          teamExternalId: r.Constructor.constructorId,
          gridPosition: /^\d+$/.test(r.grid) ? Number(r.grid) : undefined,
          position: /^\d+$/.test(r.position ?? "") ? Number(r.position) : undefined,
          positionText: r.positionText,
          points: Number(r.points),
          timeMs,
          gapMs: timeMs !== undefined && leaderMillis !== undefined && r.Time?.millis !== undefined && r.position !== "1"
            ? timeMs - Number(leaderMillis)
            : undefined,
          status: r.status,
          metadata: r.FastestLap?.Time?.millis ? { fastestLapMs: Number(r.FastestLap.Time.millis) } : undefined,
        };
      }),
    };
  }
}
