/**
 * Custom RN entry (replaces "expo-router/entry" as package.json main):
 * registers the Android widget headless task alongside the router so widget
 * background tasks can run without the app UI in the foreground.
 */
import "./src/widget/widget-task-handler";
import "expo-router/entry";
