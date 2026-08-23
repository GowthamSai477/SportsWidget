import { API_BASE_URL } from "./client";
import { ApiError } from "./types";
import type {
  CompetitionDto,
  EventCardDto,
  EventDetailDto,
  MeResponseDto,
  SportDto,
  StandingsResponseDto,
  WidgetInstanceDto,
} from "./types";

interface TokenStore {
  get(): Promise<string | null>;
}

let tokenStore: TokenStore = { get: async () => null };

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

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Network unavailable");
  }

  if (response.status === 204) return undefined as T;
  const payload = (await response.json().catch(() => null)) as T | { message?: string } | null;

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "message" in payload
        ? String((payload as { message?: string }).message)
        : `Request failed (${response.status})`;
    throw new ApiError(response.status, message);
  }
  return payload as T;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

export const api = {
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

  eventsForCompetition: async (competitionSlug: string, limit = 50): Promise<{ items: EventCardDto[]; total: number }> => {
    const page = await request<{ items: EventCardDto[]; total: number }>(
      `/events?competition=${competitionSlug}&limit=${limit}&sort=asc`,
    );
    return page;
  },

  eventDetail: (id: string) => request<EventDetailDto>(`/events/${id}`),

  standings: (competitionSlug: string, season?: string) =>
    request<StandingsResponseDto>(`/standings/${competitionSlug}${season ? `?season=${season}` : ""}`),

  myWidgets: () => request<WidgetInstanceDto[]>("/users/me/widgets"),

  createWidget: (body: { type: string; name?: string; size?: string; sportSlug?: string; competitionSlug?: string }) =>
    request<WidgetInstanceDto>("/users/me/widgets", { method: "POST", body: JSON.stringify(body) }),

  deleteWidget: (id: string) => request<{ removed: string }>(`/users/me/widgets/${id}`, { method: "DELETE" }),
};
