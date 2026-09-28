import { useEffect, useState, type ReactNode } from "react";
import { Stack, useRouter, type Href } from "expo-router";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { destinations, searchDestinations, sections, type Destination, type Section } from "../../../src/lib/product/catalog";
import { copy } from "../../../src/lib/product/copy";
import { sailLessons } from "../../../src/data/sailing-lab/course";
import { useI18n } from "../i18n/context";
import { Button, Card, ListRow, Screen, Text } from "../design-system/components";
import { colors, radii, shadow } from "../design-system/tokens";
import { fetchDaily, type DailyChallenge } from "../api/daily";
import { PhotoCard } from "../home/PhotoCard";
import { useLearningSnapshot } from "../home/useLearningSnapshot";
import { checkedOf, homeCopy, passedOf, racesSaved } from "../home/copy";
import { passedLessonIds } from "../bootcamp/status";
import { bootcampLessons } from "../data";

const racePhoto = require("../../assets/design/race-card.jpg");

/**
 * A tab hub. Learn, Practice and Race list their own section. The Menu tab
 * (`section="library"`, served at /menu; /library redirects there) is the
 * whole catalog: search, the learner's progress, then every native
 * destination once, grouped. Hubs have a large in-content title and grouped
 * rows on white cards; the bottom tab bar is the way between them.
 */
export function ProductHub({ section }: { section: Exclude<Section, "home">; menu?: boolean }) {
  const { lang } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [daily, setDaily] = useState<DailyChallenge | null>(null);
  const isMenu = section === "library";
  useEffect(() => {
    if (section !== "race") return;
    let active = true;
    fetchDaily().then(result => { if (active && result.ok && result.data) setDaily(result.data); });
    return () => { active = false; };
  }, [section]);
  const current = sections.find(s => s.id === section)!;
  const title = isMenu ? copy.menu[lang] : current.title[lang];
  const solo = destinations.find(d => d.id === "solo")!;
  const visible = isMenu ? searchDestinations(query, lang, "native") : destinations.filter(d => d.section === section && d.native && !(section === "race" && d.id === "solo"));
  const sectionTitle = (id: Section) => sections.find(s => s.id === id)!.title[lang];
  const groups = isMenu ? [
    { id: "sailing", title: copy.sailing[lang], entries: visible.filter(d => d.section === "learn" && !d.certificate) },
    { id: "exam", title: copy.exam[lang], entries: visible.filter(d => d.certificate) },
    { id: "practice", title: sectionTitle("practice"), entries: visible.filter(d => d.section === "practice") },
    { id: "race", title: sectionTitle("race"), entries: visible.filter(d => d.section === "race") },
    { id: "library", title: sectionTitle("library"), entries: visible.filter(d => d.section === "library" && d.id !== "settings") },
    { id: "app", title: homeCopy.appGroup[lang], entries: visible.filter(d => d.id === "settings") },
  ] : section === "learn" ? [
    { id: "sailing", title: copy.sailing[lang], entries: visible.filter(d => !d.certificate) },
    { id: "exam", title: copy.exam[lang], entries: visible.filter(d => d.certificate) },
  ] : [{ id: section, title: "", entries: visible }];
  const row = (entry: Destination, index: number, count: number) => <ListRow key={entry.id} noBorder={index === count - 1}
    title={`${section === "practice" ? `${index + 1}. ` : ""}${entry.title[lang]}`} caption={entry.detail?.[lang]}
    badge={entry.online ? copy.online[lang] : undefined} onPress={() => router.push(entry.native as Href)} />;
  return <Screen noTopInset>
    <Stack.Screen options={{ title, headerShown: false, animation: "fade" }} />
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <Text variant="title" accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.intro}>{isMenu ? copy.menuIntro[lang] : current.description[lang]}</Text>
      {section === "race" && <PhotoCard source={racePhoto} height={188} eyebrow={current.title[lang]} title={solo.title[lang]} caption={solo.detail?.[lang]} onPress={() => router.push(solo.native as Href)} />}
      {isMenu && <View style={styles.search}>
        <View style={styles.field}>
          <Svg width={18} height={18} viewBox="0 0 18 18" accessibilityElementsHidden importantForAccessibility="no">
            <Circle cx={7.5} cy={7.5} r={5.5} stroke={colors.textSecondary} strokeWidth={1.8} fill="none" />
            <Path d="m11.8 11.8 4.2 4.2" stroke={colors.textSecondary} strokeWidth={1.8} strokeLinecap="round" />
          </Svg>
          <TextInput accessibilityLabel={copy.search[lang]} placeholder={copy.hint[lang]} placeholderTextColor={colors.textMuted} value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search" clearButtonMode="while-editing" style={styles.input} />
        </View>
        {query ? <Button variant="ghost" onPress={() => setQuery("")}>{copy.clear[lang]}</Button> : null}
      </View>}
      {isMenu && !query.trim() && <MyProgress />}
      {groups.filter(g => g.entries.length).map(group => <Group key={group.id} title={group.title}>
        {group.entries.map((entry, index) => row(entry, index, group.entries.length))}
      </Group>)}
      {!visible.length && <Text accessibilityLiveRegion="polite" style={styles.empty}>{copy.empty[lang]}</Text>}
      {section === "practice" && <Button variant="ghost" onPress={() => router.push("/simulator")}>{copy.fallback[lang]}</Button>}
      {section === "race" && daily && <Group title="">
        <ListRow noBorder title={copy.daily[lang]} caption={daily.day} onPress={() => router.push("/game?course=daily")} />
      </Group>}
    </ScrollView>
  </Screen>;
}

