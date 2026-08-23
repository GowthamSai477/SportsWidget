import Constants from "expo-constants";

/**
 * API base-URL resolution (spec sections 64 + MOBILE_TESTING.md).
 *
 * Devices move between networks (home Wi-Fi, phone hotspot, USB/emulator), and
 * the PC's address changes with them. Instead of rebuilding per network, we
 * bake an ORDERED LIST of candidates and stick with the first one that
 * successfully answers a request:
 *
 *   EXPO_PUBLIC_API_URL              primary (current dev network)
 *   EXPO_PUBLIC_API_FALLBACK_URLS    comma-separated backups
 *
 * Typical setup:
 *   primary = http://<PC-LAN-IP>:3000/api/v1        (physical phone)
 *   fallback= http://10.0.2.2:3000/api/v1           (Android emulator)
 *   fallback= http://192.168.137.1:3000/api/v1      (Windows Mobile Hotspot)
 */

const rawCandidates = [
  process.env.EXPO_PUBLIC_API_URL,
  ...((process.env.EXPO_PUBLIC_API_FALLBACK_URLS ?? "").split(",").map((s) => s.trim()).filter(Boolean)),
];

export const API_BASE_CANDIDATES: string[] = [...new Set(rawCandidates.filter((u): u is string => Boolean(u)))];

if (API_BASE_CANDIDATES.length === 0) {
  API_BASE_CANDIDATES.push("http://10.0.2.2:3000/api/v1");
}

let activeIndex = 0;

/** Base URL believed to work; updated as probes succeed. */
export function currentBaseUrl(): string {
  return API_BASE_CANDIDATES[activeIndex] ?? API_BASE_CANDIDATES[0];
}

export function markBaseUrlReachable(baseUrl: string): void {
  const idx = API_BASE_CANDIDATES.indexOf(baseUrl);
  if (idx >= 0 && idx !== activeIndex) {
    activeIndex = idx;
  }
}

export function baseUrlCandidates(): string[] {
  return [...API_BASE_CANDIDATES];
}

/** Kept for callers that only need the static configured value (app config screens). */
export function configuredPrimaryUrl(): string {
  return API_BASE_CANDIDATES[0] ?? (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ?? "";
}
