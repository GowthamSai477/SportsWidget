import { z } from "zod";

/**
 * Zod schemas for the Ergast-compatible JSON that api.jolpi.ca serves.
 * Provider responses are UNTRUSTED input: parse before normalize (spec section 44).
 */
const SessionTime = z.object({ date: z.string(), time: z.string().optional() }).optional();

export const ErgastScheduleResponse = z.object({
  MRData: z.object({
    total: z.string(),
    RaceTable: z.object({
      season: z.string(),
      Races: z.array(
        z.object({
          season: z.string(),
          round: z.string(),
          raceName: z.string(),
          Circuit: z.object({
            circuitId: z.string(),
            circuitName: z.string(),
            Location: z.object({
              lat: z.string(),
              long: z.string(),
              locality: z.string().optional(),
              country: z.string(),
            }),
          }),
          date: z.string(),
          time: z.string().optional(),
          FirstPractice: SessionTime,
          SecondPractice: SessionTime,
          ThirdPractice: SessionTime,
          Qualifying: SessionTime,
          SprintQualifying: SessionTime,
          Sprint: SessionTime,
        }),
      ),
    }),
  }),
});

export const ErgastDriverStandingsResponse = z.object({
  MRData: z.object({
    StandingsTable: z.object({
      season: z.string(),
      StandingsLists: z.array(
        z.object({
          season: z.string(),
          round: z.string(),
          DriverStandings: z.array(
            z.object({
              position: z.string(),
              positionText: z.string(),
              points: z.string(),
              wins: z.string(),
              Driver: z.object({
                driverId: z.string(),
                permanentNumber: z.string().optional(),
                code: z.string().optional(),
                givenName: z.string(),
                familyName: z.string(),
                nationality: z.string().optional(),
                dateOfBirth: z.string().optional(),
              }),
              Constructors: z
                .array(z.object({ constructorId: z.string(), name: z.string() }))
                .min(1),
            }),
          ),
        }),
      ),
    }),
  }),
});

export const ErgastConstructorStandingsResponse = z.object({
  MRData: z.object({
    StandingsTable: z.object({
      season: z.string(),
      StandingsLists: z.array(
        z.object({
          season: z.string(),
          round: z.string(),
          ConstructorStandings: z.array(
            z.object({
              position: z.string(),
              positionText: z.string(),
              points: z.string(),
              wins: z.string(),
              Constructor: z.object({ constructorId: z.string(), name: z.string(), nationality: z.string().optional() }),
            }),
          ),
        }),
      ),
    }),
  }),
});

export const ErgastResultsResponse = z.object({
  MRData: z.object({
    RaceTable: z.object({
      season: z.string(),
      Races: z.array(
        z.object({
          season: z.string(),
          round: z.string(),
          raceName: z.string(),
          Results: z
            .array(
              z.object({
                number: z.string().optional(),
                position: z.string().optional(),
                positionText: z.string(),
                points: z.string(),
                grid: z.string(),
                status: z.string().optional(),
                Driver: z.object({
                  driverId: z.string(),
                  code: z.string().optional(),
                  givenName: z.string(),
                  familyName: z.string(),
                  permanentNumber: z.string().optional(),
                }),
                Constructor: z.object({ constructorId: z.string(), name: z.string() }),
                Time: z.object({ millis: z.string().optional(), time: z.string().optional() }).optional(),
                FastestLap: z.object({ Time: z.object({ millis: z.string().optional() }).optional() }).optional(),
              }),
            )
            .default([]),
        }),
      ),
    }),
  }),
});

export type ErgastSchedule = z.infer<typeof ErgastScheduleResponse>;
export type ErgastDriverStandings = z.infer<typeof ErgastDriverStandingsResponse>;
export type ErgastConstructorStandings = z.infer<typeof ErgastConstructorStandingsResponse>;
export type ErgastResults = z.infer<typeof ErgastResultsResponse>;
