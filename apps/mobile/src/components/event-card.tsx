import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import dayjs from "dayjs";
import type { EventStatus } from "@widgets/shared";

export function formatEventTime(iso: string): string {
  return dayjs(iso).format("ddd D MMM · HH:mm");
}

const SESSION_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  RACE: { label: "Race", icon: "flag" },
  QUALIFYING: { label: "Qualifying", icon: "stopwatch" },
  SPRINT_QUALIFYING: { label: "Sprint Qualifying", icon: "stopwatch" },
  SPRINT: { label: "Sprint", icon: "flag-outline" },
  PRACTICE_1: { label: "Practice 1", icon: "speedometer-outline" },
  PRACTICE_2: { label: "Practice 2", icon: "speedometer-outline" },
  MATCH: { label: "Match", icon: "trophy-outline" },
};

function sessionIcon(type: string): keyof typeof Ionicons.glyphMap {
  return SESSION_META[type]?.icon ?? "calendar-outline";
}

function sessionLabel(type: string): string {
  return SESSION_META[type]?.label ?? type.replace(/_/g, " ");
}

export interface EventCardData {
  id: string;
  type: string;
  name: string;
  startTime: string;
  status: EventStatus;
  statusDetail?: string | null;
  venue?: { city?: string | null; country?: string | null } | null | undefined;
  competitionName?: string;
  accentColor?: string | null;
}

/**
 * Premium event card: sport accent edge, icon chip, typography hierarchy.
 * `footer` slot is used by screens for countdowns or status lines.
 */
export function EventCard({
  event,
  footer,
  onPress,
}: {
  event: EventCardData;
  footer?: React.ReactNode;
  onPress?: () => void;
}) {
  const accent = event.accentColor ?? "#e10600";
  return (
    <View
      className="bg-surface-raised rounded-card border border-surface-border mb-3 overflow-hidden flex-row"
      style={onPress ? undefined : undefined}
    >
      <View style={{ width: 4, backgroundColor: accent }} />
      <View className="flex-1 p-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Ionicons name={sessionIcon(event.type)} size={13} color="#9aa5b5" />
            <Text className="text-ink-dim text-[11px] font-bold tracking-[0.08em] uppercase ml-1.5">
              {sessionLabel(event.type)}
            </Text>
          </View>
          <Text className="text-ink-faint text-xs">{event.competitionName}</Text>
        </View>

        <Text className="text-ink text-[17px] font-extrabold mt-1.5 leading-6" numberOfLines={2}>
          {event.name}
        </Text>

        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-ink-dim text-sm font-medium">{formatEventTime(event.startTime)}</Text>
          {event.venue?.country ? <Text className="text-ink-faint text-xs">{event.venue.country}</Text> : null}
        </View>
        {footer ?? null}
      </View>
    </View>
  );
}

/** Weekend/session row used in detail screens. */
export function SessionRow({
  session,
  active,
}: {
  session: {
    id: string;
    name: string;
    startTime: string;
    type?: string;
    endTime?: string | null;
    status?: EventStatus;
  };
  active?: boolean;
}) {
  return (
    <View className="flex-row items-center py-3 border-b border-surface-border/50 last:border-b-0">
      <Ionicons
        name={sessionIcon(session.type ?? "")}
        size={15}
        color={active ? "#e10600" : "#8a94a6"}
      />
      <Text className={`flex-1 ml-3 text-[15px] ${active ? "text-ink font-bold" : "text-ink-dim"}`} numberOfLines={1}>
        {session.name.split(" — ").pop()}
      </Text>
      <Text className="text-ink-dim text-sm tabular-nums">{dayjs(session.startTime).format("ddd HH:mm")}</Text>
    </View>
  );
}
