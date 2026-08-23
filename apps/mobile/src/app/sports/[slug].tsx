import { Link, Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { Countdown } from "../../components/countdown";
import { EmptyState, SectionHeader } from "../../components/ui";
import { useStandings, useUpcomingEvents } from "../../hooks/queries";

export default function CompetitionScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const upcoming = useUpcomingEvents(6);
  const standings = useStandings(slug);

  const next = (upcoming.data ?? []).find((e) => e.competition.slug === slug && e.status !== "FINISHED");
  const drivers = standings.data?.tables.find((t) => t.type === "DRIVERS") ?? standings.data?.tables[0];
  const constructors = standings.data?.tables.find((t) => t.type === "CONSTRUCTORS");

  return (
    <>
      <Stack.Screen options={{ title: next?.competition.name ?? "Competition" }} />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Next event hero */}
        <View className="bg-surface-raised rounded-card p-5 mt-4 border border-surface-border">
          <Text className="text-ink-dim text-xs font-bold tracking-widest uppercase">Next session</Text>
          {next ? (
            <>
              <Text className="text-ink text-xl font-extrabold mt-1">{next.name}</Text>
              <Text className="text-ink-dim mt-1">{new Date(next.startTime).toLocaleString()}</Text>
              <View className="mt-3 flex-row items-center justify-between">
                <Countdown targetIso={next.startTime} />
                <Link href={`/events/${next.id}`} asChild>
                  <Text className="text-accent font-semibold">Details ›</Text>
                </Link>
              </View>
            </>
          ) : (
            <Text className="text-ink-dim mt-2">No scheduled sessions — check back after the next sync.</Text>
          )}
        </View>

        {/* Widgets entry point (spec section 55) */}
        <SectionHeader
          title="Widgets"
          action={
            <Link href="/widgets" asChild>
              <Text className="text-accent font-semibold">Manage ›</Text>
            </Link>
          }
        />
        <Link href="/widgets" asChild>
          <View className="bg-accent/10 border border-accent/30 rounded-card p-4">
            <Text className="text-ink font-bold">Add a home-screen widget</Text>
            <Text className="text-ink-dim text-sm mt-0.5">Next race countdown, weekend schedule and live standings — without opening the app.</Text>
          </View>
        </Link>

        {/* Standings */}
        <SectionHeader title="Championship" />
        {standings.isLoading || !drivers ? (
          <EmptyState icon="📊" title="Standings not synced yet" />
        ) : (
          <>
            <View className="bg-surface-raised rounded-card border border-surface-border overflow-hidden">
              {drivers.rows.slice(0, 10).map((row) => (
                <View key={`${row.position}-${row.code}`} className="flex-row items-center px-4 py-2.5 border-b border-surface-border/50">
                  <Text className="text-ink-faint w-7">{row.position}</Text>
                  <Text className="text-ink font-bold w-12">{row.code}</Text>
                  <Text className="text-ink-dim flex-1" numberOfLines={1}>{row.name}</Text>
                  <Text className="text-ink font-semibold tabular-nums">{row.points}</Text>
                  {row.gapToLeader !== null && row.gapToLeader > 0 ? (
                    <Text className="text-ink-faint w-14 text-right text-xs tabular-nums">+{row.gapToLeader}</Text>
                  ) : (
                    <Text className="w-14" />
                  )}
                </View>
              ))}
            </View>

            {constructors ? (
              <View className="bg-surface-raised rounded-card border border-surface-border overflow-hidden mt-3">
                {constructors.rows.map((row) => (
                  <View key={`${row.position}-${row.code}`} className="flex-row items-center px-4 py-2.5 border-b border-surface-border/50">
                    <Text className="text-ink-faint w-7">{row.position}</Text>
                    <Text className="text-ink font-bold w-12">{row.code}</Text>
                    <Text className="text-ink-dim flex-1" numberOfLines={1}>{row.name}</Text>
                    <Text className="text-ink font-semibold tabular-nums">{row.points}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </>
  );
}
