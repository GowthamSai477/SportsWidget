import type { EventStatus, WidgetType } from "@widgets/shared";

export interface SportDto {
  id: string;
  slug: string;
  name: string;
  category: string;
  iconUrl: string | null;
  accentColor: string | null;
  isActive: boolean;
}

export interface CompetitionDto {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  region: string | null;
  logoUrl: string | null;
  sport?: { slug: string; name: string; accentColor: string | null };
}

export interface EventCardDto {
  id: string;
  type: string;
  name: string;
  shortName: string | null;
  startTime: string;
  endTime: string | null;
  status: EventStatus;
  statusDetail: string | null;
  sport: { slug: string; name: string; accentColor: string | null };
  competition: { slug: string; name: string };
  round?: { number: number | null; label: string | null } | null;
  venue?: { name: string | null; city: string | null; country: string | null } | null;
}

export interface EventDetailDto extends Omit<EventCardDto, "venue"> {
  sport: { slug: string; name: string; accentColor: string | null };
  competition: { slug: string; name: string };
  season?: { name: string } | null;
  venue?: (EventCardDto["venue"] & { slug: string }) | null;
  results: {
    positionText: string | null;
    points: number | null;
    timeMs: number | null;
    gapMs: number | null;
    status: string | null;
    gridPosition: number | null;
    player: { slug: string; name: string; shortName: string | null; number: number | null } | null;
    team: { slug: string; name: string; shortName: string | null } | null;
  }[];
}

export interface StandingsResponseDto {
  competition: { slug: string; name: string };
  season: string;
  tables: {
    type: string;
    name: string;
    rows: {
      position: number;
      positionText?: string;
      code: string;
      name: string;
      points: number;
      wins: number | null;
      gapToLeader: number | null;
      isTeam: boolean;
    }[];
  }[];
}

export interface WidgetInstanceDto {
  id: string;
  type: WidgetType;
  name: string;
  size: string;
  instanceToken: string;
  isActive: boolean;
  sport?: { slug: string; name: string } | null;
  competition?: { slug: string; name: string } | null;
}

export interface MeResponseDto {
  id: string;
  email: string | null;
  name: string | null;
  timezone: string;
  theme: string;
  plan: { tier: string; features: Record<string, unknown> };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
