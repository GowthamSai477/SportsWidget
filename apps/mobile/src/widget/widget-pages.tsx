import AsyncStorage from "@react-native-async-storage/async-storage";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import type { WidgetPayload } from "@widgets/shared";

const ACCENT = "#E10600";

const pageKey = (widgetId: string) => `widget.page.${widgetId}`;
export const PAGE_COUNT = 2;

export async function currentPage(widgetId: string, pageCount: number): Promise<number> {
  const raw = await AsyncStorage.getItem(pageKey(widgetId));
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isNaN(n) ? 0 : Math.min(n, pageCount - 1);
}

export async function advancePage(widgetId: string, delta: number, pageCount: number): Promise<void> {
  const next = ((await currentPage(widgetId, pageCount)) + delta + pageCount) % pageCount;
  await AsyncStorage.setItem(pageKey(widgetId), String(next));
}

function countdownText(targetIso: string): string {
  const total = new Date(targetIso).getTime() - Date.now();
  if (total <= 0) return "LIVE / DONE";
  const d = Math.floor(total / 86_400_000);
  const h = Math.floor((total % 86_400_000) / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1000);
  const pad = (x: number) => String(x).padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** Page 1: next session + countdown (spec section 29 page model). */
function NextPage({ payload }: { payload: WidgetPayload }) {
  const p = payload.primary;
  return (
    <FlexWidget style={{ flex: 1, justifyContent: "center", alignItems: "flex-start", padding: 10 }}>
      <TextWidget text={payload.sport.name.toUpperCase()} style={{ fontSize: 9, color: "#9AA5B5" }} />
      <TextWidget text={p?.name ?? "No event scheduled"} style={{ fontSize: 14, color: "#F2F5FA", fontWeight: "bold", marginTop: 2 }} />
      <TextWidget text={p ? countdownText(p.startTime) : "—"} style={{ fontSize: 18, color: ACCENT, fontWeight: "bold", marginTop: 4 }} />
      <TextWidget text={p ? new Date(p.startTime).toLocaleString() : ""} style={{ fontSize: 9, color: "#9AA5B5", marginTop: 2 }} />
      {payload.mock ? <TextWidget text="MOCK DATA" style={{ fontSize: 8, color: "#FFB300", marginTop: 2 }} /> : null}
    </FlexWidget>
  );
}

/** Page 2: championship standings slice. */
function StandingsPage({ payload }: { payload: WidgetPayload }) {
  return (
    <FlexWidget style={{ flex: 1, flexDirection: "column", justifyContent: "center", padding: 8 }}>
      <TextWidget text="CHAMPIONSHIP" style={{ fontSize: 9, color: "#9AA5B5", marginBottom: 4 }} />
      {payload.standings.slice(0, 5).map((row) => (
        <FlexWidget key={`${row.position}-${row.code}`} style={{ flexDirection: "row", justifyContent: "space-between", width: "match_parent", paddingVertical: 1 }}>
          <TextWidget text={`${row.position}  ${row.code}`} style={{ fontSize: 11, color: "#F2F5FA", fontWeight: "bold" }} />
          <TextWidget text={String(row.points)} style={{ fontSize: 11, color: "#9AA5B5" }} />
        </FlexWidget>
      ))}
    </FlexWidget>
  );
}

/**
 * Premium multi-page widget body with tap-to-cycle navigation. Android
 * RemoteViews cannot host gesture swipes; tapping the side strips flips pages
 * (platform limitation documented in DECISIONS.md D9 and WIDGETS.md).
 */
export async function buildPremiumBody(payload: WidgetPayload, widgetName: string): Promise<React.ReactElement> {
  const pages = [NextPage, StandingsPage];
  const page = await currentPage(widgetName, pages.length);
  const Page = pages[page] ?? NextPage;

  return (
    <FlexWidget style={{ flexDirection: "row", backgroundColor: "#0B0E14EE", borderRadius: 16, height: "match_parent", width: "match_parent" }}>
      <FlexWidget clickAction="PAGE_PREV" style={{ width: 26, height: "match_parent", justifyContent: "center", alignItems: "center" }}>
        <TextWidget text="‹" style={{ color: "#5B6675", fontSize: 16 }} />
      </FlexWidget>

      <FlexWidget style={{ flex: 1, height: "match_parent" }}>
        <Page payload={payload} />
      </FlexWidget>

      <FlexWidget clickAction="PAGE_NEXT" style={{ width: 26, height: "match_parent", justifyContent: "center", alignItems: "center" }}>
        <TextWidget text="›" style={{ color: "#5B6675", fontSize: 16 }} />
      </FlexWidget>

      <FlexWidget style={{ width: 18, height: "match_parent", justifyContent: "flex-end", alignItems: "flex-end", paddingRight: 6, paddingBottom: 6 }}>
        <TextWidget text={`${page + 1}/${pages.length}`} style={{ fontSize: 8, color: "#5B6675" }} />
      </FlexWidget>
    </FlexWidget>
  );
}
