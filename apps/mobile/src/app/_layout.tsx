import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";
import { queryClient, queryPersister } from "../api/client";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister }}>
          {/* Offline-first: persisted cache hydrates before network revalidation. */}
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: "#0B0E14" },
              headerTintColor: "#F2F5FA",
              contentStyle: { backgroundColor: "#0B0E14" },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="sports/[slug]" options={{ title: "Competition" }} />
            <Stack.Screen name="events/[id]" options={{ title: "Event" }} />
            <Stack.Screen name="widgets/index" options={{ title: "Widgets", presentation: "modal" }} />
          </Stack>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
