import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

function Row({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <Pressable className="px-4 py-4 border-b border-surface-border/50 flex-row items-center">
      <Ionicons name={icon} size={17} color="#e10600" />
      <Text className="text-ink ml-3 flex-1 text-[15px]">{label}</Text>
      <Text className="text-ink-faint text-sm">{value}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Settings" }} />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="bg-surface-raised rounded-card border border-surface-border mt-4 overflow-hidden">
          <Row icon="contrast-outline" label="Theme" value="System" />
          <Row icon="time-outline" label="Timezone" value="Device" />
        </View>

        <View className="bg-surface-raised rounded-card border border-surface-border mt-3 overflow-hidden">
          <Row icon="notifications-outline" label="Notifications" value="On" />
        </View>

        <View className="bg-surface-raised rounded-card border border-surface-border mt-3 overflow-hidden">
          <Row icon="shield-checkmark-outline" label="Privacy" value="" />
          <Row icon="information-circle-outline" label="About Widgets" value="0.1.0" />
        </View>

        <View className="rounded-card border p-4 mt-3" style={{ borderColor: "#e1060044", backgroundColor: "#e106000d" }}>
          <View className="flex-row items-center">
            <Ionicons name="flask-outline" size={17} color="#e10600" />
            <Text className="text-ink font-bold ml-2">Development mode</Text>
          </View>
          <Text className="text-ink-dim text-sm mt-1 leading-5">
            Every feature is unlocked while DEVELOPMENT_MODE=true. Plan tiers and restrictions activate later via feature flags.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}
