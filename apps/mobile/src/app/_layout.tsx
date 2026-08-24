import { useColorScheme } from "nativewind";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";
import { queryClient, queryPersister } from "../api/client";
import { useAppTheme } from "../hooks/use-app-theme";
import { useThemeStore } from "../store/theme";

export default function RootLayout() {
  const mode = useThemeStore((s) => s.mode);
  const { setColorScheme } = useColorScheme();
  const { dark } = useAppTheme();

  // Manual theme selection overrides the device setting at runtime —
  // NativeWind re-renders every consumer of the tokens immediately.
  useEffect(() => {
    setColorScheme(mode === "system" ? "system" : mode);
  }, [mode, setColorScheme]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister }}>
          <StatusBar style={dark ? "light" : "dark"} />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: dark ? "#0b0e14" : "#ffffff" },
              headerTintColor: dark ? "#f2f5fa" : "#0c111b",
              headerShadowVisible: false,
              contentStyle: { backgroundColor: dark ? "#0b0e14" : "#f5f7fb" },
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
