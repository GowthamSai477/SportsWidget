import { Ionicons } from "@expo/vector-icons";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Countdown } from "../../components/countdown";
import { EmptyState, SectionHeader, SkeletonList } from "../../components/ui";
import { useCompetitionTeams, useStandings, useUpcomingEvents } from "../../hooks/queries";

const TEAM_PALETTE = ["#00d2be", "#27f4d2", "#e8002d", "#6692ff", "#b6babd", "#2b4562", "#0090cc", "#5e8faa", "#229971", "#64c4ff", "#667181"];

function teamColor(seed: string): string {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TEAM_PALETTE[hash % TEAM_PALETTE.length];
}

function Monogram({ label, color }: { label: string; color: string }) {
  return (
    <View className="w-10 h-10 rounded-full items-center justify-center mr-3" style={{ backgroundColor: color + "26" }}>
      <Text className="text-xs font-black" style={{ color }}>
        {label.slice(0, 3).toUpperCase()}
      </Text>
    </View>
  );
}

export default function CompetitionScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const upcoming = useUpcomingEvents(20);
  const standings = useStandings(slug);
  const teams = useCompetitionTeams(slug);
  const [showAllDrivers, setShowAllDrivers] = useState(false);

  const competitionEvents = (upcoming.data ?? []).filter((e) => e.competition.slug === slug);
  const next = competitionEvents.find((e) => e.status !== "FINISHED");
  const accent = next?.sport.accentColor ?? "#e10600";
  const drivers = standings.data?.tables.find((t) => t.type === "DRIVERS");
  const constructors = standings.data?.tables.find((t) => t.type === "CONSTRUCTORS");
  const visibleDrivers = drivers ? (showAllDrivers ? drivers.rows : drivers.rows.slice(0, 10)) : [];

  return (
    <>
      <Stack.Screen options={{ title: next?.competition.name ?? "Competition" }} />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Next session hero */}
        <View className="mx-4 rounded-card mt-4 overflow-hidden border border-surface-border bg-surface-raised">
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
          <Pressable className="mx-4 rounded-card p-4 flex-row items-center border" style={{ backgroundColor: accent + "14", borderColor: accent + "44" }}>
            <Ionicons name="grid-outline" size={20} color={accent} />
            <View className="flex-1 ml-3">
              <Text className="text-ink font-bold">Add a home-screen widget</Text>
              <Text className="text-ink-dim text-xs mt-0.5">Countdown, weekend schedule and standings without opening the app.</Text>
            </View>
            <Ionicons name="chevron-forward" size={15} color="#8a94a6" />
          </Pressable>
        </Link>

        {/* TEAMS + DRIVERS (spec Phases 14-15) */}
        <SectionHeader title="Teams & drivers" />
        {teams.isLoading ? (
          <SkeletonList count={3} height={72} />
        ) : teams.isError || !teams.data ? (
          <EmptyState icon="people-outline" title="Teams not synced yet" hint="They appear once the season data syncs." />
        ) : (
          <View className="mx-4">
            {teams.data.map((team) => {
              const color = teamColor(team.slug);
              return (
                <View key={team.id} className="bg-surface-raised rounded-card border border-surface-border p-4 mb-2">
                  <View className="flex-row items-center">
                    <Monogram label={team.shortName ?? team.name} color={color} />
                    <View className="flex-1">
                      <Text className="text-ink font-extrabold text-base">{team.name}</Text>
                      <Text className="text-ink-faint text-xs mt-0.5">
                        {team.championship ? `P${team.championship.position} · ${team.championship.points} pts` : "Championship pending"}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row mt-3">
                    {team.drivers.map((d) => (
                      <View key={d.id} className="flex-1 flex-row items-center bg-surface rounded-pill px-2.5 py-1.5 mr-1">
                        <Text className="text-ink font-black text-[11px]">{d.shortName ?? "???"}</Text>
                        {d.championship ? (
                          <Text className="text-ink-faint text-[10px] ml-auto tabular-nums">{d.championship.points}</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* DRIVERS CHAMPIONSHIP: top 10 + View all (spec Phase 8) */}
        <SectionHeader title="Drivers championship" />
        {standings.isLoading || !drivers ? (
          <SkeletonList count={1} height={200} />
        ) : (
          <View className="mx-4">
            <View className="bg-surface-raised rounded-card border border-surface-border overflow-hidden">
              {visibleDrivers.map((row, idx) => (
                <View
                  key={`${row.position}-${row.code}`}
                  className={`flex-row items-center px-4 py-3 ${idx < visibleDrivers.length - 1 ? "border-b border-surface-border/50" : ""}`}
                >
                  <Text className="text-ink-faint w-7 text-sm font-bold tabular-nums">{row.position}</Text>
                  <Text className="text-ink font-black text-sm w-12 tracking-wide">{row.code}</Text>
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
            {drivers.rows.length > 10 ? (
              <Pressable
                onPress={() => setShowAllDrivers(!showAllDrivers)}
                className="mt-2 rounded-pill border border-surface-border bg-surface-raised py-2.5 items-center flex-row justify-center"
              >
                <Ionicons name={showAllDrivers ? "chevron-up" : "chevron-down"} size={14} color="#e10600" />
                <Text className="text-accent font-bold text-sm ml-1.5">
                  {showAllDrivers ? "Show top 10" : `View all ${drivers.rows.length} drivers`}
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {/* CONSTRUCTORS */}
        <SectionHeader title="Constructors championship" />
        {constructors ? (
          <View className="mx-4 bg-surface-raised rounded-card border border-surface-border overflow-hidden">
            {constructors.rows.map((row, idx) => (
              <View
                key={`${row.position}-${row.code}`}
                className={`flex-row items-center px-4 py-3 ${idx < constructors.rows.length - 1 ? "border-b border-surface-border/50" : ""}`}
              >
                <Text className="text-ink-faint w-7 text-sm font-bold tabular-nums">{row.position}</Text>
                <Text className="text-ink font-black text-sm w-12 tracking-wide">{row.code}</Text>
                <Text className="text-ink-dim flex-1 text-[15px]" numberOfLines={1}>
                  {row.name}
                </Text>
                {row.wins ? <Text className="text-ink-faint text-xs mr-3">{row.wins}W</Text> : null}
                <Text className="text-ink font-extrabold text-sm tabular-nums">{row.points}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}
