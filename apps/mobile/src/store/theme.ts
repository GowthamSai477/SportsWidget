import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

/**
 * User-selected appearance (spec section 11): light | dark | system.
 * Consumed by the root layout, which forwards it to NativeWind's
 * setColorScheme — changes apply immediately, no restart.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "system",
      setMode: (mode) => set({ mode }),
    }),
    { name: "app-theme", storage: createJSONStorage(() => AsyncStorage) },
  ),
);
