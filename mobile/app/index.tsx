import { useCallback, useState } from "react";
import { Stack, useFocusEffect, useRouter, type Href } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useI18n } from "../src/i18n/context";
import { Button, Icon, ListRow, Screen, Text, Wordmark } from "../src/design-system/components";
import { colors } from "../src/design-system/tokens";
import { readNativeLearning } from "../src/persistence/learning";
import { destinations, sections } from "../../src/lib/product/catalog";
import { copy } from "../../src/lib/product/copy";
import { homeCopy, homeLearning, learningTracks, type LearningSnapshot } from "../../src/lib/product/learning";

export default function Home() {
  const { lang } = useI18n();
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<LearningSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    readNativeLearning().then(value => { if (active) { setSnapshot(value); setError(false); } })
      .catch(() => { if (active) { setSnapshot(null); setError(true); } });
    return () => { active = false; };
  }, [attempt]));
  const next = snapshot ? homeLearning(snapshot, lang, "native") : null;
  const settings = destinations.find(d => d.id === "settings")!;
  return <Screen>
    <Stack.Screen options={{ headerShown: false, title: sections[0].title[lang] }} />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.brandRow}>
        <Wordmark size="m" />
        <Pressable accessibilityRole="button" accessibilityLabel={settings.title[lang]} onPress={() => router.push("/settings")} style={styles.settings}><Icon name="gear" size={22} color={colors.textSecondary} /></Pressable>
      </View>
      <Image source={require("../assets/design/sailing-editorial.jpg")} style={styles.hero} accessible={false} resizeMode="cover" />
      <Text variant="title" accessibilityRole="header" style={styles.title}>{homeCopy.title[lang]}</Text>
      <View style={styles.feature}>
        {next ? <>
          <Text style={styles.kicker}>{next.course.title[lang]}{next.minutes ? ` · ${next.minutes} ${copy.minutes[lang]}` : ""}</Text>
          <Text variant="subtitle" accessibilityRole="header" style={styles.featureTitle}>{next.title}</Text>
          {next.total !== null && <View style={styles.progressBlock}>
            <View style={styles.progressLabel}><Text style={styles.note}>{next.metric}</Text><Text style={styles.count}>{next.count}/{next.total}</Text></View>
            <View accessible accessibilityRole="progressbar" accessibilityLabel={next.metric!} accessibilityValue={{ min: 0, max: next.total, now: next.count! }} style={styles.track}><View style={[styles.fill, { width: `${next.count! / next.total * 100}%` }]} /></View>
          </View>}
          {next.total === null && <Text style={styles.note}>{next.detail}</Text>}
          <Button onPress={() => router.push(next.href as Href)}>{next.complete ? homeCopy.review[lang] : next.started ? copy.resume[lang] : copy.start[lang]}</Button>
          {next.href !== next.overview && <Button variant="ghost" onPress={() => router.push(next.overview as Href)}>{copy.overview[lang]}</Button>}
        </> : <View accessibilityLiveRegion="polite">
          <Text accessibilityRole={error ? "alert" : undefined} style={styles.note}>{error ? homeCopy.unavailable[lang] : homeCopy.loading[lang]}</Text>
          {error && <Button variant="ghost" onPress={() => setAttempt(value => value + 1)}>{homeCopy.retry[lang]}</Button>}
        </View>}
      </View>
      <View>
        <Text accessibilityRole="header" style={styles.sectionTitle}>{homeCopy.choose[lang]}</Text>
        {learningTracks.filter(id => id !== next?.course.id).map(id => {
          const entry = destinations.find(d => d.id === id)!;
          return <ListRow key={id} title={entry.title[lang]} caption={entry.detail![lang]} onPress={() => router.push(entry.native as Href)} />;
        })}
      </View>
    </ScrollView>
  </Screen>;
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 28, gap: 24, maxWidth: 680, width: "100%", alignSelf: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 4 },
  settings: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  hero: { width: "100%", height: 136, borderRadius: 18 },
  title: { fontSize: 28, lineHeight: 34, letterSpacing: -0.6 },
  feature: { backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.borderCyanFaint, borderRadius: 12, padding: 20, gap: 14 },
  kicker: { fontSize: 13, lineHeight: 20, color: colors.textSecondary },
  featureTitle: { fontSize: 24, lineHeight: 30 },
  note: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, flexShrink: 1 },
  count: { color: colors.textSecondary, fontSize: 14, lineHeight: 21, fontVariant: ["tabular-nums"] },
  progressBlock: { gap: 8, paddingVertical: 6 },
  progressLabel: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  track: { height: 4, borderRadius: 3, backgroundColor: colors.bgCard, overflow: "hidden" },
  fill: { height: 4, backgroundColor: colors.accentCyan },
  sectionTitle: { fontSize: 16, lineHeight: 24, fontWeight: "600", color: colors.textSecondary, paddingBottom: 12 },
});
