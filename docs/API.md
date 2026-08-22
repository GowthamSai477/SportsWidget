# API

Base URL: `http://<host>:3000/api/v1` — Swagger/OpenAPI: **`/api/docs`** — Liveness: `/health`.

Conventions (§15-16): URI versioning, cursor-free offset pagination
(`?page=&limit=` → `{ items, page, limit, total }`), proper status codes,
DTO validation, lean payloads per surface. Public catalogue endpoints are
marked `@Public()`; user-scoped ones require `Authorization: Bearer <access>`.

## Health

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{status, uptimeSec, checks:{database:{status,latencyMs}, redis}}` |

## Auth

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/dev/login` | `{email, name?}` | **DEVELOPMENT_MODE only.** Returns `{accessToken, refreshToken, user}` |
| POST | `/auth/refresh` | `{refreshToken}` | Rotates; reuse revokes the whole family |
| POST | `/auth/logout` | `{refreshToken}` | Revokes presented token |

Google / phone OTP replace dev-login in Milestone 18 behind the same contract.

## Catalogue (public)

| Method | Path | Notes |
|---|---|---|
| GET | `/sports` | active sports (`?includeInactive=true` for all) — 24h cache |
| GET | `/sports/:slug` | sport + competitions |
| GET | `/competitions?sport=slug` | list; **`/leagues` is a documented alias** |
| GET | `/competitions/:slug` | detail + current season |
| GET | `/competitions/:slug/seasons` | seasons |
| GET | `/events/upcoming?limit&sport&competition` | next events, asc |
| GET | `/events/live?sport=` | LIVE/PAUSED events (10s cache) |
| GET | `/events?sport&competition&season&type&status[]&from&to&page&limit&sort` | filtered list |
| GET | `/events/:id` | detail incl. participants + flattened results |
| GET | `/standings/:competitionSlug?type&season` | `{season, tables:[{type,name,rows}]}` rows are `{position,code,name,points,wins,gapToLeader,isTeam}` |
| GET | `/teams/:ref` and `/teams/:ref/events` | `ref` = slug or id |

## User-scoped (Bearer required)

| Method | Path | Notes |
|---|---|---|
| GET / PATCH | `/users/me` | profile; PATCH validates IANA timezone |
| GET / PUT / DELETE | `/users/me/devices` | upsert by client `deviceId`; no limits in dev |
| GET / POST / DELETE | `/users/me/favorites` | polymorphic `{type, targetId}`; idempotent add |
| GET | `/users/me/widgets` | instances incl. instanceToken |
| POST | `/users/me/widgets` | `{type,size?,sportSlug?,competitionSlug?,config?}` → creates opaque token; plan quota checked |
| PATCH / DELETE | `/users/me/widgets/:id` | rename/disable/reconfigure/delete |
| GET | `/widgets/:instanceToken/data` | **public**; token-authenticated widget payload (below) |
| GET | `/users/me/notifications?page&limit` | `{items,total,unread}` |
| POST | `/users/me/notifications/read` | mark inbox read |
| GET / PATCH | `/users/me/notifications/preferences` | per-category enable + leadMinutes |

## Sync (development-only)

| Method | Path | Notes |
|---|---|---|
| POST | `/sync/run` | `{competitionSlug, providerSlug?}` — enqueues schedule+standings jobs; 403 outside DEVELOPMENT_MODE |
| GET | `/sync/logs?limit` | recent SyncLog records |

## Widget payload shape

```jsonc
// GET /api/v1/widgets/{instanceToken}/data
{
  "widgetId": "…", "instanceToken": "…", "type": "PREMIUM", "size": "medium",
  "sport": { "slug": "formula-1", "name": "Formula 1", "accentColor": "#E10600" },
  "competition": { "slug": "formula-1", "name": "FIA Formula One World Championship" },
  "updatedAt": "2026-08-22T22:40:00.000Z", "ttlSeconds": 300,
  "primary": { "id": "…", "type": "RACE", "name": "Dutch Grand Prix",
               "startTime": "2026-08-23T13:00:00.000Z", "status": "SCHEDULED" },
  "schedule": [ /* weekend sessions or next events, EventLite[] */ ],
  "live": null, // or {status:"LIVE", detail:"Lap 23/70", lastUpdated, mock}
  "standings": [ { "position": 1, "code": "ANT", "name": "Andrea Kimi Antonelli",
                   "points": 224, "wins": 6, "gapToLeader": null, "isTeam": false } ],
  "previous": null, // or {event, topResults[≤3]}
  "mock": false // true => fixture-derived; UI MUST label it as test data
}
```

Cache TTL by primary status (§46): LIVE 10s · PAUSED 30s · DELAYED 60s ·
SCHEDULED/CONFIRMED 300s · TBC 600s · POSTPONED 900s · FINISHED 600s · CANCELLED 3600s.
