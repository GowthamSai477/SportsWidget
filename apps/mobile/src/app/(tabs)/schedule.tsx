import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import { Link, Stack } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Countdown } from "../../components/countdown";
import { EventCard } from "../../components/event-card";
import { Chip, EmptyState, ErrorState, SkeletonList } from "../../components/ui";
import { useCompetitions, useCompetitionSchedule } from "../../hooks/queries";

export default function ScheduleScreen() {
  const competitions = useCompetitions();
  const [selected, setSelected] = useState<string | null>(null);

  const active = selected ?? competitions.data?.[0]?.slug ?? null;
  const schedule = useCompetitionSchedule(active ?? undefined);
  const activeCompetition = competitions.data?.find((c) => c.slug === active);

  // Group by race weekend (round label) so sessions read like a calendar.
  // The "current time" reference is the query's fetch timestamp — pure during
  // render, and refreshed whenever the schedule refetches.
  const nowMs = schedule.dataUpdatedAt;
  const groups = useMemo(() => {
    const items = Array.isArray(schedule.data?.items) ? schedule.data.items : [];
    const index = new Map<string, number>();
    const byRound: { label: string; events: typeof items; nextId: string | null }[] = [];

    for (const e of items) {
      const key = e.round?.label ?? "Sessions";
      if (!index.has(key)) {
        index.set(key, byRound.length);
        byRound.push({ label: key, events: [], nextId: null });
      }
      byRound[index.get(key)!].events.push(e);
    }

    for (const group of byRound) {
      const next = group.events.find(
        (e) =>
          new Date(e.startTime).getTime() > nowMs &&
          e.status !== "FINISHED" &&
          e.status !== "CANCELLED" &&
          e.status !== "POSTPONED",
      );
      group.nextId = next?.id ?? null;
    }

    return byRound;
  }, [schedule.data, nowMs]);

  return (
    <>
      <Stack.Screen options={{ title: "Schedule" }} />
      <View className="flex-1 px-4 pt-3">
        {competitions.isLoading ? (
          <SkeletonList count={2} height={52} />
        ) : competitions.isError ? (
          <ErrorState onRetry={() => competitions.refetch()} />
        ) : (
          <View className="flex-row flex-wrap">
            {(competitions.data ?? []).map((c) => (
              <Chip
                key={c.slug}
                label={c.shortName ?? c.name}
                active={active === c.slug}
                onPress={() => setSelected(c.slug)}
              />
            ))}
          </View>
        )}

        {activeCompetition ? (
          <View className="flex-row items-center mt-1 mb-2">
            <Ionicons name="calendar-outline" size={14} color="#9aa5b5" />
            <Text className="text-ink-faint text-xs ml-1.5">{activeCompetition.name}</Text>
          </View>
        ) : null}

        {!active ? (
          <EmptyState icon="trophy-outline" title="No competition available" hint="Competitions appear after the backend syncs a season." />
        ) : schedule.isLoading ? (
          <SkeletonList count={4} />
        ) : schedule.isError ? (
          <ErrorState onRetry={() => schedule.refetch()} />
        ) : (schedule.data?.items.length ?? 0) === 0 ? (
          <EmptyState icon="calendar-outline" title="No sessions found" hint="Run the F1 sync from the backend, then pull to refresh." />
        ) : (
          <FlashList
            data={groups}
                      keyExtractor={(g) => g.label}
            renderItem={({ item }) => {
                          const isNextEvent = item.nextId !== null;
              return (
                <View className="mb-4">
                  <Text className="text-ink text-[15px] font-extrabold mb-1.5">{item.label}</Text>
                  {item.events.map((e) => {
                    const isNext = isNextEvent && item.nextId === e.id;
                    return (
                      <Link key={e.id} href={`/events/${e.id}`} asChild>
                        <Pressable>
                          <EventCard
                            event={{ ...e, accentColor: e.sport.accentColor }}
                            footer={
                              isNext ? (
                                <View className="flex-row items-center justify-between mt-2 bg-surface rounded-pill px-3 py-1.5 self-start">
                                  <Ionicons name="hourglass-outline" size={13} color="#e10600" />
                                  <View className="ml-1.5">
                                    <Countdown targetIso={e.startTime} compact />
                                  </View>
                                </View>
                              ) : undefined
                            }
                          />
                        </Pressable>
                      </Link>
                    );
                  })}
                </View>
              );
            }}
          />
        )}
      </View>
    </>
  );
}
