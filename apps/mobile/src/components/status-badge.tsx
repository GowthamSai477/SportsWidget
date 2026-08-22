import { Text, View } from "react-native";
import type { EventStatus } from "@widgets/shared";

const STYLES: Record<EventStatus, { label: string; bg: string; fg: string }> = {
  LIVE: { label: "LIVE", bg: "bg-accent-live", fg: "text-black" },
  PAUSED: { label: "PAUSED", bg: "bg-accent-warn", fg: "text-black" },
  FINISHED: { label: "FT", bg: "bg-surface-border", fg: "text-ink-dim" },
  POSTPONED: { label: "POSTPONED", bg: "bg-accent-warn/20", fg: "text-accent-warn" },
  CANCELLED: { label: "CANCELLED", bg: "bg-surface-border", fg: "text-ink-faint" },
  DELAYED: { label: "DELAYED", bg: "bg-accent-warn/20", fg: "text-accent-warn" },
  SCHEDULED: { label: "UPCOMING", bg: "bg-transparent border border-surface-border", fg: "text-ink-dim" },
  CONFIRMED: { label: "CONFIRMED", bg: "bg-transparent border border-surface-border", fg: "text-ink-dim" },
  TBC: { label: "TBC", bg: "bg-transparent border border-surface-border", fg: "text-ink-faint" },
};

export function StatusBadge({ status }: { status: EventStatus }) {
  const s = STYLES[status];
  return (
    <View className={`rounded-pill px-2 py-0.5 ${s.bg}`}>
      <Text className={`text-[10px] font-bold tracking-widest ${s.fg}`}>{s.label}</Text>
    </View>
  );
}
