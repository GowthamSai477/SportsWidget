import { Ionicons } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import { Pressable, ScrollView, Text, View, useColorScheme } from "react-native";
import { Countdown } from "../../components/countdown";
import { EventCard } from "../../components/event-card";
import { EmptyState, ErrorState, LiveDot, SectionHeader, SkeletonList } from "../../components/ui";
import { useLiveEvents, useSports, useUpcomingEvents } from "../../hooks/queries";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const scheme = useColorScheme();
  const dark = scheme !== "light";
  const upcoming = useUpcomingEvents(8);
  const live = useLiveEvents();
  const sports = useSports();
  const next = upcoming.data?.[0];
  const activeSports = (sports.data ?? []).filter((s) => s.isActive);

  return (
    <>
      <Stack.Screen options={{ title: "Widgets" }} />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="flex-row items-center justify-between mt-6">
          <View className="flex-1">
            <Text className="text-ink-faint text-sm">{greeting()}</Text>
            <Text className={`${dark ? "text-ink" : "text-ink"} text-[26px] font-black leading-8 mt-0.5`}>
              Your sports{"\n"}command center
            </Text>
          </View>
          <Link href="/widgets" asChild>
            <Pressable className="w-11 h-11 rounded-full bg-surface-raised border border-surface-border items-center justify-center">
              <Ionicons name="apps-outline" size={20} color={dark ? "#f2f5fa" : "#0c111b"} />
            </Pressable>
          </Link>
        </View>

        {/* WHAT'S NEXT — hero */}
        <SectionHeader title="What's next" />
        {upcoming.isLoading ? (
          <SkeletonList count={1} height={132} />
        ) : upcoming.isError ? (
          <ErrorState onRetry={() => upcoming.refetch()} />
        ) : next ? (
          <View className="bg-surface-raised rounded-card border border-surface-border overflow-hidden">
            <View className="p-4 pb-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="rounded-pill bg-accent px-2.5 py-1">
                    <Text className="text-white text-[10px] font-extrabold tracking-wider">NEXT</Text>
                  </View>
                  <Text className="text-ink-dim text-[11px] font-bold uppercase tracking-wider ml-2">
                    {next.type.replace(/_/g, " ")}
                  </Text>
                </View>
                <Text className="text-ink-faint text-xs">{next.competition.name}</Text>
              </View>
              <Text className="text-ink text-xl font-black mt-2 leading-7" numberOfLines={2}>
                {next.name}
              </Text>
              <View className="flex-row items-center justify-between mt-3">
                <Countdown targetIso={next.startTime} />
                <Link href={`/events/${next.id}`} asChild>
                  <Pressable hitSlop={8} className="flex-row items-center">
                    <Text className="text-accent font-bold text-sm">Details</Text>
                    <Ionicons name="chevron-forward" size={15} color="#e10600" />
                  </Pressable>
                </Link>
              </View>
            </View>
            <View className="px-4 py-2.5 bg-surface border-t border-surface-border flex-row items-center">
              <Ionicons name="time-outline" size={14} color="#9aa5b5" />
              <Text className="text-ink-dim text-sm ml-1.5">
                {new Date(next.startTime).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </Text>
              {next.venue?.country ? (
                <Text className="text-ink-faint text-xs ml-auto">{next.venue.country}</Text>
              ) : null}
            </View>
          </View>
        ) : (
          <EmptyState icon="calendar-outline" title="Nothing scheduled yet" hint="Sync the backend to populate the calendar." />
        )}

        {/* LIVE NOW */}
        <SectionHeader title="Live now" />
        {live.isLoading ? (
          <SkeletonList count={1} height={110} />
        ) : live.data && live.data.length > 0 ? (
          live.data.map((e) => (
            <Link key={e.id} href={`/events/${e.id}`} asChild>
              <Pressable>
                <EventCard
                  event={{ ...e, accentColor: e.sport.accentColor }}
                  footer={
                    <View className="flex-row items-center justify-between mt-2">
                      <LiveDot />
                      {e.statusDetail ? <Text className="text-accent-live text-xs font-semibold">{e.statusDetail}</Text> : null}
                    </View>
                  }
                />
              </Pressable>
            </Link>
          ))
        ) : (
          <EmptyState
            icon="radio-outline"
            title="No live events right now"
            hint="We'll automatically show live sessions here the moment they start."
          />
        )}

        {/* MY SPORTS */}
        <SectionHeader
          title="My sports"
          action={
            <Link href="/(tabs)/sports" asChild>
              <Pressable hitSlop={8} className="flex-row items-center">
                <Text className="text-accent font-bold text-sm">All</Text>
                <Ionicons name="chevron-forward" size={15} color="#e10600" />
              </Pressable>
            </Link>
          }
        />
        <View className="flex-row flex-wrap">
          {activeSports.map((s) => (
            <Link key={s.slug} href={`/sports/${s.slug}`} asChild>
              <Pressable className="flex-row items-center bg-surface-raised rounded-card border border-surface-border px-4 py-3 mr-2 mb-2">
                <View className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: s.accentColor ?? "#e10600" }} />
                <Text className="text-ink font-bold">{s.name}</Text>
              </Pressable>
            </Link>
          ))}
        </View>

        {/* UPCOMING */}
        <SectionHeader title="Upcoming" />
        {upcoming.isLoading ? (
          <SkeletonList count={2} />
        ) : upcoming.data && upcoming.data.length > 1 ? (
          upcoming.data.slice(1, 6).map((e) => (
            <Link key={e.id} href={`/events/${e.id}`} asChild>
              <Pressable>
                <EventCard event={{ ...e, accentColor: e.sport.accentColor, competitionName: e.competition.name }} />
              </Pressable>
            </Link>
          ))
        ) : upcoming.data && upcoming.data.length <= 1 ? (
          <EmptyState icon="calendar-outline" title="More events coming" hint="New sessions appear here after each sync." />
        ) : null}
      </ScrollView>
    </>
  );
}
