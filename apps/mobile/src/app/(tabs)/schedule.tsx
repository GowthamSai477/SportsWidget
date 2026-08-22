import { useState } from "react";
import { FlashList } from "@shopify/flash-list";
import { Link, Stack } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { EventCard } from "../../components/event-card";
import { Countdown } from "../../components/countdown";
import { EmptyState, SkeletonRow } from "../../components/ui";
import { useCompetitions, useCompetitionSchedule } from "../../hooks/queries";

export default function ScheduleScreen() {
  const competitions = useCompetitions();
  const [selected, setSelected] = useState<string | null>(null);
  const active = selected ?? competitions.data?.find((c) => c.slug === "formula-1")?.slug ?? null;
  const schedule = useCompetitionSchedule(active ?? undefined);

  return (
    <>
      <Stack.Screen options={{ title: "Schedule" }} />
      <View className="flex-1 px-4 pt-2">
        {/* Competition chips */}
        <View className="flex-row flex-wrap gap-2 mb-3">
          {(competitions.data ?? []).map((c) => (
            <Pressable
              key={c.slug}
              onPress={() => setSelected(c.slug)}
              className={`rounded-pill px-3 py-1.5 border ${active === c.slug ? "border-accent bg-accent/10" : "border-surface-border"}`}
            >
              <Text className={active === c.slug ? "text-accent font-semibold" : "text-ink-dim"}>{c.shortName ?? c.name}</Text>
            </Pressable>
          ))}
        </View>

        {!active ? (
          <EmptyState icon="🏆" title="No competition selected" hint="Pick a competition above to see its schedule." />
        ) : schedule.isLoading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : (
          <FlashList
            data={schedule.data?.items ?? []}
            keyExtractor={(e) => e.id}
            renderItem={({ item }) => {
              const isNext = new Date(item.startTime) > new Date() && item.status !== "FINISHED";
              return (
                <Link href={`/events/${item.id}`} asChild>
                  <Pressable>
                    <EventCard
                      event={{ ...item }}
                      footer={
                        isNext && item.status !== "POSTPONED" && item.status !== "CANCELLED" ? (
                          <View className="mt-2">
                            <Countdown targetIso={item.startTime} compact />
                          </View>
                        ) : undefined
                      }
                    />
                  </Pressable>
                </Link>
              );
            }}
          />
        )}
      </View>
    </>
  );
}
