import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { currentBaseUrl } from "../api/base-url";
import type { ComponentProps } from "react";

type IconName = ComponentProps<typeof Ionicons>["name"];

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View className="flex-row items-center justify-between mt-6 mb-3">
      <Text className="text-ink text-[13px] font-extrabold tracking-[0.12em] uppercase">{title}</Text>
      {action}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: IconName;
  title: string;
  hint?: string;
}) {
  return (
    <View className="items-center justify-center rounded-card bg-surface-raised border border-surface-border py-10 px-6">
      <View className="w-14 h-14 rounded-full bg-surface items-center justify-center border border-surface-border">
        <Ionicons name={icon} size={26} color="#e10600" />
      </View>
      <Text className="text-ink text-base font-bold mt-4">{title}</Text>
      {hint ? <Text className="text-ink-dim text-sm text-center mt-1 leading-5">{hint}</Text> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View className="items-center justify-center rounded-card bg-surface-raised border border-surface-border py-10 px-6">
      <View className="w-14 h-14 rounded-full bg-accent/10 items-center justify-center">
        <Ionicons name="cloud-offline-outline" size={26} color="#e10600" />
      </View>
      <Text className="text-ink text-base font-bold mt-4">Unable to load</Text>
      <Text className="text-ink-dim text-sm text-center mt-1 leading-5" numberOfLines={3}>
        {message ?? `Backend not reachable at ${currentBaseUrl().replace("http://","")} — check .env, firewall, or use adb reverse (see docs/MOBILE_TESTING.md).`}
      </Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          hitSlop={6}
          className="mt-4 flex-row items-center rounded-pill bg-accent px-5 py-2"
        >
          <Ionicons name="refresh" size={15} color="#fff" />
          <Text className="text-white font-bold text-sm ml-2">Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Pulsing-free skeleton: shimmer-less but clearly a placeholder shape. */
export function Skeleton({ height = 96, rounded = "card" }: { height?: number; rounded?: "card" | "pill" }) {
  return (
    <View
      className={`bg-surface-raised border border-surface-border opacity-70 mb-3 ${
        rounded === "pill" ? "rounded-pill" : "rounded-card"
      }`}
      style={{ height }}
    />
  );
}

export function SkeletonList({ count = 3, height = 96 }: { count?: number; height?: number }) {
  return (
    <View>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={height} />
      ))}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-pill px-4 py-2 border mr-2 mb-2 ${
        active ? "border-accent bg-accent/15" : "border-surface-border bg-surface-raised"
      }`}
    >
      <Text className={`text-sm font-semibold ${active ? "text-accent" : "text-ink-dim"}`}>{label}</Text>
    </Pressable>
  );
}

export function LiveDot() {
  return (
    <View className="flex-row items-center">
      <View className="w-2 h-2 rounded-full bg-accent-live mr-1.5" />
      <Text className="text-accent-live text-[11px] font-extrabold tracking-widest">LIVE</Text>
    </View>
  );
}
