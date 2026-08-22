import { FlexWidget, TextWidget, registerWidgetTaskHandler } from "react-native-android-widget";
import type { WidgetTaskHandler } from "react-native-android-widget";
import { advancePage, buildPremiumBody, currentPage, PAGE_COUNT } from "./widget-pages";
import { assignedWidgetToken, fetchWidgetPayload } from "./widget-data";

/**
 * Headless widget task (react-native-android-widget). Runs when the system
 * adds/updates/resizes/clicks a home-screen widget. Fetches the lightweight
 * payload from our backend by the instance token assigned in the app
 * (spec section 31: widgets never talk to sports providers directly).
 */

function countdownText(targetIso: string): string {
  const total = new Date(targetIso).getTime() - Date.now();
  if (total <= 0) return "LIVE / DONE";
  const h = Math.floor(total / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1000);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function Placeholder(): React.ReactElement {
  return (
    <FlexWidget style={{ backgroundColor: "#0B0E14EE", borderRadius: 16, height: "match_parent", width: "match_parent", justifyContent: "center", padding: 12 }}>
      <TextWidget text="WIDGETS" style={{ color: "#E10600", fontSize: 11, fontWeight: "bold" }} />
      <TextWidget text="Open the app to connect this widget." style={{ color: "#9AA5B5", fontSize: 10, marginTop: 3 }} />
    </FlexWidget>
  );
}

async function buildSimpleBody(widgetName: string): Promise<React.ReactElement> {
  const token = await assignedWidgetToken(widgetName);
  const payload = token ? await fetchWidgetPayload(token) : null;
  if (!payload) return <Placeholder />;

  return (
    <FlexWidget style={{ backgroundColor: "#0B0E14EE", borderRadius: 16, height: "match_parent", width: "match_parent", flexDirection: "column", justifyContent: "center", padding: 10 }}>
      <TextWidget text={(payload.primary?.name ?? "No upcoming event").toUpperCase()} style={{ color: "#F2F5FA", fontSize: 12, fontWeight: "bold" }} />
      {payload.primary ? (
        <TextWidget text={countdownText(payload.primary.startTime)} style={{ color: "#E10600", fontSize: 16, fontWeight: "bold", marginTop: 2 }} />
      ) : null}
      {payload.live ? (
        <TextWidget text={`LIVE${payload.live.detail ? ` · ${payload.live.detail}` : ""}`} style={{ color: "#00C853", fontSize: 10, fontWeight: "bold", marginTop: 2 }} />
      ) : null}
      {payload.mock ? (
        <TextWidget text="MOCK DATA" style={{ color: "#FFB300", fontSize: 7, marginTop: 2 }} />
      ) : (
        <TextWidget text={new Date(payload.updatedAt).toLocaleTimeString()} style={{ color: "#5B6675", fontSize: 7, marginTop: 2 }} />
      )}
    </FlexWidget>
  );
}

registerWidgetTaskHandler(async ({ widgetInfo, widgetAction, clickAction, renderWidget }) => {
  if (widgetAction === "WIDGET_DELETED") return;

  const name = widgetInfo.widgetName;
  const isPremium = name === "f1_premium";

  // Tap-to-cycle pages on the premium family (no gesture swipes over RemoteViews).
  if (isPremium && widgetAction === "WIDGET_CLICK" && clickAction === "PAGE_NEXT") {
    await advancePage(name, 1, PAGE_COUNT);
  }
  if (isPremium && widgetAction === "WIDGET_CLICK" && clickAction === "PAGE_PREV") {
    await advancePage(name, -1, PAGE_COUNT);
  }

  const token = await assignedWidgetToken(name);
  if (!token) {
    renderWidget(<Placeholder />);
    return;
  }
  const payload = await fetchWidgetPayload(token);
  if (!payload) {
    // Offline: last-known-good is unavailable in this MVP; show placeholder
    // rather than stale-looking data. Documented in WIDGETS.md.
    renderWidget(<Placeholder />);
    return;
  }

  if (isPremium) {
    renderWidget(await buildPremiumBody(payload, name));
  } else {
    renderWidget(await buildSimpleBody(name));
  }

  void currentPage; // page state lives inside buildPremiumBody via storage
});
