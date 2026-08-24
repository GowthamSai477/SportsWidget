import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useAppTheme } from "../../hooks/use-app-theme";

const TABS = [
  { name: "index", label: "Home", icon: "home" as const },
  { name: "schedule", label: "Schedule", icon: "calendar-number" as const },
  { name: "sports", label: "Sports", icon: "trophy" as const },
  { name: "profile", label: "Profile", icon: "person-circle" as const },
];

export default function TabsLayout() {
  const { dark } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: dark ? "#0b0e14" : "#ffffff" },
        headerTintColor: dark ? "#f2f5fa" : "#0c111b",
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: dark ? "#0b0e14" : "#ffffff",
          borderTopColor: dark ? "#232a38" : "#e3e8f0",
        },
        tabBarActiveTintColor: "#e10600",
        tabBarInactiveTintColor: dark ? "#9aa5b5" : "#55617a",
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons name={tab.icon} color={color} size={size} />,
            tabBarLabel: tab.label,
          }}
        />
      ))}
    </Tabs>
  );
}
