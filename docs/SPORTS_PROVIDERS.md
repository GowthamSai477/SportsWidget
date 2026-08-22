# Sports Providers

Provider abstraction: `apps/api/src/providers/sports-provider.ts`. Adapters emit
normalized domain shapes; nothing provider-specific exists below the adapter layer
(§6). Swapping a provider = implementing the interface + registering it in
`provider.registry.ts` + seeding a `provider_sources` row.

## Interface contract

```
capabilities(): { schedule, standings, results, live }
getSchedule(ctx)            → ProviderSchedule  { rounds[{venue, sessions[]}], mock }
getStandings(ctx, kind)     → ProviderStandings { DRIVERS | CONSTRUCTORS | LEAGUE }
getResults(ctx, roundExtId) → ProviderResults   { rows[] with position/points/gapMs }
getLiveState?(ctx, ref)     → LiveStateUpdate | null   (optional capability)
```

Every payload carries `mock: boolean` — fixture data is always labeled and never
presented as real (§79).

## Matrix

| Sport | Phase | Provider | Coverage | Live data | Schedule | Results | Standings | Historical | Rate limits | Commercial rights | Cost | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Formula 1 | **1 (current)** | **Jolpica-F1** `jolpica-f1` | Full F1 calendar, sessions, results, standings (Ergast-compatible) | ❌ no live timing | ✅ | ✅ | ✅ drivers+constructors | ✅ deep history | ~4 req/s burst unauthenticated; token-bucket enforced client-side | Open source / open API — verify terms before commercial launch | Free while in beta | ✅ live integration verified (2026 season ingested) |
| Formula 1 | 1 dev/test | **Mock-F1** `mock-f1` | Perpetual synthetic weekend relative to now; covers LIVE/DELAYED/POSTPONED/CANCELLED states | ✅ simulated FP1 window | ✅ | ✅ | ✅ | n/a | none | n/a — fixtures only | free | ✅ used by UI/tests |
| Cricket | 2 | Sportmonks cricket (candidate) | Ball-by-ball, scorecards, lineups per vendor docs | ✅ (tiered) | TBD at phase entry | TBD | TBD | ✅ | tier-based | License required for commercial use | Paid tiers | 🔎 evaluate at M20 |
| Football | 3 | Sportmonks football (candidate) | Major leagues per vendor docs | ✅ (tiered) | TBD | TBD | TBD | ✅ | tier-based | License required | Paid tiers | 🔎 evaluate at M21 |

Selection criteria before any production commitment (§6): coverage, licensing,
commercial usage rights, rate limits, latency, uptime, live freshness, historical
depth, stability, cost, geography, competition coverage.

## Rules

1. Mobile never calls providers directly (§5); only the sync layer does.
2. Provider failures degrade gracefully: schedule sync falls back to the mock
   source when a non-mock source fails, and every attempt is recorded in SyncLog.
3. Internal IDs are stable; provider IDs live only in `provider_mappings`.
4. Mixing providers on one competition is a development scenario. Rounds adopt an
   existing `(seasonId, number)` on conflict rather than forking the calendar;
   expect duplicated session rows if you flip-flop sources.
