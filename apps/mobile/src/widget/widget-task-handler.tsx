import { requestWidgetUpdate, registerWidgetTaskHandler } from "react-native-android-widget";
import { advancePage, buildErrorBody, buildFamilyBody, buildPlaceholder, PAGE_COUNT } from "./widget-pages";
import { assignedWidgetToken, fetchWidgetPayload } from "./widget-data";

/**
 * Headless widget task (react-native-android-widget). Runs on system
 * add/update/resize/click. Fetches the lightweight payload from our backend
 * by the instance token linked in the app (spec section 31: widgets never
 * talk to sports providers directly).
 *
 * Error states (spec Phase 23):
 *  - never linked     → "Open the app to connect this widget."
 *  - linked, offline  → "Unable to update / Tap to refresh" (tap re-fetches).
 */

registerWidgetTaskHandler(async ({ widgetInfo, widgetAction, clickAction, renderWidget }) => {
  if (widgetAction === "WIDGET_DELETED") return;

  const name = widgetInfo.widgetName;
  const isPremium = name === "f1_premium";

  // Tap-to-cycle pages on the premium family (no gesture swipes over RemoteViews).
  if (isPremium && widgetAction === "WIDGET_CLICK" && (clickAction === "PAGE_NEXT" || clickAction === "PAGE_PREV")) {
    await advancePage(name, clickAction === "PAGE_NEXT" ? 1 : -1, PAGE_COUNT);
  }

  const token = await assignedWidgetToken(name);
  if (!token) {
    renderWidget(buildPlaceholder());
    return;
  }

  // A tap on the error body arrives as clickAction "REFRESH" and re-fetches.
  const payload = await fetchWidgetPayload(token);
  if (!payload) {
    renderWidget(buildErrorBody());
    return;
  }

  renderWidget(await buildFamilyBody(name, payload));
});

/** Re-render every placed widget of `name` from the APP process (Test button). */
export async function refreshWidgetFromApp(name: string): Promise<void> {
  await requestWidgetUpdate({
    widgetName: name,
    renderWidget: async () => {
      const token = await assignedWidgetToken(name);
      const payload = token ? await fetchWidgetPayload(token) : null;
      if (!payload) return buildErrorBody();
      return buildFamilyBody(name, payload);
    },
  });
}

