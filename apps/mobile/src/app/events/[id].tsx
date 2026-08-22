import { useLocalSearchParams, Stack } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { Countdown } from "../../components/countdown";
import { SessionRow } from "../../components/event-card";
import { StatusBadge } from "../../components/status-badge";
import { EmptyState, SectionHeader } from "../../components/ui";
import { useEventDetail, useUpcomingEvents } from "../../hooks/queries";

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useEventDetail(id);
  const upcoming = useUpcomingEvents(20);

  // Weekend siblings: sessions sharing the round of this event.
  const event = detail.data;
  const roundEvents = (upcoming.data ?? []).filter((e) => e.round?.label === event?.round?.label);

  if (detail.isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "Event" }} />
        <EmptyState icon="⏳" title="Loading event…" />
      </>
    );
  }

  if (!event) {
    return <EmptyState icon="❓" title="Event not found" hint="It may not be synced on this device yet." />;
  }

  const gapText = (gapMs: number | null | undefined, timeMs: number | null | undefined) => {
    if (gapMs !== null && gapMs !== undefined) return `+${(gapMs / 1000).toFixed(3)}`;
    if (timeMs !== null && timeMs !== undefined) return formatRaceTime(timeMs);
    return "";
  };
  const formatRaceTime = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;

  return (
    <>
      <Stack.Screen options={{ title: event.name }} />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="bg-surface-raised rounded-card p-5 mt-4 border border-surface-border">
          <View className="flex-row items-center justify-between">
            <Text className="text-ink-dim text-xs font-bold tracking-widest uppercase">{event.type.replace(/_/g, " ")}</Text>
            <StatusBadge status={event.status} />
          </View>
          <Text className="text-ink text-xl font-extrabold mt-1">{event.name}</Text>
          {event.venue?.city || event.venue?.country ? (
            <Text className="text-ink-dim mt-1">
              {[event.venue.name, event.venue.city, event.venue.country].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
          <Text className="text-ink mt-2">{new Date(event.startTime).toLocaleString()}</Text>
          {new Date(event.startTime) > new Date() && event.status !== "FINISHED" ? (
            <View className="mt-3">
              <Countdown targetIso={event.startTime} />
            </View>
          ) : null}
          {event.statusDetail ? <Text className="text-accent-live text-sm mt-2">{event.statusDetail}</Text> : null}
        </View>

        {/* Results */}
        {event.results.length > 0 ? (
          <>
            <SectionHeader title="Result" />
            <View className="bg-surface-raised rounded-card border border-surface-border overflow-hidden">
              {event.results.slice(0, 20).map((r) => (
                <View key={`${r.player?.slug ?? r.team?.slug}`} className="flex-row items-center px-4 py-2.5 border-b border-surface-border/50">
                  <Text className="text-ink-faint w-9">{r.positionText ?? "–"}</Text>
                  <Text className="text-ink font-bold w-12">{r.player?.shortName ?? r.team?.shortName ?? "?"}</Text>
                  <Text className="text-ink-dim flex-1" numberOfLines={1}>{r.player?.name ?? r.team?.name ?? ""}</Text>
                  <Text className="text-ink-faint text-xs tabular-nums mr-3">{gapText(r.gapMs, r.timeMs)}</Text>
                  <Text className="text-ink font-semibold w-8 text-right tabular-nums">{r.points ?? ""}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* Weekend schedule */}
        {roundEvents.length > 1 ? (
          <>
            <SectionHeader title={`Weekend — ${event.round?.label ?? ""}`} />
            <View className="bg-surface-raised rounded-card px-4 py-2 border border-surface-border">
              {roundEvents.map((e) => (
                <SessionRow key={e.id} session={{ ...e, endTime: e.endTime ?? undefined }} />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </>
  );
}
