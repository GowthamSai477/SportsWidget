import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Stack } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { EmptyState, SectionHeader, SkeletonList } from "../../components/ui";
import { useCompetitions, useCreateWidget, useMyWidgets, useDeleteWidget } from "../../hooks/queries";
import { assignWidgetInstance } from "../../widget/widget-data";

const WIDGET_CATALOG = [
  {
    type: "PREMIUM",
    name: "F1 Premium",
    icon: "grid" as const,
    desc: "Two pages: next-session countdown and championship top 5. Tap the sides to flip.",
    size: "medium" as const,
    families: "4×2 · resizable",
  },
  {
    type: "SCHEDULE",
    name: "F1 Weekend",
    icon: "calendar" as const,
    desc: "Next session countdown with weekend context at a glance.",
    size: "large" as const,
    families: "4×3",
  },
  {
    type: "BASIC",
    name: "F1 Next Session",
    icon: "timer-outline" as const,
    desc: "Compact countdown to the next session.",
    size: "small" as const,
    families: "2×2",
  },
] as const;

export default function WidgetsScreen() {
  const widgets = useMyWidgets();
  const competitions = useCompetitions();
  const createWidget = useCreateWidget();
  const deleteWidget = useDeleteWidget();
  const [pendingType, setPendingType] = useState<string | null>(null);
  const [linkedToken, setLinkedToken] = useState<string | null>(null);

  const add = async (type: string, size: string) => {
    setPendingType(type);
    try {
      const created = await createWidget.mutateAsync({
        type,
        size,
        competitionSlug: competitions.data?.[0]?.slug ?? "formula-1",
      });
      // Auto-link every family to the newest instance so placing a widget
      // "just works"; tapping a row re-links manually if needed.
      await Promise.all([
        assignWidgetInstance("f1_premium", created.instanceToken),
        assignWidgetInstance("f1_next", created.instanceToken),
        assignWidgetInstance("f1_schedule", created.instanceToken),
      ]);
      setLinkedToken(created.instanceToken);
    } finally {
      setPendingType(null);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Widgets" }} />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="rounded-card border p-4 mt-4 flex-row items-center" style={{ borderColor: "#e1060044", backgroundColor: "#e106000d" }}>
          <Ionicons name="information-circle" size={18} color="#e10600" />
          <Text className="text-ink text-xs flex-1 ml-2 leading-4">
            Create an instance here, then long-press your home screen → <Text className="font-bold">Widgets</Text> → Widgets to place it. Newest instance is linked automatically.
          </Text>
        </View>

        {/* My instances */}
        <SectionHeader title="Your instances" />
        {widgets.isLoading ? (
          <SkeletonList count={2} height={64} />
        ) : widgets.data && widgets.data.length > 0 ? (
          widgets.data.map((w) => (
            <Pressable
              key={w.id}
              className={`rounded-card p-4 mb-2 border flex-row items-center ${
                linkedToken === w.instanceToken ? "border-accent bg-accent/10" : "border-surface-border bg-surface-raised"
              }`}
              onPress={async () => {
                await Promise.all([
                  assignWidgetInstance("f1_premium", w.instanceToken),
                  assignWidgetInstance("f1_next", w.instanceToken),
                  assignWidgetInstance("f1_schedule", w.instanceToken),
                ]);
                setLinkedToken(w.instanceToken);
              }}
            >
              <Ionicons
                name={linkedToken === w.instanceToken ? "link" : "link-outline"}
                size={17}
                color={linkedToken === w.instanceToken ? "#e10600" : "#9aa5b5"}
              />
              <View className="flex-1 ml-3">
                <Text className="text-ink font-bold">{w.name}</Text>
                <Text className="text-ink-faint text-xs mt-0.5">
                  {w.type} · {w.size}
                  {linkedToken === w.instanceToken ? " · linked to home screen" : " · tap to link"}
                </Text>
              </View>
              <Pressable hitSlop={10} onPress={() => deleteWidget.mutate(w.id)} className="p-2">
                <Ionicons name="trash-outline" size={16} color="#8a94a6" />
              </Pressable>
            </Pressable>
          ))
        ) : (
          <EmptyState icon="apps-outline" title="No widget instances yet" hint="Pick a widget below to create one." />
        )}

        {/* Catalog */}
        <SectionHeader title="Add a widget" />
        {WIDGET_CATALOG.map((w) => (
          <View key={w.type} className="bg-surface-raised rounded-card border border-surface-border p-4 mb-3">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-accent/10 items-center justify-center mr-3">
                <Ionicons name={w.icon} size={19} color="#e10600" />
              </View>
              <View className="flex-1">
                <Text className="text-ink font-bold text-base">{w.name}</Text>
                <Text className="text-ink-dim text-xs mt-0.5 leading-4">{w.desc}</Text>
                <Text className="text-ink-faint text-[10px] mt-1">{w.families}</Text>
              </View>
            </View>
            <Pressable
              disabled={createWidget.isPending && pendingType === w.type}
              onPress={() => add(w.type, w.size)}
              className={`mt-3 rounded-pill py-2.5 items-center flex-row justify-center ${
                createWidget.isPending && pendingType === w.type ? "bg-surface-border" : "bg-accent"
              }`}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text className="text-white font-bold text-sm ml-1">
                {createWidget.isPending && pendingType === w.type ? "Creating…" : "Create instance"}
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </>
  );
}
