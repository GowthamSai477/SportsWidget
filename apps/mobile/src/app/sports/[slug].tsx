import { Ionicons } from "@expo/vector-icons";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Countdown } from "../../components/countdown";
import { EmptyState, SectionHeader, SkeletonList } from "../../components/ui";
import { useStandings, useUpcomingEvents } from "../../hooks/queries";

function StandingsTable({
  rows,
}: {
  rows: { position: number; code: string; name: string; points: number; wins: number | null; gapToLeader: number | null; isTeam: boolean }[];
}) {
  return (
    <View className="bg-surface-raised rounded-card border border-surface-border overflow-hidden">
      {rows.map((row, idx) => (
        <View
          key={`${row.position}-${row.code}`}
          className={`flex-row items-center px-4 py-3 ${idx < rows.length - 1 ? "border-b border-surface-border/50" : ""}`}
        >
          <Text className="text-ink-faint w-7 text-sm font-bold tabular-nums">{row.position}</Text>
          <View className="w-12">
            <Text className="text-ink font-black text-sm tracking-wide">{row.code}</Text>
          </View>
          <Text className="text-ink-dim flex-1 text-[15px]" numberOfLines={1}>
            {row.name}
          </Text>
          {row.wins ? <Text className="text-ink-faint text-xs mr-3">{row.wins}W</Text> : null}
          <Text className="text-ink font-extrabold text-sm tabular-nums">{row.points}</Text>
          <Text className="text-ink-faint w-16 text-right text-xs tabular-nums">
            {row.gapToLeader ? `+${row.gapToLeader}` : "—"}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function CompetitionScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const upcoming = useUpcomingEvents(20);
  const standings = useStandings(slug);

  const competitionEvents = (upcoming.data ?? []).filter((e) => e.competition.slug === slug);
  const next = competitionEvents.find((e) => e.status !== "FINISHED");
  const accent = next?.sport.accentColor ?? "#e10600";
  const drivers = standings.data?.tables.find((t) => t.type === "DRIVERS") ?? standings.data?.tables[0];
  const constructors = standings.data?.tables.find((t) => t.type === "CONSTRUCTORS");

  return (
    <>
      <Stack.Screen options={{ title: next?.competition.name ?? "Competition" }} />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Next session hero */}
        <View className="rounded-card mt-4 overflow-hidden border border-surface-border bg-surface-raised">
          <View className="px-4 py-2 flex-row items-center" style={{ backgroundColor: accent }}>
            <Ionicons name="flag" size={13} color="#fff" />
            <Text className="text-white text-[11px] font-extrabold tracking-[0.1em] uppercase ml-1.5">Next session</Text>
          </View>
          <View className="p-4">
            {next ? (
              <>
                <Text className="text-ink text-xl font-black leading-7">{next.name}</Text>
                <View className="flex-row items-center justify-between mt-3">
                  <Countdown targetIso={next.startTime} />
                  <Link href={`/events/${next.id}`} asChild>
                    <Pressable hitSlop={8} className="flex-row items-center">
                      <Text className="font-bold text-sm" style={{ color: accent }}>
                        Details
                      </Text>
                      <Ionicons name="chevron-forward" size={15} color={accent} />
                    </Pressable>
                  </Link>
                </View>
                <Text className="text-ink-dim text-sm mt-2">
                  {new Date(next.startTime).toLocaleString(undefined, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {next.venue?.country ? ` · ${next.venue.country}` : ""}
                </Text>
              </>
            ) : (
              <Text className="text-ink-dim">No scheduled sessions — check back after the next sync.</Text>
            )}
          </View>
        </View>

        {/* Widgets CTA */}
        <SectionHeader title="Widgets" />
        <Link href="/widgets" asChild>
          <Pressable className="rounded-card p-4 flex-row items-center border" style={{ backgroundColor: accent + "14", borderColor: accent + "44" }}>
            <Ionicons name="grid-outline" size={20} color={accent} />
            <View className="flex-1 ml-3">
              <Text className="text-ink font-bold">Add a home-screen widget</Text>
              <Text className="text-ink-dim text-xs mt-0.5">Countdown, weekend schedule and standings without opening the app.</Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color="#8a94a6" />
          </Pressable>
        </Link>

        {/* Standings */}
        <SectionHeader title="Championship" />
        {standings.isLoading ? (
          <SkeletonList count={2} height={200} />
        ) : standings.isError ? (
          <EmptyState icon="podium-outline" title="Standings not synced yet" hint="They appear once the backend pulls the latest round." />
        ) : (
          <>
            {drivers ? (
              <>
                <Text className="text-ink-dim text-xs font-bold uppercase tracking-wider mb-2">{drivers.name}</Text>
                <StandingsTable rows={drivers.rows.slice(0, 10)} />
              </>
            ) : null}
            {constructors ? (
              <>
                <Text className="text-ink-dim text-xs font-bold uppercase tracking-wider mt-4 mb-2">{constructors.name}</Text>
                <StandingsTable rows={constructors.rows} />
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </>
  );
}
