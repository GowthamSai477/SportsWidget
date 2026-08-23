import { Ionicons } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/endpoints";
import { ensureSession } from "../../services/auth/auth.service";

interface Row {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  href?: "/settings" | "/widgets";
}

const ACCOUNT: Row[] = [
  { icon: "settings-outline", label: "Settings", sub: "Theme · timezone · preferences", href: "/settings" },
  { icon: "phone-portrait-outline", label: "Devices", sub: "Devices signed in to your account" },
  { icon: "notifications-outline", label: "Notifications", sub: "Categories and lead times" },
];

const WIDGETS: Row[] = [{ icon: "apps-outline", label: "Manage Widgets", sub: "Create and link home-screen widgets", href: "/widgets" }];

const SUPPORT: Row[] = [
  { icon: "help-circle-outline", label: "Help & FAQ" },
  { icon: "bug-outline", label: "Report an Issue" },
];

function Section({ title }: { title: string }) {
  return <Text className="text-ink-faint text-[11px] font-extrabold tracking-[0.12em] uppercase mt-6 mb-2">{title}</Text>;
}

function RowItem({ row }: { row: Row }) {
  const body = (
    <View className="flex-row items-center px-4 py-3.5 border-b border-surface-border/50 last:border-b-0">
      <View className="w-9 h-9 rounded-full bg-surface items-center justify-center mr-3">
        <Ionicons name={row.icon} size={17} color="#e10600" />
      </View>
      <View className="flex-1">
        <Text className="text-ink font-semibold text-[15px]">{row.label}</Text>
        {row.sub ? <Text className="text-ink-faint text-xs mt-0.5">{row.sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={15} color="#8a94a6" />
    </View>
  );
  return row.href ? (
    <Link href={row.href} asChild>
      <Pressable>{body}</Pressable>
    </Link>
  ) : (
    <Pressable>{body}</Pressable>
  );
}

export default function ProfileScreen() {
  const session = useQuery({ queryKey: ["session"], queryFn: ensureSession, staleTime: Infinity });
  const me = useQuery({ queryKey: ["me"], queryFn: api.me, retry: false });
  const initial = (me.data?.name ?? "W").charAt(0).toUpperCase();

  return (
    <>
      <Stack.Screen options={{ title: "Profile" }} />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Identity card */}
        <View className="bg-surface-raised rounded-card border border-surface-border mt-4 p-5 flex-row items-center">
          <View className="w-16 h-16 rounded-full items-center justify-center" style={{ backgroundColor: "#e1060022" }}>
            <Text className="text-accent text-2xl font-black">{initial}</Text>
          </View>
          <View className="flex-1 ml-4">
            <Text className="text-ink text-lg font-extrabold">{me.data?.name ?? "Sports fan"}</Text>
            <Text className="text-ink-dim text-sm mt-0.5" numberOfLines={1}>
              {me.data?.email ?? session.data?.email ?? "…"}
            </Text>
            <View className="flex-row items-center mt-2">
              <View className="rounded-pill bg-accent/10 border border-accent/30 px-2.5 py-0.5">
                <Text className="text-accent text-[10px] font-extrabold tracking-wider">{me.data?.plan?.tier ?? "…"} PLAN</Text>
              </View>
              <Text className="text-ink-faint text-[11px] ml-2">development mode</Text>
            </View>
          </View>
        </View>

        <Section title="Account" />
        <View className="bg-surface-raised rounded-card border border-surface-border overflow-hidden">
          {ACCOUNT.map((row) => (
            <RowItem key={row.label} row={row} />
          ))}
        </View>

        <Section title="Widgets" />
        <View className="bg-surface-raised rounded-card border border-surface-border overflow-hidden">
          {WIDGETS.map((row) => (
            <RowItem key={row.label} row={row} />
          ))}
        </View>

        <Section title="Support" />
        <View className="bg-surface-raised rounded-card border border-surface-border overflow-hidden">
          {SUPPORT.map((row) => (
            <RowItem key={row.label} row={row} />
          ))}
        </View>

        <Section title="App" />
        <View className="bg-surface-raised rounded-card border border-surface-border px-4 py-3.5 flex-row items-center justify-between">
          <View>
            <Text className="text-ink font-semibold text-[15px]">Version</Text>
            <Text className="text-ink-faint text-xs mt-0.5">0.1.0 · development build</Text>
          </View>
          <Ionicons name="information-circle-outline" size={18} color="#8a94a6" />
        </View>

        <Pressable className="mt-6 rounded-card border border-accent/40 bg-accent/5 py-3.5 items-center flex-row justify-center">
          <Ionicons name="log-out-outline" size={17} color="#e10600" />
          <Text className="text-accent font-bold ml-2">Log out</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}
