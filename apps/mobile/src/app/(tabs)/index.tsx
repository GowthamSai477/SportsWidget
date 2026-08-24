import { Ionicons } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Countdown } from "../../components/countdown";
import { EventCard } from "../../components/event-card";
import { EmptyState, ErrorState, LiveDot, SectionHeader, SkeletonList } from "../../components/ui";
import { useLiveEvents, useStandings, useUpcomingEvents, useSports } from "../../hooks/queries";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** Low-frequency decorative icon cycle for the Widgets entry (spec Phase 4). */
const SPORT_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  "flag",
  "football",
  "baseball",
  "tennisball",
  "basketball",
];

function WidgetsEntry() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => (f + 1) % SPORT_ICONS.length), 3500);
    return () => clearInterval(timer);
  }, []);

  return (
    <Link href="/widgets" asChild>
      <Pressable className="flex-row items-center bg-surface-raised rounded-pill border border-surface-border pl-4 pr-5 py-2.5 active:opacity-70">
        <Text className="text-ink font-bold text-sm mr-2">Widgets</Text>
        <View className="w-8 h-8 rounded-full bg-accent/10 items-center justify-center">
          <Ionicons name={SPORT_ICONS[frame]} size={15} color="#e10600" />
        </View>
      </Pressable>
    </Link>
  );
}

/** Collapsible championship dropdown (spec Phase 5) — collapsed by default. */
function ChampionshipDropdown({
  title,
  rows,
}: {
  title: string;
  rows: { position: number; code: string; points: number }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <View className="mt-2 rounded-card border border-surface-border overflow-hidden">
      <Pressable onPress={() => setOpen(!open)} className="flex-row items-center px-3.5 py-2.5 bg-surface">
        <Ionicons name={open ? "chevron-down" : "chevron-forward"} size={14} color="#8a94a6" />
        <Text className="text-ink-dim text-[11px] font-extrabold tracking-[0.1em] uppercase ml-1.5 flex-1">
          {title}
        </Text>
        <Text className="text-ink-faint text-[10px]">top {Math.min(rows.length, 5)}</Text>
      </Pressable>
      {open
        ? rows.slice(0, 5).map((row) => (
            <View key={row.position} className="flex-row items-center px-3.5 py-1.5 border-t border-surface-border/40">
              <Text className="text-ink-faint w-6 text-xs tabular-nums">{row.position}</Text>
              <Text className="text-ink font-bold text-xs w-11">{row.code}</Text>
              <Text className="text-ink-dim text-xs ml-auto tabular-nums">{row.points} pts</Text>
            </View>
          ))
        : null}
    </View>
  );
}

function WhatNextStandings({ competitionSlug }: { competitionSlug: string }) {
  const standings = useStandings(competitionSlug);
  if (standings.isLoading || standings.isError || !standings.data) return null;
  const drivers = standings.data.tables.find((t) => t.type === "DRIVERS");
  const constructors = standings.data.tables.find((t) => t.type === "CONSTRUCTORS");
  if (!drivers && !constructors) return null;

  const toRows = (t: { rows: { position: number; code: string; points: number }[] }) =>
    t.rows.map((r) => ({ position: r.position, code: r.code, points: r.points }));

  return (
    <View className="mt-2">
      {drivers ? <ChampionshipDropdown title="Drivers championship" rows={toRows(drivers)} /> : null}
      {constructors ? <ChampionshipDropdown title="Constructors championship" rows={toRows(constructors)} /> : null}
    </View>
  );
}

function MySports() {
  const sports = useSports();
  const active = (sports.data ?? []).filter((s) => s.isActive);
  if (active.length === 0) return null;

  return (
    <View>
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
        {active.map((s) => (
          <Link key={s.slug} href={`/sports/${s.slug}`} asChild>
            <Pressable className="flex-row items-center bg-surface-raised rounded-card border border-surface-border px-4 py-3 mr-2 mb-2">
              <View className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: s.accentColor ?? "#e10600" }} />
              <Text className="text-ink font-bold">{s.name}</Text>
            </Pressable>
          </Link>
        ))}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const upcoming = useUpcomingEvents(3);
  const live = useLiveEvents();
  const next = upcoming.data?.[0];

  return (
    <>
      <Stack.Screen options={{ title: "Widgets" }} />
      <ScrollView className="flex-1 bg-surface px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="flex-row items-center justify-between mt-6">
          <View className="flex-1">
            <Text className="text-ink-faint text-sm">{greeting()}</Text>
            <Text className="text-ink text-[26px] font-black leading-8 mt-0.5">
              Your sports{"\n"}command center
            </Text>
          </View>
          <WidgetsEntry />
        </View>

        {/* WHAT'S NEXT + collapsible championships (spec Phase 5) */}
        <SectionHeader title="What's next" />
        {upcoming.isLoading ? (
          <SkeletonList count={1} height={132} />
        ) : upcoming.isError ? (
          <ErrorState onRetry={() => upcoming.refetch()} />
        ) : next ? (
          <View>
            <Link href={`/events/${next.id}`} asChild>
              <Pressable>
                <EventCard
                  event={{ ...next, accentColor: next.sport.accentColor }}
                  footer={
                    <View className="flex-row items-center justify-between mt-3">
                      <Countdown targetIso={next.startTime} />
                      <View className="flex-row items-center">
                        <Text className="text-accent font-bold text-sm">Details</Text>
                        <Ionicons name="chevron-forward" size={15} color="#e10600" />
                      </View>
                    </View>
                  }
                />
              </Pressable>
            </Link>
            <WhatNextStandings competitionSlug={next.competition.slug} />
          </View>
        ) : (
          <EmptyState icon="calendar-outline" title="Nothing scheduled yet" hint="Sync the backend to populate the calendar." />
        )}

        {/* LIVE NOW: compact bar when idle, full card when live (spec Phase 6) */}
        <SectionHeader title="Live now" />
        {live.isLoading ? (
          <View className="bg-surface-raised rounded-pill border border-surface-border px-4 py-2.5" style={{ height: 44 }} />
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
          <Link href="/(tabs)/schedule" asChild>
            <Pressable className="bg-surface-raised rounded-pill border border-surface-border px-4 py-2.5 flex-row items-center">
              <Ionicons name="radio-outline" size={14} color="#8a94a6" />
              <Text className="text-ink-dim text-sm ml-2">No live sessions</Text>
              <Ionicons name="chevron-forward" size={13} color="#6b7688" style={{ marginLeft: "auto" }} />
            </Pressable>
          </Link>
        )}

        {/* MY SPORTS (no redundant Upcoming section — schedule lives in Schedule) */}
        <MySports />
      </ScrollView>
    </>
  );
}
