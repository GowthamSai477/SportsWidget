# Testing on Your Mobile — Samsung Galaxy S25 FE

Three ways to test, from fastest to most complete. Pick **one** to start; use C when you want widgets.

> **Golden rule:** your phone and this PC must be on the **same Wi-Fi network**, and the backend must be running.

---

## 0. One-time setup

### 0.1 Find your PC's Wi-Fi IPv4

```powershell
ipconfig
```

Look under *Wireless LAN adapter Wi-Fi* → `IPv4 Address` (e.g. `10.36.76.19`). Your IP can change over time (DHCP) — re-run this if the app suddenly can't connect.

### 0.2 Point the app at your PC

File: `apps/mobile/.env` (gitignored)

```ini
EXPO_PUBLIC_API_URL=http://10.36.76.19:3000/api/v1
```

This URL is **baked into the JS bundle at build/start time**. After changing it:
- Expo Go / Metro → restart the dev server (`Ctrl+C`, then start again)
- APK → rebuild (section C)

⚠️ Do **not** use `localhost` — on the phone that means the phone itself.
⚠️ For an Android *emulator* instead, use `http://10.0.2.2:3000/api/v1`.

### 0.3 Start the backend stack

```bash
# repo root
docker compose up -d          # postgres + redis (wait for "healthy")
npm run dev:api               # NestJS on :3000  (keep this terminal open)
```

Verify from the PC:

```bash
curl http://localhost:3000/health
curl http://10.36.76.19:3000/health   # must ALSO answer via your LAN IP
```

If the second command fails but the first works → Windows Firewall is blocking Node on private networks. Allow Node.js through the firewall (first-run prompt, or *Windows Security → Firewall → Allow an app*).

### 0.4 Sync F1 data so screens have content

```bash
curl -X POST localhost:3000/api/v1/sync/run \
     -H "Content-Type: application/json" \
     -d '{"competitionSlug":"formula-1"}'
```

After ~30s: `curl "localhost:3000/api/v1/events/upcoming?limit=3"` should list real races.

---

## A. Expo Go — fastest UI test (no install, no widgets)

1. Install **Expo Go** from the Play Store on the S25 FE.
2. On the PC:

   ```bash
   npm run dev:mobile     # ALWAYS this script — never bare `npx expo start` at repo root
   ```

   ⚠️ Running `npx expo start` from `F:\Gowtham\Projects\Widgets` fails with
   `Unable to resolve "../../App"` — see DEVELOPMENT.md. Root ≠ mobile project.
3. Scan the QR code from the Expo terminal with the phone's camera.
4. The app compiles on-device (~30 s first time), then opens.

**What you should see:** Home tab ("Your sports command center", live-now section, upcoming events with a ticking countdown), Schedule/Sports/Profile tabs. If data is empty but no red screen → the API URL or sync is off, not the app.

Widgets do **nothing** in Expo Go — that's expected (native code isn't included).

---

## B. Debug build (dev build) — hot reload on the phone

Use when iterating with full native modules. Needs USB + Metro running.

```bash
cd apps/mobile
npx expo prebuild -p android        # only needed after changing plugins/app.json
cd android
gradlew.bat assembleDebug           # output: app\build\outputs\apk\debug\app-debug.apk
adb install -r app\build\outputs\apk\debug\app-debug.apk

# let the PHONE reach your PC's Metro (:8081) and API (:3000) over USB:
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000

# watch logs while using the app:
adb logcat --pid=$(adb shell pidof -s $(adb shell cmd package resolve-activity --brief -c android.intent.category.LAUNCHER | tail -1 | cut -d/ -f1)) 2>nul || adb logcat *:E ReactNativeJS:V
```

Launch the app on the phone. With `adb reverse` active, the debug build reaches Metro and the API through USB even if Wi-Fi/firewall misbehave. JS edits hot-reload automatically while Metro runs.

> Debug APKs contain **no JavaScript** — without Metro reachable they show a blank/"unable to load" screen. That's normal, not a bug.

---

## C. Release APK — standalone install (widgets work here) ✅ recommended

