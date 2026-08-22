import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/endpoints";

export function useSports() {
  return useQuery({ queryKey: ["sports"], queryFn: api.sports, staleTime: 24 * 3600_000 });
}

export function useCompetitions(sportSlug?: string) {
  return useQuery({
    queryKey: ["competitions", sportSlug ?? "all"],
    queryFn: () => api.competitions(sportSlug),
    staleTime: 12 * 3600_000,
  });
}

export function useUpcomingEvents(limit = 10) {
  return useQuery({ queryKey: ["events", "upcoming", limit], queryFn: () => api.upcomingEvents(limit), staleTime: 60_000 });
}

export function useLiveEvents() {
  return useQuery({ queryKey: ["events", "live"], queryFn: api.liveEvents, staleTime: 15_000, refetchInterval: 60_000 });
}

export function useCompetitionSchedule(competitionSlug?: string) {
  return useQuery({
    queryKey: ["events", "competition", competitionSlug],
    queryFn: () => api.eventsForCompetition(competitionSlug as string),
    enabled: Boolean(competitionSlug),
    staleTime: 5 * 60_000,
  });
}

export function useEventDetail(id?: string) {
  return useQuery({
    queryKey: ["event", id],
    queryFn: () => api.eventDetail(id as string),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}

export function useStandings(competitionSlug?: string) {
  return useQuery({
    queryKey: ["standings", competitionSlug],
    queryFn: () => api.standings(competitionSlug as string),
    enabled: Boolean(competitionSlug),
    staleTime: 5 * 60_000,
  });
}

export function useMyWidgets() {
  return useQuery({ queryKey: ["widgets", "mine"], queryFn: api.myWidgets });
}

export function useCreateWidget() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.createWidget,
    onSuccess: () => client.invalidateQueries({ queryKey: ["widgets", "mine"] }),
  });
}

export function useDeleteWidget() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteWidget(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ["widgets", "mine"] }),
  });
}
