# Widgets

The differentiator (§1): premium home-screen awareness without opening the app (§76).

## Widget families (Android)

Declared in `apps/mobile/app.json` → `plugins["react-native-android-widget"].widgets`:

| Family name | Label | Cells | Content model |
|---|---|---|---|
| `f1_premium` | F1 Premium | 4×2 (resizable) | **Two tap-cycle pages**: ① next session + countdown ② championship top 5 |
| `f1_next` | F1 Next Session | 2×2 | Next event name + countdown + freshness |
| `f1_schedule` | F1 Weekend | 4×3 | Next event + countdown (compact schedule surface) |

All families render from the same `WidgetPayload` (see API.md) fetched by the
headless task from `GET /api/v1/widgets/:instanceToken/data` — widgets never
call sports providers and never hold user JWTs; the opaque instance token is
their only credential (§31).

## Data flow

```
App "Widgets" screen ── creates instance ──► backend (token minted)
        │ tap instance = "link" ──► AsyncStorage widget.token.<family>
        ▼
System update / click ──► RNWidgetBackgroundTask (headless JS)
        │ reads token → fetch payload (TTL-cached server-side)
        ▼
renderWidget(FlexWidget tree) ──► RemoteViews on the home screen
```

## Status rules (§30)

- `primary` is chosen server-side: live event → next upcoming → last finished.
- FINISHED events never render as upcoming countdowns.
- POSTPONED/CANCELLED render their badge state, never a stale countdown.
- `mock: true` payloads render an amber **MOCK DATA** tag — test data is always
  visually distinct (§62, §79).

## Platform constraints (stated up front — §79)

1. **No gesture swipes over Android RemoteViews.** Page navigation is
   tap-to-cycle (side strips, `PAGE_PREV`/`PAGE_NEXT` click actions) with a
   page indicator — the standard RemoteViews pattern. Documented as a binding
   decision in DECISIONS.md D9.
2. **System update cadence**: `updatePeriodMillis` minimum is 30 minutes; the
   countdown therefore re-renders on system updates, clicks, and app-driven
   `requestWidgetUpdate`. Sub-minute countdown accuracy inside the widget is
   best-effort, not guaranteed — freshness is always labeled.
3. **Offline**: if the payload fetch fails, the widget renders the "Open the app
   to connect" placeholder rather than stale-looking data.
4. **iOS**: WidgetKit / Lock Screen / Live Activities deferred until macOS build
   infrastructure exists; the backend payload is already platform-neutral.

## Adding a widget (user flow, §55-56)

1. App → Profile/Competition → **Widgets** → pick a type → "Create widget
   instance" (backend enforces plan quotas via entitlements; unlimited in dev).
2. Tap the created instance → it is linked to the widget families on this device.
3. Long-press home screen → **Widgets** → *Widgets* → pick family/size.
4. Widget renders immediately (`WIDGET_ADDED` task); future refreshes follow the
   system cadence + clicks.
