# Release Notes — sports-widget v0.1.0

**Date:** 2026-08-23 · **Type:** first stable internal phase (pre-production, 0.x line)

## Summary

Complete Formula-1 vertical slice of the universal sports platform: NestJS+Prisma backend ingesting real F1 data from Jolpica-F1, an Expo mobile app (Home/Schedule/Sports/Profile with offline-first caching), and native Android home-screen widgets with tap-cycle pages. Development mode is ON: every feature unlocked, no payments.

## Install

| Artifact | Use |
|---|---|
| `sports-widget-v0.1.0.apk` (release, ~105 MB) | Standalone install on any Android 12+ device. JS bundle + API URL baked in. |
| debug APK | Developers only — needs Metro + `adb reverse` (contains no JS). |

Requires the backend running and reachable (`http://<PC-LAN-IP>:3000/api/v1` baked into this build; see docs/MOBILE_TESTING.md).

## What's inside

**Features**
- Multi-sport catalogue architecture (F1 active; Cricket/Football/Tennis/Basketball seeded inactive)
- Real 2026 F1 calendar: race weekends with FP1–FP3/Qualifying/Sprint/Race sessions
- Live/upcoming/recent event views with per-second countdowns
- Drivers' & Constructors' championship standings
- Event detail: status badges, venue, results table, weekend session list
- Favorites (sport/competition/team/player/event), device registration, notification inbox + preferences
- Android widgets: Premium two-page (countdown ⇄ standings), Next Session, Weekend — tap sides to flip
- Offline-first: cached data renders instantly, refreshes in background
- Dev-mode auth (email login), plan tiers scaffolded but unenforced

**Backend / API**
- `POST /sync/run` adaptive ingestion (Jolpica-F1 or mock fixtures)
- Status-aware response caching (LIVE 10s → upcoming 300s → finished 600s)
- Swagger at `/api/docs`, dependency health at `/health`
- Sync observability via `/sync/logs`

## Testing performed (all green before tagging)

| Check | Result |
|---|---|
| API TypeScript (`tsc --noEmit`) | PASS |
| Mobile TypeScript | PASS |
| Shared contracts build | PASS |
| API unit tests (jest) | 15/15 PASS |
| Prisma schema validation | PASS |
| ESLint (mobile) | 0 problems |
| Backend live smoke (/health, /api/docs, /sports, /events/upcoming, /standings) | all HTTP 200 |
| Gradle assembleDebug + assembleRelease | BUILD SUCCESSFUL |
| Embedded bundle check (LAN API URL in release APK) | verified |

On-device (Samsung Galaxy S25 FE) install/launch/widget placement is exercised manually per docs/MOBILE_TESTING.md.

## APK information

- File: `sports-widget-v0.1.0.apk` (= `app-release.apk`, debug-keystore signed)
- Version: 0.1.0 · versionCode: 1
- Commit: see tag `v0.1.0` (built from exactly that tree)

## Known issues

See CHANGELOG "Known issues" — notably RemoteViews swipe limitation (tap-to-cycle instead) and no live F1 timing from Jolpica (mock states are labeled).
