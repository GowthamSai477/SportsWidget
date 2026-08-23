# Changelog

All notable changes to the Widgets platform. Format follows Keep a Changelog;
versioning is semver (0.x.x during pre-production development).

## [0.1.0] — 2026-08-23

First stable internal phase: complete vertical slice — backend, mobile app,
and Android home-screen widgets — for Formula 1, on the universal multi-sport
architecture.

### Added
- Monorepo (`apps/api`, `apps/mobile`, `packages/shared`) with Docker dev environment (PostgreSQL 16, Redis 7).
- Universal sports data model (25 Prisma models): sports/competitions/seasons/rounds/events/participants/results/standings, favorites, widgets, devices, notifications, plans/subscriptions/entitlements scaffolding, provider sources/mappings, sync jobs/logs.
- Provider abstraction (`SportsProvider`) with two adapters:
  - `jolpica-f1` — keyless Ergast-compatible F1 API (token-bucket rate limiting, retry/backoff, Zod validation of untrusted payloads); real 2026 season ingested.
  - `mock-f1` — perpetual synthetic season covering UPCOMING/LIVE/FINISHED/DELAYED/POSTPONED/CANCELLED; every payload flagged `mock` end-to-end.
- BullMQ sync pipeline with adaptive cadence (live→60s · <24h→30min · <1h→5min · finished-without-results→once · nightly sweep) and provider-mapping-based upserts (internal IDs never leak).
- NestJS REST API `/api/v1/*` (Swagger at `/api/docs`): sports, competitions (+`leagues` alias), events (upcoming/live/filter/detail), standings, teams, favorites, devices, notifications+preferences, widgets CRUD, health.
- JWT auth (access + rotating refresh with reuse detection) and development-mode login gate; entitlement service with `DEVELOPMENT_MODE` master unlock.
- Widget data endpoint `GET /widgets/:instanceToken/data` with status-aware cache TTLs (LIVE 10s → upcoming 300s).
- Expo (SDK 57) mobile app: Home / Schedule / Sports / Profile tabs, competition detail with drivers & constructors tables, event detail with results and weekend sessions, settings; offline-first persisted query cache; NativeWind design system.
- Android home-screen widgets via react-native-android-widget: `f1_premium` (4×2, tap-cycle pages: countdown ⇄ standings), `f1_next` (2×2), `f1_schedule` (4×3); opaque instance-token auth; MOCK DATA labeling.
- Notification inbox rows fanned out on LIVE transitions and results for favoriters.
- Docs: DECISIONS, ARCHITECTURE, DATABASE, API, SPORTS_PROVIDERS, WIDGETS, DEVELOPMENT, ENVIRONMENT, MOBILE_TESTING.
- Test suite: adaptive-cadence policy, status reconciliation (`mergeStatus`), redis URL parsing, shared wire-schema validation (15 tests).

### Fixed
- Refresh token reuse now revokes the whole token family (theft containment).
- Standings sync adopted existing rounds/entities on unique conflicts instead of failing when providers were switched or mappings were rebuilt.
- Team display names no longer borrow a driver's code; refreshed every pass.
- BullMQ custom job IDs use `|` separators (`:` is rejected by BullMQ).
- Widget registration is platform-guarded so web builds work.
- Redis/ioredis error events are handled (degrade, don't crash); worker errors logged via `@OnWorkerEvent`.
- Docker volumes moved to Docker-managed storage after Windows bind-mount AOF I/O corruption (`MISCONF`).

### Known issues / limitations
- No true swipe gestures inside Android widgets (RemoteViews limitation) — tap-to-cycle pages instead.
- Jolpica-F1 provides no live timing; live states in dev come from mock fixtures (labeled MOCK DATA).
- Widget refresh cadence limited by Android platform minimum (30 min system updates); taps/app opens refresh sooner.
- Debug APKs contain no embedded JS — they require Metro + `adb reverse`.
