/**
 * Custom RN entry (replaces "expo-router/entry" as package.json main):
 * registers the Android widget headless task alongside the router so widget
 * background tasks can run without the app UI in the foreground.
 *
 * The widget handler is require()d under an explicit platform guard: it is a
 * genuinely platform-specific module (react-native-android-widget registers
 * native headless tasks that do not exist on web), which is why it cannot be
 * imported statically.
 */
import { Platform } from "react-native";

if (Platform.OS === "android") {
  require("./src/widget/widget-task-handler");
}

import "expo-router/entry";
