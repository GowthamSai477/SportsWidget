import AsyncStorage from "@react-native-async-storage/async-storage";
import { FlexWidget, TextWidget } from "react-native-android-widget";
import type { WidgetPayload } from "@widgets/shared";

const BG = "#0b0e14f2";
const INK = "#f2f5fa";
const DIM = "#9aa5b5";
const FAINT = "#6b7688";
const ACCENT = "#e10600";
const DIVIDER = "#232a38";

export const PAGE_COUNT = 2;

const pageKey = (widgetId: string) => `widget.page.${widgetId}`;

export async function currentPage(widgetId: string, pageCount: number): Promise<number> {
  const raw = await AsyncStorage.getItem(pageKey(widgetId));
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isNaN(n) ? 0 : Math.min(n, pageCount - 1);
}

export async function advancePage(widgetId: string, delta: number, pageCount: number): Promise<void> {
  const next = ((await currentPage(widgetId, pageCount)) + delta + pageCount) % pageCount;
  await AsyncStorage.setItem(pageKey(widgetId), String(next));
}

function countdownText(targetIso: string, compact = false): string {
  const total = new Date(targetIso).getTime() - Date.now();
  if (total <= 0) return "RUNNING";
  const d = Math.floor(total / 86_400_000);
  const h = Math.floor((total % 86_400_000) / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const pad = (x: number) => String(x).padStart(2, "0");
  if (compact) return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}:${pad(m)}:${pad(Math.floor((total % 60_000) / 1000))}`;
  return `${pad(h)}:${pad(m)}:${pad(Math.floor((total % 60_000) / 1000))}`;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
}

/** Red brand chip + section label used across widget headers. */
function Header({ label }: { label: string }) {
  return (
    <FlexWidget style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "match_parent" }}>
      <FlexWidget style={{ backgroundColor: ACCENT, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
        <TextWidget text="F1" style={{ color: "#ffffff", fontSize: 9, fontWeight: "bold" }} />
      </FlexWidget>
      <TextWidget text={label.toUpperCase()} style={{ color: DIM, fontSize: 9, letterSpacing: 1 }} />
    </FlexWidget>
  );
}

function Divider() {
  return <FlexWidget style={{ width: "match_parent", height: 1, backgroundColor: DIVIDER, marginVertical: 5 }} />;
}

function PageDots({ active }: { active: number }) {
  return (
    <FlexWidget style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", width: "match_parent", marginTop: 3 }}>
      {Array.from({ length: PAGE_COUNT }, (_, i) => (
        <FlexWidget
          key={i}
          style={{
            width: i === active ? 10 : 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: i === active ? ACCENT : DIVIDER,
            marginLeft: i > 0 ? 3 : 0,
          }}
        />
      ))}
    </FlexWidget>
  );
}

/* ---------------- Premium page 1: countdown ---------------- */

function PremiumCountdownPage({ payload, page }: { payload: WidgetPayload; page: number }) {
  const p = payload.primary;
  return (
    <FlexWidget style={{ flex: 1, width: "match_parent", flexDirection: "column", justifyContent: "center" }}>
      <Header label={p?.type.replace(/_/g, " ") ?? "next session"} />
      <TextWidget
        text={(p?.name ?? "No upcoming session").toUpperCase()}
        style={{ color: INK, fontSize: 12, fontWeight: "bold", marginTop: 4 }}
        maxLines={1}
      />
      <FlexWidget style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", width: "match_parent", marginTop: 2 }}>
        <TextWidget text={p ? shortDate(p.startTime) : ""} style={{ color: DIM, fontSize: 10 }} />
        <TextWidget text={p ? countdownText(p.startTime) : "—"} style={{ color: INK, fontSize: 15, fontWeight: "bold" }} />
      </FlexWidget>
      <Divider />
      {/* Standings preview keeps information density on the first page */}
      {payload.standings.slice(0, 2).map((row) => (
        <FlexWidget key={`${row.position}-${row.code}`} style={{ flexDirection: "row", justifyContent: "space-between", width: "match_parent", paddingVertical: 1 }}>
          <TextWidget text={`${row.position}  ${row.code}   ${row.name.split(" ").pop() ?? ""}`} style={{ color: INK, fontSize: 10, fontWeight: "bold" }} maxLines={1} />
          <TextWidget text={`${row.points} pts`} style={{ color: DIM, fontSize: 10 }} />
        </FlexWidget>
      ))}
      <PageDots active={page} />
      {payload.mock ? <TextWidget text="MOCK DATA" style={{ color: "#ffb300", fontSize: 7, marginTop: 2 }} /> : null}
    </FlexWidget>
  );
}

/* ---------------- Premium page 2: full standings ---------------- */

function PremiumStandingsPage({ payload, page }: { payload: WidgetPayload; page: number }) {
  return (
    <FlexWidget style={{ flex: 1, width: "match_parent", flexDirection: "column", justifyContent: "center" }}>
      <Header label="championship" />
      <TextWidget text={payload.standings[0]?.isTeam ? "Constructors" : "Drivers"} style={{ color: INK, fontSize: 11, fontWeight: "bold", marginTop: 3, marginBottom: 2 }} />
      {payload.standings.slice(0, 5).map((row) => (
        <FlexWidget key={`${row.position}-${row.code}`} style={{ flexDirection: "row", justifyContent: "space-between", width: "match_parent", paddingVertical: 1.5 }}>
          <FlexWidget style={{ flexDirection: "row", alignItems: "center" }}>
            <TextWidget text={String(row.position)} style={{ color: FAINT, fontSize: 10, width: 12 }} />
            <TextWidget text={row.code} style={{ color: INK, fontSize: 11, fontWeight: "bold", width: 34 }} />
            <TextWidget text={row.name} style={{ color: DIM, fontSize: 10 }} maxLines={1} />
          </FlexWidget>
          <FlexWidget style={{ flexDirection: "row", alignItems: "center" }}>
            {row.gapToLeader ? <TextWidget text={`+${row.gapToLeader}`} style={{ color: FAINT, fontSize: 9, marginRight: 5 }} /> : null}
            <TextWidget text={`${row.points}`} style={{ color: INK, fontSize: 11, fontWeight: "bold" }} />
          </FlexWidget>
        </FlexWidget>
      ))}
      <PageDots active={page} />
    </FlexWidget>
  );
}

/**
 * Premium multi-page body. Android RemoteViews cannot host gesture swipes;
 * tapping the side strips cycles pages via click actions (DECISIONS.md D9).
 */
export async function buildPremiumBody(payload: WidgetPayload, widgetName: string): Promise<React.ReactElement> {
  const page = await currentPage(widgetName, PAGE_COUNT);
  const inner = page === 1 ? <PremiumStandingsPage payload={payload} page={page} /> : <PremiumCountdownPage payload={payload} page={page} />;

  return (
    <FlexWidget style={{ flexDirection: "row", backgroundColor: BG, borderRadius: 14, height: "match_parent", width: "match_parent", padding: 8 }}>
      <FlexWidget clickAction="PAGE_PREV" style={{ width: 22, height: "match_parent", justifyContent: "center", alignItems: "center" }}>
        <TextWidget text="‹" style={{ color: FAINT, fontSize: 14 }} />
      </FlexWidget>
      <FlexWidget style={{ flex: 1, height: "match_parent" }}>{inner}</FlexWidget>
      <FlexWidget clickAction="PAGE_NEXT" style={{ width: 22, height: "match_parent", justifyContent: "center", alignItems: "center" }}>
        <TextWidget text="›" style={{ color: FAINT, fontSize: 14 }} />
      </FlexWidget>
    </FlexWidget>
  );
}

/* ---------------- f1_next: compact 2×2 ---------------- */

export function buildNextBody(payload: WidgetPayload): React.ReactElement {
  const p = payload.primary;
  return (
    <FlexWidget style={{ backgroundColor: BG, borderRadius: 14, height: "match_parent", width: "match_parent", flexDirection: "column", justifyContent: "center", padding: 8 }}>
      <Header label="next session" />
      <TextWidget text={(p?.name ?? "No session").toUpperCase()} style={{ color: INK, fontSize: 11, fontWeight: "bold", marginTop: 4 }} maxLines={2} />
      <TextWidget text={p ? countdownText(p.startTime, true) : "—"} style={{ color: INK, fontSize: 17, fontWeight: "bold", marginTop: 3 }} />
      <TextWidget text={p ? shortDate(p.startTime) : ""} style={{ color: DIM, fontSize: 9, marginTop: 1 }} />
      {payload.mock ? <TextWidget text="MOCK DATA" style={{ color: "#ffb300", fontSize: 7, marginTop: 2 }} /> : null}
    </FlexWidget>
  );
}

/* ---------------- f1_schedule: 4×3 weekend glance ---------------- */

export function buildScheduleBody(payload: WidgetPayload): React.ReactElement {
  const p = payload.primary;
  const upcoming = payload.schedule.filter((e) => e.status !== "CANCELLED").slice(0, 4);
  return (
    <FlexWidget style={{ backgroundColor: BG, borderRadius: 14, height: "match_parent", width: "match_parent", flexDirection: "column", justifyContent: "center", padding: 10 }}>
      <Header label="race weekend" />
      <TextWidget text={(p?.name ?? "").toUpperCase()} style={{ color: INK, fontSize: 11, fontWeight: "bold", marginTop: 4 }} maxLines={1} />
      <FlexWidget style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", width: "match_parent" }}>
        <TextWidget text={p ? shortDate(p.startTime) : ""} style={{ color: DIM, fontSize: 9 }} />
        <TextWidget text={p ? countdownText(p.startTime, true) : ""} style={{ color: ACCENT, fontSize: 12, fontWeight: "bold" }} />
      </FlexWidget>
      <Divider />
      {upcoming.map((e) => (
        <FlexWidget key={e.id} style={{ flexDirection: "row", justifyContent: "space-between", width: "match_parent", paddingVertical: 1.5 }}>
          <TextWidget text={e.type.replace(/_/g, " ")} style={{ color: INK, fontSize: 9, fontWeight: "bold" }} />
          <TextWidget text={shortDate(e.startTime)} style={{ color: DIM, fontSize: 9 }} />
        </FlexWidget>
      ))}
      {payload.mock ? <TextWidget text="MOCK DATA" style={{ color: "#ffb300", fontSize: 7, marginTop: 2 }} /> : null}
    </FlexWidget>
  );
}

/** Unlinked/offline placeholder — clearly actionable, never fake data. */
export function buildPlaceholder(): React.ReactElement {
  return (
    <FlexWidget style={{ backgroundColor: BG, borderRadius: 14, height: "match_parent", width: "match_parent", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 10 }}>
      <FlexWidget style={{ backgroundColor: ACCENT, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
        <TextWidget text="F1" style={{ color: "#ffffff", fontSize: 9, fontWeight: "bold" }} />
      </FlexWidget>
      <TextWidget text="Open the app to connect this widget." style={{ color: DIM, fontSize: 9, marginTop: 4 }} />
    </FlexWidget>
  );
}

/** Backend unreachable after linking — honest error with a recovery hint (spec Phase 23). */
export function buildErrorBody(): React.ReactElement {
  return (
    <FlexWidget clickAction="REFRESH" style={{ backgroundColor: BG, borderRadius: 14, height: "match_parent", width: "match_parent", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 10 }}>
      <FlexWidget style={{ backgroundColor: ACCENT, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
        <TextWidget text="F1" style={{ color: "#ffffff", fontSize: 9, fontWeight: "bold" }} />
      </FlexWidget>
      <TextWidget text="Unable to update" style={{ color: INK, fontSize: 11, fontWeight: "bold", marginTop: 4 }} />
      <TextWidget text="Tap to refresh" style={{ color: DIM, fontSize: 9, marginTop: 2 }} />
    </FlexWidget>
  );
}

/** Render the correct family body for a widget name. */
export async function buildFamilyBody(widgetName: string, payload: WidgetPayload): Promise<React.ReactElement> {
  if (widgetName === "f1_premium") return buildPremiumBody(payload, widgetName);
  if (widgetName === "f1_schedule") return buildScheduleBody(payload);
  return buildNextBody(payload);
}