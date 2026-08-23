import { Text, View } from "react-native";
import dayjs from "dayjs";
import type { EventStatus, EventLite } from "@widgets/shared";

export function formatEventTime(iso: string): string {
  return dayjs(iso).format("ddd D MMM · HH:mm");
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
}

export function EventCard({ event, footer }: { event: EventCardData; footer?: React.ReactNode }) {
  return (
    <View className="bg-surface-raised rounded-card p-4 mb-3 border border-surface-border">
      <View className="flex-row items-center justify-between">
        <Text className="text-ink-dim text-xs font-semibold tracking-wider uppercase">{event.type.replace(/_/g, " ")}</Text>
        {event.competitionName ? <Text className="text-ink-faint text-xs">{event.competitionName}</Text> : null}
      </View>
      <Text className="text-ink text-base font-bold mt-1" numberOfLines={2}>
        {event.name}
      </Text>
      <View className="flex-row items-center justify-between mt-2">
        <Text className="text-ink-dim text-sm">{formatEventTime(event.startTime)}</Text>
        {event.venue?.country ? <Text className="text-ink-faint text-xs">{event.venue.country}</Text> : null}
      </View>
      {footer ?? null}
    </View>
  );
}

/** Widget-payload flavored card (EventLite) reused on widget screens. */
export function SessionRow({ session }: { session: EventLite }) {
  return (
    <View className="flex-row items-center justify-between py-2 border-b border-surface-border/60">
      <Text className="text-ink flex-1" numberOfLines={1}>
        {session.name}
      </Text>
      <Text className="text-ink-dim text-sm ml-2">{formatEventTime(session.startTime)}</Text>
    </View>
  );
}
