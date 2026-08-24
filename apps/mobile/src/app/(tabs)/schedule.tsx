import { Ionicons } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import dayjs from "dayjs";
import { Countdown } from "../../components/countdown";
import { Chip, EmptyState, ErrorState, SkeletonList } from "../../components/ui";
import { useCompetitions, useCompetitionSchedule } from "../../hooks/queries";

type Filter = "upcoming" | "past" | "all";

const SESSION_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  RACE: "flag",
  QUALIFYING: "stopwatch",
  SPRINT_QUALIFYING: "stopwatch",
  SPRINT: "flag-outline",
  PRACTICE_1: "speedometer-outline",
  PRACTICE_2: "speedometer-outline",
  PRACTICE_3: "speedometer-outline",
  MATCH: "trophy-outline",
};

function sessionIcon(type: string): keyof typeof Ionicons.glyphMap {
  return SESSION_ICON[type] ?? "calendar-outline";
}

function sessionLabel(type: string): string {
  return SESSION_ICON[type] ? SESSION_ICON[type] === "flag" ? "Race" : type.charAt(0) + type.slice(1).toLowerCase().replace(/_/g, " ") : type.replace(/_/g, " ");
}

interface ScheduleEvent {
  id: string;
  type: string;
  name: string;
  startTime: string;
  status: string;
  round?: { number: number | null; label: string | null } | null;
}

interface GrandPrixGroup {
  key: string;
  label: string;
  events: ScheduleEvent[];
  firstStartMs: number;
  lastEndMs: number;
  nextId: string | null;
  raceEvent: ScheduleEvent | undefined;
}

