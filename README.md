# Widgets — Universal Sports Schedule Platform

Premium, widget-first sports schedules: F1 today, Cricket/Football next, 20+ sports on one architecture.

> **Status:** Milestones 1–14 complete (bootstrap through first widget). Development mode is ON — all features unlocked, no payments.

## What exists today

- **Backend** (`apps/api`, NestJS + Prisma + PostgreSQL + Redis + BullMQ)
  - Universal sports data model with provider-mapping isolation (internal IDs never leak)
  - Provider abstraction with **Jolpica-F1** (real 2026 season ingested and verified) and **Mock-F1** fixtures covering every event status
  - Adaptive BullMQ sync: live→60s · <24h→30min · <1h→5min · finished→one results pull · nightly sweep
  - Cached public APIs (sports, competitions, events, standings, teams) + user APIs (auth, profile, devices, favorites, widgets, notifications)
  - Widget payload endpoint with status-aware TTLs (LIVE 10s → upcoming 300s)
  - Swagger at `/api/docs`, health at `/health`, structured sync logs
- **Mobile** (`apps/mobile`, Expo SDK 57 + Expo Router + TanStack Query + Zustand + NativeWind + FlashList)
  - Home (live now / what's next with ticking countdown), Schedule (per-competition, virtualized), Sports catalog, Profile/Settings
  - Competition screen: next-session hero + drivers/constructors standings
  - Event detail: status, venue, countdown, results table, weekend sessions
  - Offline-first: persisted query cache renders instantly, revalidates in background
- **Android home-screen widgets** (`react-native-android-widget`, dev build required)
  - 3 families (Premium 4×2 two-page, Next Session 2×2, Weekend 4×3), tap-to-cycle pages, mock-data labeling, token-authenticated lightweight payloads

## Layout

```
apps/api        NestJS modular monolith (Prisma + PostgreSQL + Redis + BullMQ)
apps/mobile     Expo / React Native app incl. native home-screen widgets
packages/shared Shared TypeScript contracts + Zod wire schemas
docs/           DECISIONS · ARCHITECTURE · DATABASE · API · SPORTS_PROVIDERS · WIDGETS · DEVELOPMENT · ENVIRONMENT
```

## Quick start (development)

Prereqs: Node ≥ 20.19, Docker Desktop, Git.

```bash
npm install            # workspace install (Windows: export HOME="$USERPROFILE" if Prisma complains)
npm run infra:up       # postgres + redis
cp .env.example .env   # defaults match docker-compose

npm run db:migrate     # create schema
npm run db:seed        # sports catalog, F1 competition+season, plans, dev user

npm run dev:api        # http://localhost:3000  (Swagger: /api/docs)
npm run dev:mobile     # Expo dev server — ALWAYS via this script or from inside apps/mobile
                       # NEVER `npx expo start` from the repo root (monorepo: it resolves
                       # the wrong project and fails with "Unable to resolve ../../App")
```

Pull real F1 data:

```bash
curl -X POST localhost:3000/api/v1/sync/run \
     -H "Content-Type: application/json" -d '{"competitionSlug":"formula-1"}'
```

Device testing: set `EXPO_PUBLIC_API_URL=http://<LAN-IP>:3000/api/v1` in `apps/mobile/.env`. Widgets need a dev build (`expo prebuild -p android` + `gradlew.bat assembleDebug`) — see docs/WIDGETS.md.

## Documentation

| Doc | Contents |
|---|---|
| [DECISIONS.md](docs/DECISIONS.md) | Binding technical decisions, tradeoffs, rejections |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System diagram, module map, sync pipeline |
| [DATABASE.md](docs/DATABASE.md) | Schema map, JSONB conventions, status vocabulary |
| [API.md](docs/API.md) | Endpoint catalogue, widget payload shape, cache TTLs |
| [SPORTS_PROVIDERS.md](docs/SPORTS_PROVIDERS.md) | Provider matrix + selection criteria |
| [WIDGETS.md](docs/WIDGETS.md) | Families, page model, platform constraints |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Daily workflow, sync commands, device/widget loops |
| [ENVIRONMENT.md](docs/ENVIRONMENT.md) | Every env var and who consumes it |

## Product principle

The user should never open the app to answer *"when is the next event?"* — the widget answers that. The app exists for deeper exploration.
