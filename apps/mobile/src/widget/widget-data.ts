/**
 * Widget data access shared between the app (assignment flow) and the
 * headless widget task. AsyncStorage is used because the headless task runs
 * in a separate JS context with no Zustand state.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import type { WidgetPayload } from "@widgets/shared";

const tokenKey = (widgetName: string) => `widget.token.${widgetName}`;

export function API_BASE_URL(): string {
  return (
    process.env.EXPO_PUBLIC_API_URL ??
    (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
    "http://10.0.2.2:3000/api/v1"
  );
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

/** Fetch the lightweight widget payload (spec sections 30-31). */
export async function fetchWidgetPayload(instanceToken: string): Promise<WidgetPayload | null> {
  try {
    const response = await fetch(`${API_BASE_URL()}/widgets/${instanceToken}/data`);
    if (!response.ok) return null;
    return (await response.json()) as WidgetPayload;
  } catch {
    return null; // offline: caller renders the last-known-good fallback
  }
}