export default function ScheduleScreen() {
  const competitions = useCompetitions();
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [userExpanded, setUserExpanded] = useState<string | null>(null);

  const active = selected ?? competitions.data?.find((c) => c.slug === "formula-1")?.slug ?? null;
  const schedule = useCompetitionSchedule(active ?? undefined);

  // The fetch timestamp is the pure "now" reference for past/future splits.
  const nowMs = schedule.dataUpdatedAt;

  const allEvents = useMemo(() => {
    const items = schedule.data?.items;
    return Array.isArray(items) ? items : [];
  }, [schedule.data]);

  const filtered = useMemo(() => {
    if (filter === "all" || nowMs === 0) return allEvents;
    return allEvents.filter((e) =>
      filter === "upcoming"
        ? new Date(e.startTime).getTime() >= nowMs && e.status !== "FINISHED" && e.status !== "CANCELLED"
        : new Date(e.startTime).getTime() < nowMs || e.status === "FINISHED",
    );
  }, [allEvents, filter, nowMs]);

  const groups = useMemo<GrandPrixGroup[]>(() => {
    const index = new Map<string, number>();
    const out: GrandPrixGroup[] = [];
    for (const e of filtered) {
      const key = e.round?.label ?? "Sessions";
      if (!index.has(key)) {
        index.set(key, out.length);
        out.push({
          key,
          label: key,
          events: [],
          firstStartMs: Number.MAX_SAFE_INTEGER,
          lastEndMs: 0,
          nextId: null,
          raceEvent: undefined,
        });
      }
      const group = out[index.get(key)!];
      group.events.push(e);
      const t = new Date(e.startTime).getTime();
      group.firstStartMs = Math.min(group.firstStartMs, t);
      group.lastEndMs = Math.max(group.lastEndMs, t + 2 * 3600_000);
      if (e.type === "RACE") group.raceEvent = e;
    }
    for (const group of out) {
      group.events.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      const next = group.events.find(
        (e) =>
          new Date(e.startTime).getTime() > nowMs &&
          e.status !== "FINISHED" &&
          e.status !== "CANCELLED" &&
          e.status !== "POSTPONED",
      );
      group.nextId = next?.id ?? null;
    }
    out.sort((a, b) => a.firstStartMs - b.firstStartMs);
    return out;
  }, [filtered, nowMs]);

  const nextGroup = useMemo(() => groups.find((g) => g.nextId !== null) ?? null, [groups]);
  const defaultExpanded = nextGroup?.key ?? groups[groups.length - 1]?.key ?? null;
  const expandedKey = userExpanded ?? (filter === "past" ? null : defaultExpanded);

  const nextEvent = nextGroup && nextGroup.nextId ? nextGroup.events.find((e) => e.id === nextGroup.nextId) : null;

  const dateRange = (group: GrandPrixGroup): string => {
    const start = dayjs(group.firstStartMs);
    const end = dayjs(group.lastEndMs);
    if (start.isSame(end, "day")) return start.format("D MMM YYYY");
    if (start.isSame(end, "month")) return `${start.format("D")}–${end.format("D MMM YYYY")}`;
    return `${start.format("D MMM")} – ${end.format("D MMM YYYY")}`;
  };

  return (
    <>
      <Stack.Screen options={{ title: "Schedule" }} />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-4 pt-3">
          {competitions.isLoading ? (
            <SkeletonList count={1} height={48} />
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

          {/* Upcoming | Past | All */}
          <View className="flex-row mt-3 rounded-pill bg-surface-raised border border-surface-border p-1">
            {(["upcoming", "past", "all"] as Filter[]).map((f) => (
              <Pressable
                key={f}
                onPress={() => {
                  setFilter(f);
                  setUserExpanded(null);
                }}
                className={`flex-1 rounded-pill py-2 ${filter === f ? "bg-accent" : ""}`}
              >
                <Text
                  className={`text-center text-sm font-bold capitalize ${
                    filter === f ? "text-white" : "text-ink-dim"
                  }`}
                >
                  {f}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* NEXT UP hero */}
        {filter !== "past" && nextEvent && nextGroup ? (
          <View className="px-4 mt-4">
            <View className="bg-surface-raised rounded-card border border-surface-border overflow-hidden">
              <View className="px-4 py-2 flex-row items-center" style={{ backgroundColor: "#e10600" }}>
                <Text className="text-white text-[10px] font-extrabold tracking-[0.12em] uppercase">Next up</Text>
              </View>
              <View className="p-4">
                <Text className="text-ink text-lg font-black leading-6">{nextGroup.label}</Text>
                <View className="flex-row items-center justify-between mt-1.5">
                  <View className="flex-row items-center">
                    <Ionicons name={sessionIcon(nextEvent.type)} size={13} color="#9aa5b5" />
                    <Text className="text-ink-dim text-sm ml-1.5">
                      {nextEvent.type.replace(/_/g, " ")} · {dayjs(nextEvent.startTime).format("ddd d MMM · HH:mm")}
                    </Text>
                  </View>
                  <Pressable
                    hitSlop={6}
                    onPress={() => {
                      setFilter("upcoming");
                      setUserExpanded(nextGroup.key);
                    }}
                    className="flex-row items-center"
                  >
                    <Text className="text-accent font-bold text-sm">View weekend</Text>
                    <Ionicons name="chevron-forward" size={14} color="#e10600" />
                  </Pressable>
                </View>
                <View className="flex-row items-center mt-3 bg-surface rounded-pill px-3 py-1.5 self-start">
                  <Ionicons name="hourglass-outline" size={13} color="#e10600" />
                  <View className="ml-1.5">
                    <Countdown targetIso={nextEvent.startTime} compact />
                  </View>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* Grand Prix groups */}
        <View className="px-4 mt-4">
          {schedule.isLoading ? (
            <SkeletonList count={4} height={72} />
          ) : schedule.isError ? (
            <ErrorState onRetry={() => schedule.refetch()} />
          ) : groups.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title={filter === "past" ? "No past sessions" : "No upcoming sessions"}
              hint={
                filter === "past"
                  ? "Finished weekends will appear here."
                  : "Run the backend sync to populate the calendar, then retry."
              }
            />
          ) : (
            groups.map((group) => {
              const expanded = expandedKey === group.key;
              const isNext = group.nextId !== null;
              return (
                <View
                  key={group.key}
                  className={`bg-surface-raised rounded-card border mb-3 overflow-hidden ${
                    isNext && filter !== "past" ? "border-accent/60" : "border-surface-border"
                  }`}
                >
                  <Pressable
                    onPress={() => setUserExpanded(expanded ? null : group.key)}
                    className="flex-row items-center px-4 py-3.5"
                  >
                    <View className="flex-1">
                      <View className="flex-row items-center">
                        {isNext && filter !== "past" ? <View className="w-1.5 h-1.5 rounded-full bg-accent mr-2" /> : null}
                        <Text className="text-ink font-extrabold text-[15px]" numberOfLines={1}>
                          {group.label}
                        </Text>
                      </View>
                      <Text className="text-ink-dim text-xs mt-0.5">
                        {dateRange(group)}
                        {expanded
                          ? ` · ${group.events.length} sessions`
                          : group.raceEvent
                            ? ` · Race ${dayjs(group.raceEvent.startTime).format("ddd HH:mm")}`
                            : ""}
                      </Text>
                    </View>
                    <Ionicons
                      name={expanded ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#8a94a6"
                    />
                  </Pressable>

                  {expanded ? (
                    <View className="px-4 pb-2 border-t border-surface-border/50">
                      {group.events.map((e) => {
                        const isRace = e.type === "RACE";
                        return (
                          <Link key={e.id} href={`/events/${e.id}`} asChild>
                            <Pressable className="flex-row items-center py-2.5 border-b border-surface-border/40 last:border-b-0">
                              <Ionicons
                                name={sessionIcon(e.type)}
                                size={14}
                                color={isRace ? "#e10600" : "#8a94a6"}
                              />
                              <Text
                                className={`flex-1 ml-2.5 text-[14px] ${isRace ? "text-ink font-extrabold" : "text-ink-dim"}`}
                              >
                                {sessionLabel(e.type)}
                              </Text>
                              {e.status === "FINISHED" ? (
                                <Text className="text-ink-faint text-xs mr-2">FT</Text>
                              ) : null}
                              <Text className={`text-sm tabular-nums ${isRace ? "text-ink font-bold" : "text-ink-dim"}`}>
                                {dayjs(e.startTime).format("ddd HH:mm")}
                              </Text>
                            </Pressable>
                          </Link>
                        );
                      })}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </>
  );
}
