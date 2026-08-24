# Changelog

All notable changes to the Widgets platform. Format follows Keep a Changelog;
versioning is semver (0.x.x during pre-production development).

## [0.2.0] — 2026-08-25

V1.2 device-fix release: dark mode completion, information-architecture cleanup,
F1 teams & drivers hub, data freshness, and the Android widget preview/connection
fixes found during the second S25 FE device test.

### Added
- Manual **Light / Dark / System theme selector** (Settings → Appearance) — persists, applies instantly, System follows the device (Zustand-persisted + NativeWind runtime scheme override).
- **F1 Teams & Drivers hub** on the competition screen: all teams as cards (monogram mark, championship position/points, both drivers with codes and points), driven by a new `GET /api/v1/competitions/:slug/teams` endpoint that keeps team and driver championship contexts strictly separate.
- **View all drivers** toggle under the top-10 drivers championship.
- Collapsible **Drivers / Constructors championship dropdowns** on the Home What's-Next card (collapsed by default).
- **API base-URL fallback chain**: primary URL → 10.0.2.2 (emulator) → localhost (adb reverse) → Windows-hotspot gateway; first reachable wins, 8s per-candidate timeout (AbortController — Hermes has no AbortSignal.timeout).
- **Automatic token refresh** on 401 (rotating refresh → retry → dev re-login as last resort) — fixes silent Create-Instance/auth failures after the 15-minute access-token expiry.
- **Widget picker preview images** for all three families (generated dark-themed previews wired via `previewImage`) — the picker no longer shows blank white tiles.
- **Widget error state**: "F1 · Unable to update · Tap to refresh" (tap re-fetches) distinct from the unlinked "Open the app to connect" state; whole-widget tap refreshes.
- **Test button** per widget instance — re-renders placed widgets from the app immediately (`requestWidgetUpdate`).
- 6-hourly standings sync sweep (standings change after every race; nightly-only went stale) and `@Max 200` event-page size for full-season fetches.
- Subtle **Widgets entry animation** on Home: low-frequency (3.5s) sport-icon cycle, paused off-screen, no continuous CPU burn.

### Changed
- **Home information architecture**: removed the redundant Upcoming section (the full schedule lives in Schedule); What's Next + Live + My Sports remain.
- **Live Now idle state**: compact single-line bar instead of a large empty card; full live card returns when a session is live.
- App display name "mobile" → **"Widgets"** (launcher + widget picker header).
- Dark mode: every tab screen now paints its themed background explicitly (fixes light content areas inside the dark navigation); token set extended (success/warning/danger/muted) with contrast-tuned light/dark values.
- Standings/team championship contexts are read strictly from their own tables (driver points no longer pollute team rows).

### Fixed
- `Object.groupBy` / `AbortSignal.timeout` (unsupported in Hermes) crashes.
- Schedule fetched only the first 50 season events (all past) — now fetches the complete season.
- Stale standings served from cache after sync (cache key cleared; sweep added).
- Silent Create-Instance failures now surface an error dialog with the reason.

### Known issues / limitations
- Android RemoteViews: no gesture swipes (tap-to-cycle pages instead); widget refresh cadence platform-limited (≥30 min system updates + taps + Test button).
- Manual timezone selector deferred (device timezone used); calendar view deferred.
- Team logos use generated monogram marks pending licensed assets.

## [0.1.0] — 2026-08-23

First stable internal phase: complete F1 vertical slice (backend + mobile + Android widgets).

### Added
- Monorepo (apps/api, apps/mobile, packages/shared) with Docker dev environment.
- Universal sports data model (25 Prisma models), provider abstraction with Jolpica-F1 (real 2026 data) and mock-f1 fixtures.
- BullMQ adaptive sync pipeline, cached REST API with Swagger, JWT auth with rotating refresh, entitlement scaffolding.
- Expo mobile app (Home/Schedule/Sports/Profile, offline-first cache) and Android home-screen widgets (3 families, token-authenticated payloads).
- Docs set (DECISIONS/ARCHITECTURE/DATABASE/API/SPORTS_PROVIDERS/WIDGETS/DEVELOPMENT/ENVIRONMENT/MOBILE_TESTING) and 15 unit tests.

### Fixed (post-release device-test round)
- NativeWind styles not applying on device (missing Tailwind directives in global.css).
- Cleartext HTTP blocked on release builds (usesCleartextTraffic for development).
- Wrong-directory Expo startup footgun documented; entry discipline established.
- Redis AOF corruption crashes (named volumes, AOF off, process-level error nets).
