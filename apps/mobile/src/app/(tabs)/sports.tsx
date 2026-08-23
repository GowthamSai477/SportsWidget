import { Link, Stack } from "expo-router";
import { Pressable, SectionList, Text, View } from "react-native";
import { EmptyState } from "../../components/ui";
import { useCompetitions, useSports } from "../../hooks/queries";

interface Section {
  title: string;
  data: { slug: string; name: string; shortName: string | null; region: string | null; sport?: { slug: string; name: string } | null }[];
}
export default function SportsScreen() {
  const sports = useSports();
  const competitions = useCompetitions();

  const sections: Section[] = (sports.data ?? [])
    .filter((s) => s.isActive || true) // inactive sports shown as "coming soon"
    .map((sport) => ({
      title: sport.name + (sport.isActive ? "" : "  ·  coming soon"),
      data: (competitions.data ?? []).filter((c) => c.sport?.slug === sport.slug),
    }));

  return (
    <>
      <Stack.Screen options={{ title: "Sports" }} />
      {!sports.isLoading && sections.every((s) => s.data.length === 0) ? (
        <EmptyState icon="🏟️" title="Catalogue loading" hint="Competitions appear once synced." />
      ) : (
        <SectionList
          className="flex-1 px-4 pt-2"
          sections={sections}
          keyExtractor={(item) => item.slug}
          renderSectionHeader={({ section }) => (
            <Text className="text-ink-dim text-xs font-bold tracking-widest uppercase mt-5 mb-2">{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <Link href={`/sports/${item.slug}`} asChild>
              <Pressable className="bg-surface-raised rounded-card p-4 mb-2 border border-surface-border flex-row items-center justify-between">
                <View>
                  <Text className="text-ink font-bold">{item.shortName ?? item.name}</Text>
                  <Text className="text-ink-faint text-xs">{item.region ?? item.sport?.name}</Text>
                </View>
                <Text className="text-ink-faint">›</Text>
              </Pressable>
            </Link>
          )}
        />
      )}
    </>
  );
}
