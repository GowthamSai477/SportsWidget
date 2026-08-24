import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useThemeStore, type ThemeMode } from "../store/theme";

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap; hint: string }[] = [
  { mode: "light", label: "Light", icon: "sunny", hint: "Always light" },
  { mode: "dark", label: "Dark", icon: "moon", hint: "Always dark" },
  { mode: "system", label: "System", icon: "phone-portrait-outline", hint: "Follow device setting" },
];

function Row({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  const body = (
    <Pressable className="px-4 py-4 border-b border-surface-border/50 flex-row items-center" onPress={onPress}>
      <Ionicons name={icon} size={17} color="#e10600" />
      <Text className="text-ink ml-3 flex-1 text-[15px]">{label}</Text>
      <Text className="text-ink-faint text-sm">{value}</Text>
      {onPress ? <Ionicons name="chevron-forward" size={15} color="#8a94a6" /> : null}
    </Pressable>
  );
  return onPress ? body : <View>{body}</View>;
}

export default function SettingsScreen() {
  const { mode, setMode } = useThemeStore();

  const showInfo = (title: string, message: string) => Alert.alert(title, message);

  return (
    <>
      <Stack.Screen options={{ title: "Settings" }} />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Theme selector (spec section 11): light | dark | system, instant apply */}
        <Text className="text-ink-faint text-[11px] font-extrabold tracking-[0.12em] uppercase mt-4 mb-2">Appearance</Text>
        <View className="bg-surface-raised rounded-card border border-surface-border overflow-hidden">
          {THEME_OPTIONS.map((option, idx) => {
            const selected = mode === option.mode;
            return (
              <Pressable
                key={option.mode}
                onPress={() => setMode(option.mode)}
                className={`flex-row items-center px-4 py-3.5 ${idx < THEME_OPTIONS.length - 1 ? "border-b border-surface-border/50" : ""}`}
              >
                <View
                  className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${
                    selected ? "bg-accent/15" : "bg-surface"
                  }`}
                >
                  <Ionicons name={option.icon} size={16} color={selected ? "#e10600" : "#8a94a6"} />
                </View>
                <View className="flex-1">
                  <Text className={`text-[15px] ${selected ? "text-ink font-bold" : "text-ink"}`}>{option.label}</Text>
                  <Text className="text-ink-faint text-xs mt-0.5">{option.hint}</Text>
                </View>
                {selected ? <Ionicons name="checkmark-circle" size={20} color="#e10600" /> : null}
              </Pressable>
            );
          })}
        </View>
        <Text className="text-ink-faint text-[11px] mt-1.5 px-1">Applies immediately. System follows your device setting.</Text>

        <Text className="text-ink-faint text-[11px] font-extrabold tracking-[0.12em] uppercase mt-6 mb-2">General</Text>
        <View className="bg-surface-raised rounded-card border border-surface-border overflow-hidden">
          <Row
            icon="time-outline"
            label="Timezone"
            value="Device"
            onPress={() =>
              showInfo(
                "Timezone",
                "Events are shown in your device timezone. Choosing a manual timezone arrives with account sync.",
              )
            }
          />
          <Row
            icon="notifications-outline"
            label="Notifications"
            value="Soon"
            onPress={() =>
              showInfo(
                "Notifications",
                "Push notifications (event reminders, results) are being wired to the notification service and arrive in an upcoming release.",
              )
            }
          />
        </View>

        <Text className="text-ink-faint text-[11px] font-extrabold tracking-[0.12em] uppercase mt-6 mb-2">About</Text>
        <View className="bg-surface-raised rounded-card border border-surface-border overflow-hidden">
          <Row
            icon="shield-checkmark-outline"
            label="Privacy"
            onPress={() => showInfo("Privacy", "The app stores your email, favorites and widget settings on your own backend instance. No analytics or third-party tracking is enabled in development builds.")}
          />
          <Row
            icon="information-circle-outline"
            label="About Widgets"
            value="0.1.0"
            onPress={() => showInfo("Widgets", "Universal sports schedule platform with premium home-screen widgets.\n\nVersion 0.1.0 (development)")}
          />
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
