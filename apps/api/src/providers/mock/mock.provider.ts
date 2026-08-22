import { Injectable } from "@nestjs/common";
import type { EventStatus } from "@prisma/client";
import type {
  LiveStateUpdate,
  NormalizedRound,
  NormalizedSession,
  NormalizedVenue,
  ProviderContext,
  ProviderResults,
  ProviderSchedule,
  ProviderStandings,
  SportsProvider,
} from "../sports-provider";

/**
 * MOCK PROVIDER — development/test data only (spec section 62).
 * Generates a perpetual season relative to `now` so every UI state
 * (upcoming / live / finished / delayed / postponed / cancelled) is testable
 * without waiting for real calendars. Every payload carries mock:true and
 * MUST never be presented as real data (spec section 79).
 */

const HOUR = 3600_000;
const DAY = 24 * HOUR;

interface MockVenueDef extends NormalizedVenue {}

interface MockRoundDef {
  id: string;
  label: string;
  number: number;
  startOffsetMs: number;
  venue: MockVenueDef;
  sessions: Array<{
    short: string;
    type: string;
    name: string;
    offsetMs: number;
    status?: EventStatus;
  }>;
}

const VENUES: MockVenueDef[] = [
  { externalId: "circuit-silverstone-mock", name: "Silverstone Circuit", city: "Silverstone", country: "United Kingdom", latitude: 52.0786, longitude: -1.0169 },
  { externalId: "circuit-monza-mock", name: "Autodromo Nazionale Monza", city: "Monza", country: "Italy", latitude: 45.6156, longitude: 9.2811 },
  { externalId: "circuit-suzuka-mock", name: "Suzuka International Racing Course", city: "Suzuka", country: "Japan", latitude: 34.8431, longitude: 136.541 },
  { externalId: "circuit-interlagos-mock", name: "Autódromo José Carlos Pace", city: "São Paulo", country: "Brazil", latitude: -23.7036, longitude: -46.6997 },
  { externalId: "circuit-montreal-mock", name: "Circuit Gilles Villeneuve", city: "Montreal", country: "Canada", latitude: 45.5, longitude: -73.5228 },
  { externalId: "circuit-marina-bay-mock", name: "Marina Bay Street Circuit", city: "Singapore", country: "Singapore", latitude: 1.2914, longitude: 103.864 },
];

/** Round 2 FP1 starts 40 minutes ago and runs for an hour — permanently live. */
const LIVE_ROUND_INDEX = 1;
const LIVE_SESSION_OFFSET_MS = -40 * 60_000;
const LIVE_SESSION_DURATION_MS = 60 * 60_000;

function roundDefs(): MockRoundDef[] {
  return [
    {
      id: "mock-r1",
      label: "Silverstone Grand Prix",
      number: 1,
      startOffsetMs: -14 * DAY,
      venue: VENUES[0],
      sessions: [
        { short: "FP1", type: "PRACTICE_1", name: "Practice 1", offsetMs: 0 },
        { short: "Q", type: "QUALIFYING", name: "Qualifying", offsetMs: 26 * HOUR },
        { short: "RACE", type: "RACE", name: "Race", offsetMs: 2 * DAY },
      ],
    },
    {
      id: "mock-r2",
      label: "Monza Grand Prix",
      number: 2,
      startOffsetMs: LIVE_SESSION_OFFSET_MS,
      venue: VENUES[1],
      sessions: [
        { short: "FP1", type: "PRACTICE_1", name: "Practice 1", offsetMs: 0 },
        { short: "FP2", type: "PRACTICE_2", name: "Practice 2", offsetMs: 4 * HOUR },
        { short: "Q", type: "QUALIFYING", name: "Qualifying", offsetMs: 26 * HOUR },
        { short: "RACE", type: "RACE", name: "Race", offsetMs: 2 * DAY },
      ],
    },
    {
      id: "mock-r3",
      label: "Suzuka Grand Prix",
      number: 3,
      startOffsetMs: 9 * DAY,
      venue: VENUES[2],
      sessions: [
        { short: "FP1", type: "PRACTICE_1", name: "Practice 1", offsetMs: 0 },
        { short: "Q", type: "QUALIFYING", name: "Qualifying", offsetMs: 26 * HOUR },
        { short: "RACE", type: "RACE", name: "Race", offsetMs: 2 * DAY },
      ],
    },
    {
      id: "mock-r4",
      label: "Interlagos Grand Prix",
      number: 4,
      startOffsetMs: 16 * DAY,
      venue: VENUES[3],
      sessions: [{ short: "RACE", type: "RACE", name: "Race", offsetMs: 0, status: "DELAYED" }],
    },
    {
      id: "mock-r5",
      label: "Montreal Grand Prix",
      number: 5,
      startOffsetMs: 23 * DAY,
      venue: VENUES[4],
      sessions: [{ short: "RACE", type: "RACE", name: "Race", offsetMs: 0, status: "POSTPONED" }],
    },
    {
      id: "mock-r6",
      label: "Marina Bay Grand Prix",
      number: 6,
      startOffsetMs: 30 * DAY,
      venue: VENUES[5],
      sessions: [{ short: "RACE", type: "RACE", name: "Race", offsetMs: 0, status: "CANCELLED" }],
    },
  ];
}

