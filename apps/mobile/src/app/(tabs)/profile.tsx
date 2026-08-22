import { Link, Stack } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/endpoints";
import { ensureSession } from "../../services/auth/auth.service";

const ROWS = [
  { label: "Settings", icon: "⚙️", href: "/settings" },
  { label: "Widgets", icon: "🧩", href: "/widgets" },
] as const;

export default function ProfileScreen() {
  const session = useQuery({ queryKey: ["session"], queryFn: ensureSession, staleTime: Infinity });
  const me = useQuery({ queryKey: ["me"], queryFn: api.me, retry: false });

  return (
    <>
      <Stack.Screen options={{ title: "Profile" }} />
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="items-center mt-8">
          <View className="w-20 h-20 rounded-full bg-accent/15 items-center justify-center">
            <Text className="text-3xl">🏎️</Text>
          </View>
          <Text className="text-ink text-xl font-bold mt-3">{me.data?.name ?? "Sports fan"}</Text>
          <Text className="text-ink-dim text-sm">{me.data?.email ?? session.data?.email ?? ""}</Text>
          <View className="rounded-pill bg-surface-raised border border-surface-border px-3 py-1 mt-2">
            <Text className="text-accent-warn text-xs font-bold tracking-wider">{me.data?.plan?.tier ?? "…"} PLAN</Text>
          </View>
        </View>

        <View className="mt-8">
          {ROWS.map((row) => (
            <Link key={row.href} href={row.href} asChild>
              <Pressable className="bg-surface-raised rounded-card p-4 mb-2 border border-surface-border flex-row items-center">
                <Text className="mr-3">{row.icon}</Text>
                <Text className="text-ink font-semibold flex-1">{row.label}</Text>
                <Text className="text-ink-faint">›</Text>
              </Pressable>
            </Link>
          ))}
        </View>

        <Text className="text-ink-faint text-xs text-center mt-6">Widgets · v0.1.0 (development mode)</Text>
      </ScrollView>
    </>
  );
}
