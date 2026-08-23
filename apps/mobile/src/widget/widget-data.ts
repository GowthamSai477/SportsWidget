/**
 * Widget data access shared between the app (assignment flow) and the
 * headless widget task. AsyncStorage is used because the headless task runs
 * in a separate JS context with no Zustand state.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WidgetPayload } from "@widgets/shared";
import { baseUrlCandidates, currentBaseUrl, markBaseUrlReachable } from "../api/base-url";

const tokenKey = (widgetName: string) => `widget.token.${widgetName}`;

export function API_BASE_URL(): string {
  return currentBaseUrl();
}

export function apiCandidates(): string[] {
  return baseUrlCandidates();
}

/** Remember which backend widget instance a home-screen widget renders. */
export async function assignWidgetInstance(widgetName: string, instanceToken: string): Promise<void> {
  await AsyncStorage.setItem(tokenKey(widgetName), instanceToken);
}

export async function assignedWidgetToken(widgetName: string): Promise<string | null> {
  return AsyncStorage.getItem(tokenKey(widgetName));
}

export async function unassignWidgetInstance(widgetName: string): Promise<void> {
  await AsyncStorage.removeItem(tokenKey(widgetName));
}

/**
 * Fetch the lightweight widget payload, trying every base-URL candidate.
 * NOTE: AbortSignal.timeout does not exist in Hermes — use AbortController
 * with a manual timer (8s per candidate).
 */
export async function fetchWidgetPayload(instanceToken: string): Promise<WidgetPayload | null> {
  for (const base of baseUrlCandidates()) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${base}/widgets/${instanceToken}/data`, { signal: controller.signal });
      if (!response.ok) continue;
      markBaseUrlReachable(base);
      return (await response.json()) as WidgetPayload;
    } catch {
      continue; // offline: caller renders the connect placeholder
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}
