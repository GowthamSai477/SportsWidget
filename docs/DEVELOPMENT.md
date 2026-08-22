# Development

Day-to-day workflow for the Widgets platform. First-time setup: see README.md.

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
- Physical device: set `EXPO_PUBLIC_API_URL=http://<LAN-IP>:3000/api/v1` in
  `apps/mobile/.env`. Emulator default is `http://10.0.2.2:3000/api/v1`.

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
