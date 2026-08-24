import { useColorScheme } from "nativewind";
import { useThemeStore } from "../store/theme";

/**
 * Resolved appearance honoring the manual Light/Dark/System selector.
 * `dark` drives non-NativeWind surfaces (headers, tab bar, status bar);
 * NativeWind handles the CSS-variable swap for everything with className.
 */
export function useAppTheme() {
  const mode = useThemeStore((s) => s.mode);
  const { colorScheme } = useColorScheme();
  const resolved = mode === "system" ? (colorScheme ?? "dark") : mode;
  return { mode, resolved, dark: resolved !== "light" };
}