No PC, no cable, no Metro needed after install — the JS bundle and API URL are baked in.

1. Build (PC):

   ```bash
   cd apps/mobile/android
   gradlew.bat assembleRelease
   # output: app\build\outputs\apk\release\app-release.apk
   # a renamed copy already exists at <repo>\releases\sports-widget-v0.1.0.apk
   ```

2. Transfer `app-release.apk` to the phone (USB, Google Drive, whatever).
3. On the phone: open the APK → allow *"Install unknown apps"* for that source → Install.
4. Launch **Widgets** from the launcher.

**Expected first launch:** splash → Home tab with the dark theme → events appear within seconds (offline cache shows instantly; fresh data arrives right after).

---

## D. Testing the home-screen widget

Prerequisite: section C installed (Expo Go won't do).

1. In the app: **Profile → Widgets** (or any competition screen → *Manage*).
2. Under *Add a widget*, tap **Create widget instance** (e.g. *Premium Multi-Page*). A row appears with its token.
3. **Tap that row once** — this links your widget families to the instance.
4. On the phone's home screen: long-press empty space → **Widgets** → **Widgets** app → pick
   *F1 Premium* (4×2), *F1 Next Session* (2×2), or *F1 Weekend* (4×3) → place it.
5. The widget renders immediately: event name, countdown, freshness timestamp.
6. Tap the **‹ / ›** side strips to flip pages (countdown ⇄ championship top-5) — page indicator bottom-right.
7. Place one of the mock-data scenarios to see state labels:

   ```bash
   curl -X POST localhost:3000/api/v1/sync/run -H "Content-Type: application/json" ^
        -d "{\"competitionSlug\":\"formula-1\",\"providerSlug\":\"mock-f1\"}"
   ```

   While the payload is fixture-derived the widget/app shows an amber **MOCK DATA** tag — never presented as real.

Refresh cadence reality check: Android updates system widgets at ≥30-minute intervals; taps and opening the app refresh sooner. Sub-minute countdown precision inside the widget is not guaranteed by the platform.

---

## Release APK + HTTP: cleartext

Android RELEASE builds block plain `http://` API calls by default (debug builds allow them — one reason a debug APK may "work" while release shows empty screens). This project enables `usesCleartextTraffic` via the `expo-build-properties` plugin for development. Before any production release, move the API to HTTPS and remove that flag.

## Troubleshooting

| Symptom | Cause → Fix |
|---|---|
| `Unable to resolve "../../App" from node_modules\expo\AppEntry.js` (on PC) | Started Expo from repo root → use `npm run dev:mobile` or `cd apps/mobile`. See DEVELOPMENT.md |
| App loads but lists are empty, no error | Backend not started or not synced → section 0.3/0.4 |
| App shows "Network unavailable"/empty everywhere on phone, works on PC | Wrong `EXPO_PUBLIC_API_URL`, IP changed (re-run `ipconfig`), or firewall blocks :3000 → sections 0.1–0.3 |
| Debug APK opens blank/white | Normal for debug without Metro → use `adb reverse` (B) or the release APK (C) |
| Phone can't reach API but PC curl on LAN IP works | Phone on different Wi-Fi/network (guest networks isolate clients), or firewall |
| `prisma` errors mentioning `HOME` on PC | `export HOME="$USERPROFILE"` before npm/prisma commands |
| Widget stuck on "Open the app to connect" | You skipped step D-3 (tap the instance row to link it) |
| Changed `.env` but nothing happened | Restart Metro, or rebuild the APK — the URL is compile-time |

---

## Quick smoke checklist

```
[ ] docker compose ps            postgres+redis healthy
[ ] curl localhost:3000/health   {"status":"ok"}
[ ] curl http://<LAN-IP>:3000/health   200 (firewall OK)
[ ] upcoming events return rows  (sync done)
[ ] npm run dev:mobile           QR appears (or release APK installed)
[ ] App home shows events with countdown
[ ] Standings render (Competition → Championship)
[ ] Event detail opens (tap any race)
[ ] Widget placed, renders, pages flip on tap
```