const MOCK_DRIVERS = [
  { externalId: "nor_mock", code: "NOR", name: "Lando Norris", team: "mclaren_mock", points: 381, wins: 6 },
  { externalId: "ver_mock", code: "VER", name: "Max Verstappen", team: "red_bull_mock", points: 224.5, wins: 4 },
  { externalId: "rus_mock", code: "RUS", name: "George Russell", team: "mercedes_mock", points: 297, wins: 2 },
  { externalId: "lec_mock", code: "LEC", name: "Charles Leclerc", team: "ferrari_mock", points: 187, wins: 3 },
  { externalId: "pia_mock", code: "PIA", name: "Oscar Piastri", team: "mclaren_mock", points: 172, wins: 2 },
  { externalId: "ham_mock", code: "HAM", name: "Lewis Hamilton", team: "mercedes_mock", points: 141, wins: 1 },
] as const;

const MOCK_CONSTRUCTORS = [
  { externalId: "red_bull_mock", code: "RBR", name: "Red Bull Racing", points: 224.5, wins: 6 },
  { externalId: "mclaren_mock", code: "MCL", name: "McLaren", points: 381, wins: 6 },
  { externalId: "ferrari_mock", code: "FER", name: "Ferrari", points: 187, wins: 3 },
  { externalId: "mercedes_mock", code: "MER", name: "Mercedes", points: 297, wins: 2 },
] as const;

@Injectable()
export class MockF1Provider implements SportsProvider {
  readonly slug = "mock-f1";
  readonly sportSlug = "formula-1";

  capabilities() {
    return { schedule: true, standings: true, results: true, live: true };
  }

  async getSchedule(ctx: ProviderContext): Promise<ProviderSchedule> {
    const now = Date.now();
    const rounds: NormalizedRound[] = roundDefs().map((round) => {
      const roundStart = now + round.startOffsetMs;
      const sessions: NormalizedSession[] = round.sessions.map((s) => {
        const startTime = new Date(roundStart + s.offsetMs);
        let status: EventStatus = s.status ?? "SCHEDULED";
        if (!s.status) {
          const end = startTime.getTime() + LIVE_SESSION_DURATION_MS;
          const isLiveSession = round.number === roundDefs()[LIVE_ROUND_INDEX].number && s.short === "FP1";
          if (isLiveSession && now < end) status = "LIVE";
          else if (end < now) status = "FINISHED";
        }
        return {
          externalId: `${ctx.seasonName}-${round.id}-${s.short.toLowerCase()}`,
          type: s.type,
          name: `${round.label} — ${s.name}`,
          startTime,
          endTime: new Date(startTime.getTime() + 90 * 60_000),
          status,
          metadata: { sessionShort: s.short },
        };
      });

      sessions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
      return {
        externalId: `${ctx.seasonName}-${round.id}`,
        number: round.number,
        label: `${round.label} (Mock)`,
        startTime: sessions[0]?.startTime,
        endTime: sessions[sessions.length - 1]?.endTime,
        venue: round.venue,
        sessions,
      };
    });

    return { seasonName: ctx.seasonName, rounds, mock: true };
  }

  async getStandings(_ctx: ProviderContext, kind: "DRIVERS" | "CONSTRUCTORS" | "LEAGUE"): Promise<ProviderStandings> {
    if (kind === "DRIVERS") {
      const sorted = [...MOCK_DRIVERS].sort((a, b) => b.points - a.points);
      return {
        kind,
        mock: true,
        entries: sorted.map((d, i) => ({
          externalId: d.externalId,
          name: d.name,
          code: d.code,
          position: i + 1,
          points: d.points,
          wins: d.wins,
          teamExternalId: d.team,
        })),
      };
    }
    const sorted = [...MOCK_CONSTRUCTORS].sort((a, b) => b.points - a.points);
    return {
      kind,
      mock: true,
      entries: sorted.map((t, i) => ({
        externalId: t.externalId,
        name: t.name,
        code: t.code,
        position: i + 1,
        points: t.points,
        wins: t.wins,
      })),
    };
  }

  async getResults(_ctx: ProviderContext, roundExternalId: string): Promise<ProviderResults> {
    const ordered = [...MOCK_DRIVERS].sort((a, b) => b.points - a.points);
    const pointsByPos = [25, 18, 15, 12, 10, 8];
    return {
      roundExternalId,
      mock: true,
      rows: ordered.map((d, i) => ({
        participantExternalId: d.externalId,
        name: d.name,
        code: d.code,
        teamExternalId: d.team,
        gridPosition: ((i + 2) % ordered.length) + 1,
        position: i + 1,
        positionText: String(i + 1),
        points: pointsByPos[i],
        timeMs: i === 0 ? 5_400_000 : undefined,
        gapMs: i === 0 ? undefined : i * 4_500,
        status: i === ordered.length - 1 ? "RETIRED" : "FINISHED",
      })),
    };
  }

  async getLiveState(_ctx: ProviderContext, ref: { eventExternalId?: string }): Promise<LiveStateUpdate | null> {
    const now = Date.now();
    const fp1Start = now + roundDefs()[LIVE_ROUND_INDEX].startOffsetMs;
    const fp1End = fp1Start + LIVE_SESSION_DURATION_MS;
    const isFp1 = ref.eventExternalId !== undefined && ref.eventExternalId.endsWith("-fp1");
    if (!isFp1 || now < fp1Start || now > fp1End) return null;

    return {
      status: "LIVE",
      statusDetail: "Session running — track wet",
      lastUpdated: new Date(),
      mock: true,
    };
  }
}
