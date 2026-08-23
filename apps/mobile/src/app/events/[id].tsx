import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { Countdown } from "../../components/countdown";
import { SessionRow } from "../../components/event-card";
import { StatusBadge } from "../../components/status-badge";
import { EmptyState, SectionHeader } from "../../components/ui";
import { useEventDetail, useUpcomingEvents } from "../../hooks/queries";

function formatRaceTime(ms: number): string {
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const msPart = String(ms % 1000).padStart(3, "0");
  return `${m}:${String(s).padStart(2, "0")}.${msPart}`;
}

export default function EventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useEventDetail(id);
  const upcoming = useUpcomingEvents(30);

  if (detail.isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "Event" }} />
        <EmptyState icon="hourglass-outline" title="Loading event…" />
      </>
    );
  }

  const event = detail.data;
  if (!event) {
    return <EmptyState icon="alert-circle-outline" title="Event not found" hint="It may not be synced on this device yet." />;
  }

  const accent = event.sport.accentColor ?? "#e10600";
  const roundEvents = (upcoming.data ?? []).filter(
    (e) => e.round?.label && e.round.label === event.round?.label,
  );

  const gapText = (gapMs: number | null | undefined, timeMs: number | null | undefined) => {
    if (gapMs !== null && gapMs !== undefined) return `+${(gapMs / 1000).toFixed(3)}`;
    if (timeMs !== null && timeMs !== undefined) return formatRaceTime(timeMs);
    return "";
  };

  return (
    <>
      <Stack.Screen options={{ title: event.name }} />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Hero */}
        <View className="rounded-card mt-4 overflow-hidden border border-surface-border bg-surface-raised">
          <View className="px-4 py-2 flex-row items-center justify-between" style={{ backgroundColor: accent }}>
            <Text className="text-white text-[11px] font-extrabold tracking-[0.1em] uppercase">
              {event.type.replace(/_/g, " ")}
            </Text>
            <StatusBadge status={event.status} />
          </View>
          <View className="p-4">
            <Text className="text-ink text-xl font-black leading-7">{event.name}</Text>
            {event.venue?.city || event.venue?.country ? (
              <View className="flex-row items-center mt-1.5">
                <Ionicons name="location-outline" size={13} color="#9aa5b5" />
                <Text className="text-ink-dim text-sm ml-1">
                  {[event.venue.name, event.venue.city, event.venue.country].filter(Boolean).join(" · ")}
                </Text>
              </View>
            ) : null}
            <View className="flex-row items-center mt-1.5">
              <Ionicons name="calendar-outline" size={13} color="#9aa5b5" />
              <Text className="text-ink-dim text-sm ml-1">
                {new Date(event.startTime).toLocaleString(undefined, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            {new Date(event.startTime) > new Date() && event.status !== "FINISHED" ? (
              <View className="mt-3">
                <Countdown targetIso={event.startTime} />
              </View>
            ) : null}
            {event.statusDetail ? (
              <View className="flex-row items-center mt-2">
                <View className="w-1.5 h-1.5 rounded-full bg-accent-live mr-1.5" />
                <Text className="text-accent-live text-sm font-semibold">{event.statusDetail}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Results */}
        {event.results.length > 0 ? (
          <>
            <SectionHeader title="Result" />
            <View className="bg-surface-raised rounded-card border border-surface-border overflow-hidden">
              {event.results.slice(0, 20).map((r, idx) => (
                <View
                  key={r.player?.slug ?? r.team?.slug ?? idx}
                  className={`flex-row items-center px-4 py-3 ${idx < Math.min(event.results.length, 20) - 1 ? "border-b border-surface-border/50" : ""}`}
                >
                  <Text className="text-ink-faint w-9 text-sm font-bold tabular-nums">{r.positionText ?? "–"}</Text>
                  <Text className="text-ink font-black w-12 tracking-wide">{r.player?.shortName ?? r.team?.shortName ?? "?"}</Text>
                  <Text className="text-ink-dim flex-1 text-[15px]" numberOfLines={1}>
                    {r.player?.name ?? r.team?.name ?? ""}
                  </Text>
                  <Text className="text-ink-faint text-xs tabular-nums mr-3">{gapText(r.gapMs, r.timeMs)}</Text>
                  <Text className="text-ink font-extrabold w-8 text-right tabular-nums">{r.points ?? ""}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* Weekend sessions */}
        {roundEvents.length > 1 ? (
          <>
            <SectionHeader title={event.round?.label ?? "Weekend"} />
            <View className="bg-surface-raised rounded-card px-4 py-1 border border-surface-border">
              {roundEvents.map((e) => (
                <SessionRow
                  key={e.id}
                  session={{ ...e, endTime: e.endTime ?? undefined }}
                  active={e.id === event.id}
                />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </>
  );
}
