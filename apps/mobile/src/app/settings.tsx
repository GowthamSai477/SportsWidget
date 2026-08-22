import { Stack } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

export default function SettingsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Settings" }} />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="bg-surface-raised rounded-card border border-surface-border mt-4 overflow-hidden">
          {["Theme: System", "Timezone: Device", "Notifications", "Favorite sports"].map((row) => (
            <Pressable key={row} className="px-4 py-4 border-b border-surface-border/60 flex-row justify-between items-center">
              <Text className="text-ink">{row}</Text>
              <Text className="text-ink-faint">›</Text>
            </Pressable>
          ))}
        </View>

        <View className="bg-surface-raised rounded-card border border-surface-border mt-3 overflow-hidden">
          {["Privacy", "About Widgets (v0.1.0)", "Help & FAQ", "Report an issue"].map((row) => (
            <Pressable key={row} className="px-4 py-4 border-b border-surface-border/60 flex-row justify-between items-center">
              <Text className="text-ink">{row}</Text>
              <Text className="text-ink-faint">›</Text>
            </Pressable>
          ))}
        </View>

        {/* Plan details surface now; enforcement arrives post-development-mode (spec section 25). */}
        <View className="bg-surface-raised rounded-card border border-surface-border p-4 mt-3">
          <Text className="text-ink font-bold">Plan</Text>
          <Text className="text-ink-dim text-sm mt-1">Development mode: everything unlocked. Plan tiers activate later via feature flags.</Text>
        </View>
      </ScrollView>
    </>
  );
}
