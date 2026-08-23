import { Ionicons } from "@expo/vector-icons";
import { Link, Stack } from "expo-router";
import { Pressable, SectionList, Text, View } from "react-native";
import type { ComponentProps } from "react";
import { EmptyState, ErrorState } from "../../components/ui";
import { useCompetitions, useSports } from "../../hooks/queries";

type IconName = ComponentProps<typeof Ionicons>["name"];

const CATEGORY_ICONS: Record<string, IconName> = {
  MOTORSPORT: "speedometer",
  CRICKET: "baseball",
  FOOTBALL: "football",
  TENNIS: "tennisball",
  BASKETBALL: "basketball",
  COMBAT: "body",
};

interface CompetitionRow {
  slug: string;
  name: string;
  shortName: string | null;
  region: string | null;
}

interface SportSection {
  title: string;
  category: string;
  accentColor: string | null;
  active: boolean;
  data: CompetitionRow[];
}

export default function SportsScreen() {
  const sports = useSports();
  const competitions = useCompetitions();

  if (sports.isError || competitions.isError) {
    return (
      <>
        <Stack.Screen options={{ title: "Sports" }} />
        <View className="flex-1 px-4 justify-center">
          <ErrorState
            message="The sports catalogue could not be loaded. Check the backend connection."
            onRetry={() => {
              sports.refetch();
              competitions.refetch();
            }}
          />
        </View>
      </>
    );
  }

  const sections: SportSection[] = (sports.data ?? []).map((sport) => ({
    title: sport.name,
    category: sport.category,
    accentColor: sport.accentColor,
    active: sport.isActive,
    data: (competitions.data ?? []).filter((c) => c.sport?.slug === sport.slug),
  }));


  return (
    <>
      <Stack.Screen options={{ title: "Sports" }} />
      <SectionList
        className="flex-1 px-4 pt-2"
        sections={sections}
        keyExtractor={(item) => item.slug}
        renderSectionHeader={({ section }) => (
          <View className="flex-row items-center mt-6 mb-2">
            <Ionicons name={CATEGORY_ICONS[section.category] ?? "medal"} size={15} color={(section.accentColor ?? "#e10600")} />
            <Text className="text-ink text-[13px] font-extrabold tracking-[0.1em] uppercase ml-2">
              {section.title}
            </Text>
            {!section.active ? (
              <View className="ml-auto rounded-pill bg-surface-raised border border-surface-border px-2 py-0.5">
                <Text className="text-ink-faint text-[10px] font-bold">COMING SOON</Text>
              </View>
            ) : null}
          </View>
        )}
        renderItem={({ item, section }) => (
          <Link href={`/sports/${item.slug}`} asChild>
            <Pressable className="bg-surface-raised rounded-card border border-surface-border p-4 mb-2 flex-row items-center">
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: (section.accentColor ?? "#e10600") + "22" }}
              >
                <Ionicons name={CATEGORY_ICONS[section.category] ?? "trophy"} size={18} color={(section.accentColor ?? "#e10600")} />
              </View>
              <View className="flex-1">
                <Text className="text-ink font-bold text-base">{item.shortName ?? item.name}</Text>
                <Text className="text-ink-faint text-xs mt-0.5">{item.region ?? section.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#8a94a6" />
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={
          sports.isLoading || competitions.isLoading ? (
            <EmptyState icon="hourglass-outline" title="Loading catalogue…" hint="Fetching sports and competitions." />
          ) : (
            <EmptyState icon="trophy-outline" title="No competitions yet" hint="Run the backend sync to populate the catalogue." />
          )
        }
      />
    </>
  );
}
