import { Tabs } from "expo-router";
import { Text } from "react-native";

const TAB_ICONS: Record<string, string> = {
  index: "⌂",
  schedule: "📅",
  sports: "🏆",
  profile: "👤",
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#0B0E14" },
        headerTintColor: "#F2F5FA",
        tabBarStyle: { backgroundColor: "#0B0E14", borderTopColor: "#232A38" },
        tabBarActiveTintColor: "#E10600",
        tabBarInactiveTintColor: "#9AA5B5",
      }}
    >
      {Object.entries(TAB_ICONS).map(([name, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            tabBarIcon: () => <Text style={{ fontSize: 18 }}>{icon}</Text>,
            tabBarLabel: name === "index" ? "Home" : name.charAt(0).toUpperCase() + name.slice(1),
          }}
        />
      ))}
    </Tabs>
  );
}
