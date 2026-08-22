import { useState } from "react";
import { Link, Stack } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { EmptyState, SectionHeader, SkeletonRow } from "../../components/ui";
import { useCompetitions, useCreateWidget, useMyWidgets, useDeleteWidget } from "../../hooks/queries";
import { assignWidgetInstance } from "../../widget/widget-data";

const WIDGET_CATALOG = [
  { type: "BASIC", name: "Next Session", icon: "⏱️", desc: "Sport, event and countdown to the next session.", sizes: "Small · Medium" },
  { type: "SCHEDULE", name: "Weekend Schedule", icon: "📅", desc: "All sessions of the current race weekend at a glance.", sizes: "Medium · Large" },
  { type: "ENHANCED", name: "Race Weekend+", icon: "🏁", desc: "Event, location, countdown and session status combined.", sizes: "Medium" },
  { type: "LIVE", name: "Live Status", icon: "🔴", desc: "Live state and freshness when a session is running.", sizes: "Small · Medium" },
  { type: "PREMIUM", name: "Premium Multi-Page", icon: "🧩", desc: "Dense pages: countdown, driver & constructor standings — tap sides to flip.", sizes: "Medium · Large" },
] as const;

export default function WidgetsScreen() {
  const widgets = useMyWidgets();
  const competitions = useCompetitions();
  const createWidget = useCreateWidget();
  const deleteWidget = useDeleteWidget();
  const [pendingType, setPendingType] = useState<string | null>(null);

  const add = async (type: string) => {
    setPendingType(type);
    try {
      await createWidget.mutateAsync({
        type,
        size: type === "BASIC" || type === "LIVE" ? "small" : type === "SCHEDULE" ? "large" : "medium",
        competitionSlug: competitions.data?.[0]?.slug ?? "formula-1",
      });
    } finally {
      setPendingType(null);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Widgets" }} />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 32 }}>
        {/* My instances */}
        <SectionHeader title="Your widgets" />
        {widgets.isLoading ? (
          <SkeletonRow height={64} />
        ) : widgets.data && widgets.data.length > 0 ? (
          widgets.data.map((w) => (
            <Pressable
              key={w.id}
              className="bg-surface-raised rounded-card p-4 mb-2 border border-surface-border"
              onPress={async () => {
                // Assign this instance to the next home-screen widget you add
                // (one assignment per widget family, keyed by family name).
                await assignWidgetInstance("f1_premium", w.instanceToken);
                await assignWidgetInstance("f1_next", w.instanceToken);
                await assignWidgetInstance("f1_schedule", w.instanceToken);
              }}
            >
              <View className="flex-row items-center">
                <View className="flex-1">
                  <Text className="text-ink font-bold">{w.name}</Text>
                  <Text className="text-ink-faint text-xs mt-0.5">
                    {w.type} · {w.size} · tap to link home-screen widgets
                  </Text>
                </View>
                <Pressable onPress={() => deleteWidget.mutate(w.id)} hitSlop={8} className="rounded-pill bg-surface-border px-3 py-1.5 ml-2">
                  <Text className="text-ink-dim text-xs font-semibold">Remove</Text>
                </Pressable>
              </View>
            </Pressable>
          ))
        ) : (
          <EmptyState icon="🧩" title="No widgets yet" hint="Pick a widget below, then long-press your home screen → Widgets to place it." />
        )}

        {/* Catalog */}
        <SectionHeader title="Add a widget" />
        {WIDGET_CATALOG.map((w) => (
          <View key={w.type} className="bg-surface-raised rounded-card p-4 mb-2 border border-surface-border">
            <View className="flex-row items-center">
              <Text className="text-2xl mr-3">{w.icon}</Text>
              <View className="flex-1">
                <Text className="text-ink font-bold">{w.name}</Text>
                <Text className="text-ink-dim text-xs mt-0.5">{w.desc}</Text>
                <Text className="text-ink-faint text-[10px] mt-1">{w.sizes}</Text>
              </View>
            </View>
            <Pressable
              disabled={createWidget.isPending && pendingType === w.type}
              onPress={() => add(w.type)}
              className={`mt-3 rounded-pill py-2 items-center ${createWidget.isPending && pendingType === w.type ? "bg-surface-border" : "bg-accent"}`}
            >
              <Text className="text-white font-bold text-sm">{createWidget.isPending && pendingType === w.type ? "Creating…" : "Create widget instance"}</Text>
            </Pressable>
          </View>
        ))}

        <Link href="/settings" asChild>
          <Text className="text-center text-accent-warn text-xs mt-4">How to add: long-press home screen → Widgets → Widgets</Text>
        </Link>
      </ScrollView>
    </>
  );
}
