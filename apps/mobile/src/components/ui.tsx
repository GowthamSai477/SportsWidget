import { Text, View } from "react-native";
import type { ReactNode } from "react";

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between mt-6 mb-3">
      <Text className="text-ink text-lg font-bold">{title}</Text>
      {action}
    </View>
  );
}

export function EmptyState({ icon, title, hint }: { icon: string; title: string; hint?: string }) {
  return (
    <View className="items-center justify-center py-12">
      <Text className="text-4xl mb-3">{icon}</Text>
      <Text className="text-ink text-base font-semibold">{title}</Text>
      {hint ? <Text className="text-ink-dim text-sm text-center mt-1 px-8">{hint}</Text> : null}
    </View>
  );
}

export function SkeletonRow({ height = 88 }: { height?: number }) {
  return <View className="bg-surface-raised rounded-card mb-3 opacity-60" style={{ height }} />;
}
