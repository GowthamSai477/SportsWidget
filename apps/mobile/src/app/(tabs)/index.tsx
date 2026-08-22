import { Link, Stack } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { Countdown } from "../../components/countdown";
import { EventCard } from "../../components/event-card";
import { EmptyState, SectionHeader, SkeletonRow } from "../../components/ui";
import { useLiveEvents, useUpcomingEvents } from "../../hooks/queries";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const upcoming = useUpcomingEvents(8);
  const live = useLiveEvents();
  const next = upcoming.data?.[0];

  return (
    <>
      <Stack.Screen options={{ title: "Widgets" }} />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-ink-faint text-sm mt-6">{greeting()}</Text>
        <Text className="text-ink text-2xl font-extrabold">Your sports command center</Text>

        {/* What's happening now (spec section 77) */}
        <SectionHeader title="Live now" />
        {live.isLoading ? (
          <SkeletonRow />
        ) : live.data && live.data.length > 0 ? (
          live.data.map((e) => (
            <Link key={e.id} href={`/events/${e.id}`} asChild>
              <EventCard event={{ ...e, competitionName: e.competition.name }} />
            </Link>
          ))
        ) : (
          <EmptyState icon="🏁" title="Nothing live right now" hint="Live sessions will appear here automatically." />
        )}

        {/* What's next */}
        <SectionHeader
          title="What's next"
          action={
            next ? (
              <View className="items-end">
                <Countdown targetIso={next.startTime} />
              </View>
            ) : undefined
          }
        />
        {upcoming.isLoading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : upcoming.data && upcoming.data.length > 0 ? (
          upcoming.data.slice(0, 6).map((e) => (
            <Link key={e.id} href={`/events/${e.id}`} asChild>
              <EventCard event={{ ...e, competitionName: e.competition.name }} />
            </Link>
          ))
        ) : (
          <EmptyState icon="📅" title="No upcoming events synced yet" hint="Pull to refresh once the backend sync completes." />
        )}
      </ScrollView>
    </>
  );
}
