import { Stack, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useI18n } from "../src/i18n/context";
import { Button, Icon, ListRow, Screen, Text, Wordmark, type IconName } from "../src/design-system/components";
import { useBootcampProgress } from "../src/persistence/bootcamp";
import { summarizeContinue } from "../src/bootcamp/days";
import { bootcampLessons } from "../src/data";
import { colors } from "../src/design-system/tokens";
import { destinations, sections } from "../../src/lib/product/catalog";
import { copy } from "../../src/lib/product/copy";

export default function Home() {
  const { lang, tp } = useI18n();
  const router = useRouter();
  const { completedIds, lastViewedLessonId, ready } = useBootcampProgress();
  const state = summarizeContinue(completedIds, lastViewedLessonId);
  const completed = bootcampLessons.filter(l => completedIds.has(l.id)).length;
  const started = ready && Boolean(lastViewedLessonId || completed);
  const next = state.nextLesson;
  const course = destinations.find(d => d.id === "course")!;
  const title = next ? tp(next.titleRu, next.titleEn, next.titlePl, { es: next.titleEs, fr: next.titleFr, de: next.titleDe, it: next.titleIt }) : "";
  const settings = destinations.find(d => d.id === "settings")!;
  return <Screen>
    <Stack.Screen options={{ headerShown: false, title: sections[0].title[lang] }} />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.brandRow}>
        <Wordmark size="m" />
        <Pressable accessibilityRole="button" accessibilityLabel={settings.title[lang]} onPress={() => router.push("/settings")} style={styles.settings}><Icon name="gear" size={22} color={colors.textSecondary} /></Pressable>
      </View>
      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header" style={styles.title}>{copy.hello[lang]}</Text>
        <Text style={styles.intro}>{copy.intro[lang]}</Text>
      </View>
      <View style={styles.feature}>
        <Text style={styles.kicker}>{started ? `${copy.next[lang]} · ${completed}/${bootcampLessons.length}` : copy.next[lang]}</Text>
        <Text variant="subtitle" accessibilityRole="header" style={styles.featureTitle}>{state.allDone ? copy.learned[lang] : started ? title : course.title[lang]}</Text>
        <Text style={styles.description}>{started && next ? `${next.estMinutes} ${copy.minutes[lang]}` : course.detail![lang]}</Text>
        {started && <View accessibilityRole="progressbar" accessibilityLabel={copy.viewed[lang]} accessibilityValue={{ min: 0, max: bootcampLessons.length, now: completed }} style={styles.track}><View style={[styles.fill, { width: `${completed / bootcampLessons.length * 100}%` }]} /></View>}
        <Button disabled={!ready} onPress={() => state.allDone ? router.push("/race") : next ? router.push({ pathname: "/bootcamp/[id]", params: { id: next.id } }) : router.push("/bootcamp")}>{state.allDone ? sections.find(s => s.id === "race")!.title[lang] : started ? copy.resume[lang] : copy.start[lang]}</Button>
        <Button variant="ghost" onPress={() => router.push("/bootcamp")}>{copy.overview[lang]}</Button>
      </View>
      <View>{sections.filter(s => s.id === "practice" || s.id === "race").map(s => <ListRow key={s.id} icon={s.icon as IconName} title={s.title[lang]} caption={s.description[lang]} onPress={() => s.id === "practice" ? router.push("/simulators") : router.push("/race")} />)}</View>
      <Button variant="ghost" onPress={() => router.push("/learn")}>{copy.exam[lang]}</Button>
    </ScrollView>
  </Screen>;
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 28, gap: 24, maxWidth: 760, width: "100%", alignSelf: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4 },
  settings: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  header: { gap: 12 },
  title: { fontSize: 30, lineHeight: 35, letterSpacing: -0.6 },
  intro: { color: colors.textSecondary, fontSize: 16, lineHeight: 24 },
  feature: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.borderCyanFaint, borderRadius: 16, padding: 20, gap: 12 },
  kicker: { fontSize: 13, color: colors.accentCyan, fontWeight: "600" },
  featureTitle: { fontSize: 22, lineHeight: 28 },
  description: { color: colors.textSecondary, fontSize: 15, lineHeight: 23, marginBottom: 8 },
  track: { height: 5, borderRadius: 3, backgroundColor: colors.bgCard, overflow: "hidden", marginBottom: 8 },
  fill: { height: 5, backgroundColor: colors.accentCyan },
});
