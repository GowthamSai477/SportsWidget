import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Stack } from "expo-router";
import { EmptyState, SectionHeader, SkeletonList } from "../../components/ui";
import { useCompetitions, useCreateWidget, useMyWidgets, useDeleteWidget } from "../../hooks/queries";
import { assignWidgetInstance } from "../../widget/widget-data";
import { refreshWidgetFromApp } from "../../widget/widget-task-handler";

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

const ADD_STEPS = [
  "Long-press an empty spot on your home screen.",
  "Tap Widgets.",
  "Find the Widgets app and select it.",
  "Pick the widget family and size, then place it.",
];

export default function WidgetsScreen() {
  const widgets = useMyWidgets();
  const competitions = useCompetitions();
  const createWidget = useCreateWidget();
  const deleteWidget = useDeleteWidget();
  const [pendingType, setPendingType] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ name: string; families: string } | null>(null);
  const [instructions, setInstructions] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const add = async (type: string, name: string, size: string) => {
    setPendingType(type);
    try {
      const created = await createWidget.mutateAsync({
        type,
        size,
        competitionSlug: competitions.data?.[0]?.slug ?? "formula-1",
      });
      await Promise.all([
        assignWidgetInstance("f1_premium", created.instanceToken),
        assignWidgetInstance("f1_next", created.instanceToken),
        assignWidgetInstance("f1_schedule", created.instanceToken),
      ]);
      setSuccess({ name, families: `${type} · ${size}` });
    } finally {
      setPendingType(null);
    }
  };

  const test = async (family: string) => {
    setTesting(family);
    try {
      await refreshWidgetFromApp(family);
    } finally {
      setTesting(null);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Widgets" }} />

      {/* Creation success (spec Phase 13) */}
      <Modal visible={success !== null} transparent animationType="fade" onRequestClose={() => setSuccess(null)}>
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="bg-surface-raised rounded-card border border-surface-border w-full p-5">
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={22} color="#00c853" />
              <Text className="text-ink font-extrabold text-lg ml-2">Widget created</Text>
            </View>
            <Text className="text-ink-dim text-sm mt-1">{success?.families}</Text>
            <Text className="text-ink text-sm mt-3 leading-5">Your widget instance is ready and linked.</Text>
            <Pressable
              onPress={() => {
                if (success) setInstructions(success.name);
                setSuccess(null);
              }}
              className="mt-4 rounded-pill bg-accent py-3 items-center flex-row justify-center"
            >
              <Ionicons name="add-circle-outline" size={17} color="#fff" />
              <Text className="text-white font-bold ml-1.5">Add to Home Screen</Text>
            </Pressable>
            <Pressable onPress={() => setSuccess(null)} className="mt-2 py-2.5 items-center">
              <Text className="text-ink-dim font-semibold">Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* How-to instructions (honest: Android has no programmatic widget picker) */}
      <Modal visible={instructions !== null} transparent animationType="fade" onRequestClose={() => setInstructions(null)}>
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="bg-surface-raised rounded-card border border-surface-border w-full p-5">
            <Text className="text-ink font-extrabold text-lg">How to add</Text>
            <Text className="text-ink-dim text-xs mt-0.5">
              {instructions ? `Family: ${instructions}` : ""}
            </Text>
            <View className="mt-3">
              {ADD_STEPS.map((step, i) => (
                <View key={i} className="flex-row items-start mb-2.5">
                  <View className="w-5 h-5 rounded-full bg-accent/15 items-center justify-center mr-2.5 mt-0.5">
                    <Text className="text-accent text-[11px] font-black">{i + 1}</Text>
                  </View>
                  <Text className="text-ink flex-1 text-sm leading-5">{step}</Text>
                </View>
              ))}
            </View>
            <Text className="text-ink-faint text-[11px] mt-1">
              Android does not let apps open the widget picker automatically — these steps take ~10 seconds.
            </Text>
            <Pressable
              onPress={() => setInstructions(null)}
              className="mt-4 rounded-pill bg-accent py-2.5 items-center"
            >
              <Text className="text-white font-bold">Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* MY WIDGETS (spec Phase 14) */}
        <SectionHeader title="My widgets" />
        {widgets.isLoading ? (
          <SkeletonList count={2} height={64} />
        ) : widgets.data && widgets.data.length > 0 ? (
          widgets.data.map((w) => (
            <View key={w.id} className="bg-surface-raised rounded-card border border-surface-border p-4 mb-2">
              <View className="flex-row items-center">
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className="text-ink font-bold">{w.name}</Text>
                    <View className="ml-2 rounded-pill bg-surface border border-surface-border px-2 py-0.5">
                      <Text className="text-ink-faint text-[10px] font-bold">{w.size?.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text className="text-ink-faint text-xs mt-0.5">
                    {w.type} · {w.isActive ? "Ready — place it from the home screen menu" : "Disabled"}
                  </Text>
                </View>
                <Pressable hitSlop={10} onPress={() => deleteWidget.mutate(w.id)} className="p-2">
                  <Ionicons name="trash-outline" size={16} color="#8a94a6" />
                </Pressable>
              </View>
              <View className="flex-row mt-3">
                <Pressable
                  onPress={() => test("f1_premium")}
                  disabled={testing !== null}
                  className="flex-1 flex-row items-center justify-center rounded-pill border border-surface-border py-2 mr-2"
                >
                  <Ionicons name="play" size={13} color="#e10600" />
                  <Text className="text-ink font-semibold text-xs ml-1.5">
                    {testing === "f1_premium" ? "Refreshing…" : "Test"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setInstructions(w.name)}
                  className="flex-1 flex-row items-center justify-center rounded-pill border border-surface-border py-2"
                >
                  <Ionicons name="help-circle-outline" size={13} color="#9aa5b5" />
                  <Text className="text-ink-dim font-semibold text-xs ml-1.5">Instructions</Text>
                </Pressable>
              </View>
            </View>
          ))
        ) : (
          <EmptyState icon="apps-outline" title="No widget instances yet" hint="Create one below, then add it from your home screen." />
        )}

        {/* AVAILABLE WIDGETS */}
        <SectionHeader title="Available widgets" />
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
              onPress={() => add(w.type, w.name, w.size)}
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
