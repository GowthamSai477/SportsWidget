# Development

Day-to-day workflow for the Widgets platform. First-time setup: see README.md.

## ⚠️ CRITICAL: never run `npx expo start` from the repository root

This is a **monorepo**. The root `package.json` intentionally has **no `main`**
and no `App.tsx`. If you run `npx expo start` (or `expo start`) from
`F:\Gowtham\Projects\Widgets`, npm's hoisted `node_modules/.bin/expo` treats the
**root** as the Expo project, finds no entry configuration, and falls back to the
legacy `node_modules/expo/AppEntry.js`, which fails with:

```
Unable to resolve "../../App" from "node_modules\expo\AppEntry.js"
```

That error means you are in the wrong directory — it is not an app bug.

**Correct ways to start mobile:**

```bash
npm run dev:mobile          # from repo root (targets apps/mobile)
# or
cd apps/mobile && npx expo start
```

The root is kept free of Expo configuration on purpose so a stray command fails
fast with exactly this message instead of silently building the wrong project.

## Commands

| Where | Command | What |
|---|---|---|
| root | `npm run infra:up` / `infra:down` | postgres+redis containers |
| root | `npm run db:migrate` / `db:seed` / `db:studio` | Prisma lifecycle |
| root | `npm run dev:api` | NestJS watch mode (:3000, docs at `/api/docs`) |
| root | `npm run dev:mobile` | Expo dev server (QR for device) |
| root | `npm run test:api` | API unit tests (jest) |
| apps/mobile | `npx expo prebuild -p android` | regenerate `android/` from config plugins |
| apps/mobile/android | `gradlew.bat assembleDebug` | debug APK incl. native widget code |
| apps/mobile | `CI=1 npx expo export -p android` | verify the JS bundle compiles |

## Environment reality on this machine

- The shell may export an **empty `HOME`** — Prisma CLI validates and rejects it.
  Prefix commands with `export HOME="$USERPROFILE"` if you see
  `Validation Error … [Context: getConfig]`.
- Prisma resolves `.env` relative to `apps/api`, so that workspace has its own
  `.env`; the monorepo-root `.env` remains the canonical template.

## Syncing F1 data

```bash
curl -X POST localhost:3000/api/v1/sync/run \
     -H "Content-Type: application/json" \
     -d '{"competitionSlug":"formula-1"}'
# offline/demo fixtures instead:
curl -X POST localhost:3000/api/v1/sync/run \
     -H "Content-Type: application/json" \
     -d '{"competitionSlug":"formula-1","providerSlug":"mock-f1"}'
```

The adaptive scheduler then keeps everything fresh automatically:
live→60s · <24h→30min · <1h→5min · finished-without-results→one results pull.
Nightly 03:00 sweep covers far-future events. Inspect `GET /api/v1/sync/logs`.

## Device testing

- **Expo Go** works for UI iteration (no native widget code runs there).
- **Widgets require a development build**: `expo prebuild -p android` +
  `gradlew.bat assembleDebug`, then install `app/build/outputs/apk/debug/app-debug.apk`.
- **Physical device API URL**: the phone's `localhost` is the phone itself.
  Set `EXPO_PUBLIC_API_URL=http://<PC-LAN-IP>:3000/api/v1` in `apps/mobile/.env`
  (gitignored). Find the PC's IPv4 with `ipconfig` (Wireless LAN adapter).
  Emulator uses `http://10.0.2.2:3000/api/v1` instead.
  The URL is **baked into the JS bundle at build/start time** — change `.env`,
  then restart Metro or rebuild the APK.
- **Debug APKs do not embed JavaScript.** A debug build expects Metro on the PC:
  with the phone connected by USB run `adb reverse tcp:8081 tcp:8081` and
  `adb reverse tcp:3000 tcp:3000`. For a standalone install (no Metro, no USB),
  use a **release** build: `gradlew.bat assembleRelease` embeds the JS bundle and
  signs with the debug keystore — output at
  `android/app/build/outputs/apk/release/app-release.apk`.
- **Windows Firewall**: first launch of the Node API may prompt to allow inbound
  connections on private networks — allow it, or the phone cannot reach port 3000.
- Verify LAN reachability from the PC itself: `curl http://<LAN-IP>:3000/health`.

## Web

Web is secondary but configured: `npx expo export --platform web` bundles all
routes; widget registration is platform-guarded (Android-only) so web builds are
unaffected by native headless-task code.

## Widget dev loop

1. App → Widgets → create instance → tap it (links families on this device).
2. Long-press launcher → Widgets → *Widgets* → place family/size.
3. Code changes to `src/widget/**`: reload app or re-add the widget; system
   updates arrive at ≥30 min cadence (platform minimum), clicks refresh instantly.

## Testing policy

- Unit tests guard pure decision logic: cadence classification (`cadence.spec`),
  status reconciliation (`merge-status.spec`), redis URL parsing, wire schemas.
- Integration checks are currently manual smoke via curl + `/health` (compose
  e2e harness planned with Milestone 23).
- Never commit fixture-derived data presented as real — mock payloads carry
  `mock:true` end-to-end.

## Git conventions

Branches: `main` (releases) ← `develop` ← `feature/*`.
Messages: conventional commits (`feat: add f1 provider`, `fix: handle postponed sessions`).
