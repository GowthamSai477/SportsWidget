# Environment

Every variable, its consumer, and whether it may ever reach the mobile bundle.
**Secrets are backend-only (§39, §74); the mobile app must assume its JS bundle
is public.**

## Backend — `apps/api/.env` (and root `.env` template)

| Variable | Consumer | Example / default | Notes |
|---|---|---|---|
| `NODE_ENV` | NestJS | `development` | |
| `PORT` | API listener | `3000` | |
| `DEVELOPMENT_MODE` | entitlements + auth + sync endpoints | `true` in dev | **MUST be `false` outside local dev.** Grants every entitlement, enables `/auth/dev/login` and `/sync/run` |
| `DATABASE_URL` | Prisma | `postgresql://widgets:…@localhost:5432/widgets?schema=public` | Postgres 16 |
| `REDIS_URL` | CacheService, BullMQ | `redis://localhost:6379` | `rediss://` supported for TLS |
| `JWT_SECRET` | access-token signing | ≥32 random chars | boot fails in production if missing |
| `JWT_ACCESS_TTL` | AuthService | `15m` | |
| `JWT_REFRESH_TTL` | refresh expiry | `30d` (days granularity) | only SHA-256 hashes stored |
| `JOLPICA_F1_BASE_URL` | JolpicaF1Provider | `https://api.jolpi.ca/ergast/f1` | keyless; rate-limited client-side |

### Reserved for upcoming milestones (not consumed yet)

| Variable | Milestone | Notes |
|---|---|---|
| `SPORTMONKS_CRICKET_API_KEY` | M20 | provider keys never leave the backend |
| `SPORTMONKS_FOOTBALL_API_KEY` | M21 | idem |
| `GOOGLE_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID` | M18 | only *public* client IDs go into mobile config |
| `SENTRY_DSN` | observability pass | backend + mobile each get their own DSN |

## Mobile — `apps/mobile/.env`

| Variable | Consumer | Default | Notes |
|---|---|---|---|
| `EXPO_PUBLIC_API_URL` | api/client.ts + widget-data.ts | `http://10.0.2.2:3000/api/v1` | baked at bundle time. Emulator uses `10.0.2.2`; physical device: LAN IP of the dev machine |

No other secrets belong here — ever.

## Docker — `docker-compose.yml`

Local-only credentials (`widgets` / `widgets_dev_pw`) for postgres and redis.
Data persists under `.docker-data/` (gitignored). Production replaces compose
with managed services (RDS/ElastiCache per DECISIONS.md D8) — credentials via
the deployment platform's secret store, never committed.