/** Counts from this device only, each named for what it counts. */
function MyProgress() {
  const { lang } = useI18n();
  const snapshot = useLearningSnapshot();
  if (!snapshot) return null;
  const passed = passedLessonIds(snapshot.bootcamp).size;
  const rows = [
    { key: "bootcamp", title: destinations.find(d => d.id === "course")!.title[lang], value: passedOf(passed, bootcampLessons.length)[lang] },
    { key: "sails", title: destinations.find(d => d.id === "sails")!.title[lang], value: checkedOf(snapshot.sail.checked.length, sailLessons.length)[lang] },
    { key: "races", title: sections.find(s => s.id === "race")!.title[lang], value: racesSaved(snapshot.races)[lang] },
  ];
  return <Card style={styles.progress}>
    <Text variant="eyebrow" accessibilityRole="header">{homeCopy.myProgress[lang]}</Text>
    {rows.map(r => <View key={r.key} style={styles.progressRow} accessible accessibilityLabel={`${r.title}. ${r.value}`}>
      <Text style={styles.progressTitle}>{r.title}</Text>
      <Text style={styles.progressValue}>{r.value}</Text>
    </View>)}
    <Text style={styles.progressNote}>{homeCopy.onDevice[lang]}</Text>
  </Card>;
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.group}>
    {title ? <Text style={styles.groupTitle} accessibilityRole="header">{title}</Text> : null}
    <View style={styles.groupShadow}><View style={styles.groupCard}>{children}</View></View>
  </View>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 32, gap: 20, maxWidth: 820, width: "100%", alignSelf: "center" },
  title: { minHeight: 40 },
  intro: { color: colors.textSecondary, fontSize: 16, lineHeight: 24, marginTop: -8 },
  group: { gap: 8 },
  groupTitle: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: colors.textSecondary, paddingHorizontal: 4 },
  groupShadow: { backgroundColor: colors.bgCard, borderRadius: radii.card, ...shadow.card },
  groupCard: { borderRadius: radii.card, overflow: "hidden" },
  search: { gap: 4 },
  field: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(18, 50, 71, 0.18)", backgroundColor: colors.bgCard, borderRadius: radii.control, paddingHorizontal: 14 },
  input: { flex: 1, paddingVertical: 12, fontSize: 16, color: colors.textPrimary },
  empty: { color: colors.textSecondary },
  progress: { gap: 12, padding: 18 },
  progressRow: { gap: 2 },
  progressTitle: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: colors.textPrimary },
  progressValue: { fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  progressNote: { fontSize: 13, lineHeight: 18, color: colors.textMuted },
});
