import { baseUrlCandidates, currentBaseUrl, markBaseUrlReachable } from "./base-url";
import { ApiError } from "./types";
import type {
  CompetitionDto,
  CompetitionTeamDto,
  EventCardDto,
  EventDetailDto,
  MeResponseDto,
  SportDto,
  StandingsResponseDto,
  WidgetInstanceDto,
} from "./types";

interface TokenStore {
  get(): Promise<string | null>;
  refresh(): Promise<boolean>;
  relogin(): Promise<void>;
}

let tokenStore: TokenStore = {
  get: async () => null,
  refresh: async () => false,
  relogin: async () => undefined,
};

/** Wired by the auth service once storage is ready; keeps this module dependency-free. */
export function setApiTokenStore(store: TokenStore): void {
  tokenStore = store;
}

async function request<T>(path: string, init?: RequestInit & { auth?: boolean }): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body) headers.set("Content-Type", "application/json");

  if (init?.auth !== false) {
    const token = await tokenStore.get();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  // Try base-URL candidates starting from the last known-good one; a network
  // error moves to the next candidate, an HTTP answer pins it as working.
  const candidates = baseUrlCandidates();
  const startIndex = Math.max(0, candidates.indexOf(currentBaseUrl()));
  let lastNetworkError = true;

  for (let pass = 0; pass < 2; pass++) {
    if (pass === 1) {
      // Access token expired (401 everywhere): refresh, then retry all candidates.
      const refreshed = await tokenStore.refresh();
      if (!refreshed) {
        const relogged = await tokenStore.relogin().then(() => true).catch(() => false);
        if (!relogged) break;
      }
    }
  for (let attempt = 0; attempt < candidates.length; attempt++) {
    const base = candidates[(startIndex + attempt) % candidates.length];
    let response: Response;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      response = await fetch(`${base}${path}`, { ...init, headers, signal: controller.signal });
    } catch {
      clearTimeout(timer);
      lastNetworkError = true;
      continue;
    }
    clearTimeout(timer);
    markBaseUrlReachable(base);
    lastNetworkError = false;

    if (response.status === 204) return undefined as T;
    const payload = (await response.json().catch(() => null)) as T | { message?: string } | null;

    if (response.status === 401 && pass === 0) {
      lastNetworkError = true;
      continue;
    }
    if (!response.ok) {
      const message =
        typeof payload === "object" && payload && "message" in payload
          ? String((payload as { message?: string }).message)
          : `Request failed (${response.status})`;
      throw new ApiError(response.status, message);
    }
    return payload as T;
  }
  }


  if (lastNetworkError) throw new ApiError(0, "Network unavailable");
  throw new ApiError(0, "No API endpoint configured");
}


export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

// Full-season fetch: the calendar needs past AND future; 200 covers any season.
export const api = {
  refresh: (refreshToken: string) =>
    request<SessionTokens>("/auth/refresh", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ refreshToken }),
    }),

  tryRefresh: () => tokenStore.refresh(),

  devLogin: (email: string, name?: string) =>
    request<SessionTokens & { user: { id: string } }>("/auth/dev/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email, name }),
    }),

  me: () => request<MeResponseDto>("/users/me"),

  sports: () => request<SportDto[]>("/sports"),

  competitions: (sportSlug?: string) =>
    request<CompetitionDto[]>(`/competitions${sportSlug ? `?sport=${sportSlug}` : ""}`),

  competitionDetail: (slug: string) => request<CompetitionDto & { seasons: { name: string; isCurrent: boolean }[] }>(`/competitions/${slug}`),
  upcomingEvents: (limit = 10, competitionSlug?: string) =>
    request<EventCardDto[]>(
      `/events/upcoming?limit=${limit}${competitionSlug ? `&competition=${competitionSlug}` : ""}`,
    ),

  liveEvents: () => request<EventCardDto[]>("/events/live"),

  eventsForCompetition: async (competitionSlug: string, limit = 200): Promise<{ items: EventCardDto[]; total: number }> => {
    const page = await request<{ items: EventCardDto[]; total: number }>(
      `/events?competition=${competitionSlug}&limit=${limit}&sort=asc`,
    );
    return page;
  },

  eventDetail: (id: string) => request<EventDetailDto>(`/events/${id}`),

  competitionTeams: (slug: string) =>
    request<CompetitionTeamDto[]>(`/competitions/${slug}/teams`),

  standings: (competitionSlug: string, season?: string) =>
    request<StandingsResponseDto>(`/standings/${competitionSlug}${season ? `?season=${season}` : ""}`),

  myWidgets: () => request<WidgetInstanceDto[]>("/users/me/widgets"),

  createWidget: (body: { type: string; name?: string; size?: string; sportSlug?: string; competitionSlug?: string }) =>
    request<WidgetInstanceDto>("/users/me/widgets", { method: "POST", body: JSON.stringify(body) }),

  deleteWidget: (id: string) => request<{ removed: string }>(`/users/me/widgets/${id}`, { method: "DELETE" }),
};
