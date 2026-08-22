# Widgets — Universal Sports Schedule Platform

Premium, widget-first sports schedules: F1 today, Cricket/Football next, 20+ sports on one architecture.

> **Status:** bootstrap (Milestones 1–14 of the master plan). Development mode is ON — all features unlocked, no payments.

## Layout

```
apps/api        NestJS modular monolith (Prisma + PostgreSQL + Redis + BullMQ)
apps/mobile     Expo / React Native app (Expo Router) incl. Android home-screen widgets
packages/shared Shared TypeScript types + Zod schemas (API contracts, domain enums)
docs/           Architecture & operations documentation
```

## Quick start (development)

Prereqs: Node ≥ 20.19, Docker Desktop, Git. Windows/macOS/Linux all fine.

```bash
npm install            # workspace install
npm run infra:up       # postgres + redis via docker compose
cp .env.example .env   # then adjust if needed

npm run db:migrate     # prisma migrate (creates schema)
npm run db:seed        # sports catalog, competitions, F1 data, test fixtures

npm run dev:api        # http://localhost:3000  (Swagger at /api/docs)
npm run dev:mobile     # expo dev server — scan QR with Expo Go or use a dev build
```

Android device on same Wi-Fi: set `EXPO_PUBLIC_API_URL=http://<your-lan-ip>:3000/api/v1` in `.env` before starting mobile. Android emulator uses `http://10.0.2.2:3000/api/v1` (the default).

## Documentation

| Doc | Contents |
|---|---|
| [DECISIONS.md](docs/DECISIONS.md) | Technical decision record (stacks, tradeoffs, rejections) |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System diagram, module map, sync pipeline |
| [DATABASE.md](docs/DATABASE.md) | Schema, entity relationships, JSONB conventions |
| [API.md](docs/API.md) | Endpoint catalogue, response shapes, caching |
| [SPORTS_PROVIDERS.md](docs/SPORTS_PROVIDERS.md) | Provider matrix per sport |
| [WIDGETS.md](docs/WIDGETS.md) | Widget types, swipe/pages model, platform constraints |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Day-to-day workflow, testing, troubleshooting |
| [ENVIRONMENT.md](docs/ENVIRONMENT.md) | Every env var, who consumes it |

## Product principle

The user should never open the app to answer *"when is the next event?"* — the widget answers that. The app exists for deeper exploration.
