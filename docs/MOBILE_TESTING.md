# Testing on Your Mobile — Samsung Galaxy S25 FE

Three ways to test. **Start with the 5-minute checklist** — it solves 90% of
"Unable to load" cases, which are network/firewall issues, not app bugs.

---

## ⚡ The 5-minute checklist (do this first)

The app bakes the backend URL at build time. If the URL is wrong for your
current network — or the firewall blocks it — you get empty screens and a
widget saying *"Open app to connect widget"*. Work through this in order:

### 1. Backend must be running on the PC

```bash
# repo root
docker compose up -d          # wait for "healthy"
npm run dev:api               # keep this terminal OPEN
curl localhost:3000/health    # must return {"status":"ok",...}
curl -X POST localhost:3000/api/v1/sync/run -H "Content-Type: application/json" -d "{\"competitionSlug\":\"formula-1\"}"
```

### 2. Find your PC's IP on the network SHARED WITH THE PHONE

```powershell
ipconfig
```

| Your setup | Use this adapter's IPv4 |
|---|---|
| Phone hotspot, PC joined via Wi-Fi | *Wireless LAN adapter Wi-Fi* |
| **Windows Mobile Hotspot** (PC shares to phone) | *Local Area Connection*\* → usually **192.168.137.1** |
| USB cable connected | no IP needed — use `adb reverse` (Path B) |

⚠️ This IP **changes between networks**. It is set in `apps/mobile/.env`
(gitignored) as `EXPO_PUBLIC_API_URL`, and baked into the app at build/start
time — changing `.env` requires restarting Metro, or rebuilding the APK.

### 3. Allow port 3000 through Windows Firewall (one-time, admin)

Hotspot networks are "Public" profile — Windows blocks inbound by default.
Open **PowerShell as Administrator** and run:

```powershell
netsh advfirewall firewall add rule name="Widgets Dev API" dir=in action=allow protocol=TCP localport=3000 profile=any
netsh advfirewall firewall add rule name="Widgets Metro" dir=in action=allow protocol=TCP localport=8081 profile=any
```

Verify the rule: `netsh advfirewall firewall show rule name="Widgets Dev API"`.

### 4. Test from the PHONE'S BROWSER before touching the app

On the S25 FE, open Chrome and go to `http://<PC-IP>:3000/health`.

- **Shows JSON** `{"status":"ok"...}` → network path is fine; the app will work.
- **Doesn't load** → the problem is network/firewall/IP — fix steps 2–3 first.
  This one test separates app bugs from network bugs instantly.

### 5. Current fallback chain (already built into recent APKs)

The app tries these in order and sticks with the first that answers:

```
1. EXPO_PUBLIC_API_URL            (primary — your current network)
2. http://10.0.2.2:3000/api/v1    (Android emulator)
3. http://localhost:3000/api/v1   (works over USB with adb reverse)
4. http://192.168.137.1:3000/api/v1 (Windows Mobile Hotspot)
```

So: **USB cable + `adb reverse tcp:3000 tcp:3000` makes ANY APK reach the
backend regardless of Wi-Fi/firewall.**

---

## Path A — USB + release APK (most reliable on-device test)

1. Enable *Developer options → USB debugging* on the S25 FE.
2. Connect USB, then on the PC:

   ```bash
   adb reverse tcp:3000 tcp:3000
   adb install -r apps/mobile/android/app/build/outputs/apk/release/app-release.apk
   ```

3. Launch the app. Data flows over USB — no Wi-Fi, no firewall concerns.

## Path B — Wi-Fi / hotspot (no cable)

1. Complete the 5-minute checklist (IP + firewall + phone-browser test).
2. Set `apps/mobile/.env` → `EXPO_PUBLIC_API_URL=http://<PC-IP>:3000/api/v1`.
3. Rebuild + reinstall:

   ```bash
   cd apps/mobile/android
   gradlew.bat assembleRelease
   adb install -r app/build/outputs/apk/release/app-release.apk
   ```

## Path C — Expo Go (UI iteration only; widgets do NOT work here)

```bash
npm run dev:mobile     # from repo root — NEVER bare `npx expo start` at root
```

Scan the QR. If Expo Go says *"incompatible"* → update Expo Go from the Play
Store (must match the project's SDK 57) — or just use Path A/B.

---

## Android Studio workflow

1. **Open** `F:\Gowtham\Projects\Widgets\apps\mobile\android` in Android Studio
   (it is a standard Gradle project). Let Gradle sync (JDK 17).
2. **Run ▶** with the S25 FE selected → builds & installs a **debug** variant.
3. Debug builds need Metro + reverse (they contain no JS):

   ```bash
   npm run dev:mobile        # terminal 1
   adb reverse tcp:8081 tcp:8081
   adb reverse tcp:3000 tcp:3000
   ```

4. **Logcat** window → filter `ReactNativeJS` → live app logs and errors.
5. For a standalone build: Build → *Generate Signed App Bundle* not needed in
   dev — use `gradlew.bat assembleRelease` (debug-keystore signed) as before.

---

## Widget test (needs Path A or B working in-app first)

1. App → **Profile → Widgets** → *Create instance* (auto-links to all families).
2. Long-press the home screen → **Widgets** → **Widgets** → pick
   *F1 Premium* (4×2) / *F1 Next Session* (2×2) / *F1 Weekend* (4×3) → place.
3. Widget shows: event name, countdown, freshness timestamp.
4. Tap **‹ / ›** side strips → flips countdown ⇄ standings (page dots below).
5. Reboot the phone → widget persists and keeps refreshing.

If the widget shows *"Open app to connect widget"*: the headless task could not
reach the backend (same network cause as section ⚡) or no instance was linked
(open the app → Widgets → tap an instance row).

---

## Troubleshooting

| Symptom | Cause → Fix |
|---|---|
| Phone browser can't open `/health` | Firewall rule missing (step ⚡3), wrong IP (⚡2), or different network |
| App loads but lists are empty | Backend not synced → run the sync curl from ⚡1 |
| Widget: "Open app to connect" | Link an instance (tap it in Widgets screen) + backend reachable |
| Debug APK opens blank | Normal — needs Metro + `adb reverse tcp:8081` (Path via Android Studio) |
| `Unable to resolve "../../App"` on PC | Expo started from repo root → use `npm run dev:mobile` |
| Changed `.env`, nothing happened | Restart Metro / rebuild APK — the URL is compile-time |
| Worked yesterday, dead today | PC IP changed (DHCP) → re-run `ipconfig`, update `.env` |

---

## Future: deployed backend

When the API is deployed (e.g. `https://api.widgets.example.com`), set
`EXPO_PUBLIC_API_URL=https://…` and rebuild — the app then works from ANY
network with no firewall/LAN setup. HTTPS also removes the need for the
cleartext-traffic flag on release builds.
