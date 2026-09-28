import { useState } from "react";
import { Stack, useRouter, type Href } from "expo-router";
import { ImageBackground, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../src/i18n/context";
import { Button, Card, Icon, Screen, Text, type IconName } from "../src/design-system/components";
import { colors, radii } from "../src/design-system/tokens";
import { summarizeContinue } from "../src/bootcamp/days";
import { bootcampLessons, ruleScenarios } from "../src/data";
import { sailLessons } from "../../src/data/sailing-lab/course";
import { destinations, sections } from "../../src/lib/product/catalog";
import { copy } from "../../src/lib/product/copy";
import { MenuButton } from "../src/navigation/MenuButton";
import { useLearningSnapshot } from "../src/home/useLearningSnapshot";
import { PhotoCard } from "../src/home/PhotoCard";
import { doneCount, homeCopy, lessonOf, lessonsCount, scenariosCount } from "../src/home/copy";

const photos = {
  hero: require("../assets/design/home-hero.jpg"),
  basics: require("../assets/design/course-basics.jpg"),
  sails: require("../assets/design/course-sails.jpg"),
  rules: require("../assets/design/course-rules.jpg"),
  exams: require("../assets/design/course-exams.jpg"),
  race: require("../assets/design/race-card.jpg"),
};

const dest = (id: string) => destinations.find(d => d.id === id)!;
const TILES: { id: string; icon: IconName }[] = [
  { id: "glossary", icon: "glossary" },
  { id: "anatomy", icon: "parts" },
  { id: "onboard", icon: "onboard" },
  { id: "checklist", icon: "check" },
  { id: "spots", icon: "wind" },
  { id: "gallery", icon: "gallery" },
];

export default function Home() {
  const { lang, tp } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const snapshot = useLearningSnapshot();
  // Light status bar icons on the photo; once the paper sheet reaches the top,
  // a paper strip slides under the status bar and the icons turn dark.
  const [overPaper, setOverPaper] = useState(false);
  const total = bootcampLessons.length;
  const completedIds = snapshot?.completedIds ?? new Set<string>();
  const state = summarizeContinue(completedIds, snapshot?.lastViewedLessonId ?? null);
  const completed = bootcampLessons.filter(l => completedIds.has(l.id)).length;
  const started = Boolean(snapshot && (snapshot.lastViewedLessonId || completed));
  const next = state.nextLesson;
  const nextNumber = next ? bootcampLessons.findIndex(l => l.id === next.id) + 1 : 0;
  const sailDone = snapshot ? sailLessons.filter(l => snapshot.sail.checked.includes(l.id)).length : 0;
  const showStats = Boolean(snapshot && (started || sailDone || snapshot.races));
  const course = dest("course");
  const nextTitle = next ? tp(next.titleRu, next.titleEn, next.titlePl, { es: next.titleEs, fr: next.titleFr, de: next.titleDe, it: next.titleIt }) : "";
  const eyebrow = state.allDone ? homeCopy.courseDone[lang] : started ? `${homeCopy.nextLesson[lang]} · ${lessonOf(nextNumber, total)[lang]}` : homeCopy.startHere[lang];
  const heading = state.allDone ? copy.learned[lang] : started ? nextTitle : course.title[lang];
  const meta = state.allDone ? null : started && next ? `${next.estMinutes} ${copy.minutes[lang]}` : course.detail![lang];
  const action = state.allDone ? sections.find(s => s.id === "race")!.title[lang] : started ? copy.resume[lang] : copy.start[lang];
  const go = () => state.allDone ? router.push("/race") : next ? router.push({ pathname: "/bootcamp/[id]", params: { id: next.id } }) : router.push("/bootcamp");
  const paths = [
    { key: "basics", source: photos.basics, title: course.title[lang], caption: [lessonsCount(total)[lang], completed ? doneCount(completed)[lang] : null].filter(Boolean).join(" · "), href: "/bootcamp" },
    { key: "sails", source: photos.sails, title: dest("sails").title[lang], caption: [lessonsCount(sailLessons.length)[lang], sailDone ? doneCount(sailDone)[lang] : null].filter(Boolean).join(" · "), href: dest("sails").native! },
    { key: "rules", source: photos.rules, title: dest("rules").title[lang], caption: scenariosCount(ruleScenarios.length)[lang], href: dest("rules").native! },
    { key: "exams", source: photos.exams, title: homeCopy.exams[lang], caption: `SRC · ${dest("motor").title[lang]}`, href: "/learn" },
  ];
  return <Screen noTopInset>
    <Stack.Screen options={{ headerShown: false, title: sections[0].title[lang], statusBarStyle: overPaper ? "dark" : "light", animation: "fade" }} />
    <ScrollView contentContainerStyle={styles.scroll} scrollEventThrottle={32}
      onScroll={e => { const next = e.nativeEvent.contentOffset.y > HERO_HEIGHT - 28 - insets.top; if (next !== overPaper) setOverPaper(next); }}>
      <ImageBackground source={photos.hero} resizeMode="cover" style={[styles.hero, { paddingTop: insets.top + 6 }]} accessibilityIgnoresInvertColors>
        <LinearGradient colors={["rgba(8, 40, 60, 0.6)", "rgba(8, 40, 60, 0)", "rgba(8, 40, 60, 0)", "rgba(8, 40, 60, 0.7)"]} locations={[0, 0.34, 0.5, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.brandRow}>
          <View style={styles.brand} accessible accessibilityRole="header" accessibilityLabel="Week to Regatta">
            <Icon name="sail" size={22} color={colors.onPhoto} />
            <Text style={styles.brandText}>{homeCopy.brand}</Text>
          </View>
          <MenuButton tone="onPhoto" />
        </View>
        <Text style={styles.heroTitle} accessibilityRole="header">{copy.hello[lang]}</Text>
      </ImageBackground>

      <View style={styles.sheet}>
        <Card style={styles.continue}>
          {!snapshot ? <View style={styles.placeholder} accessibilityLabel={copy.next[lang]}>
            <View style={[styles.bar, { width: "40%" }]} /><View style={[styles.bar, styles.barTall, { width: "75%" }]} /><View style={[styles.bar, { width: "55%" }]} />
          </View> : <>
            {showStats && <View style={styles.stats}>
              <Stat value={`${completed}/${total}`} label={homeCopy.statLessons[lang]} />
              <View style={styles.statDivider} />
              <Stat value={`${sailDone}/${sailLessons.length}`} label={homeCopy.statSails[lang]} />
              <View style={styles.statDivider} />
              <Stat value={`${snapshot.races}`} label={homeCopy.statRaces[lang]} />
            </View>}
            <View style={styles.next}>
              <ImageBackground source={photos.basics} style={styles.thumb} imageStyle={styles.thumbImage} accessibilityIgnoresInvertColors />
              <View style={styles.nextText}>
                <Text variant="eyebrow">{eyebrow}</Text>
                <Text style={styles.nextTitle} accessibilityRole="header">{heading}</Text>
                {meta ? <Text style={styles.meta}>{meta}</Text> : null}
              </View>
            </View>
            {(started || state.allDone) && <View accessibilityRole="progressbar" accessibilityLabel={copy.viewed[lang]} accessibilityValue={{ min: 0, max: total, now: completed }} style={styles.track}>
              <View style={[styles.fill, { width: `${(completed / total) * 100}%` }]} />
            </View>}
          </>}
          <Button size="large" disabled={!snapshot} onPress={go} accessibilityLabel={action}>{`${action}  →`}</Button>
        </Card>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle} accessibilityRole="header">{homeCopy.paths[lang]}</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push("/learn")} hitSlop={10} style={styles.sectionLink}>
              <Text style={styles.sectionLinkText}>{homeCopy.allCourses[lang]}</Text>
            </Pressable>
          </View>
          {[paths.slice(0, 2), paths.slice(2)].map((row, index) => <View key={index} style={styles.row}>
            {row.map(p => <PhotoCard key={p.key} source={p.source} title={p.title} caption={p.caption} onPress={() => router.push(p.href as Href)} style={styles.half} />)}
          </View>)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">{homeCopy.more[lang]}</Text>
          <PhotoCard source={photos.race} height={168} eyebrow={sections.find(s => s.id === "race")!.title[lang]} title={dest("solo").title[lang]} caption={dest("solo").detail?.[lang]} onPress={() => router.push(dest("solo").native as Href)} />
          <View style={styles.tiles}>
            {TILES.map(t => {
              const entry = dest(t.id);
              return <Pressable key={t.id} accessibilityRole="button" accessibilityLabel={[entry.title[lang], entry.online ? copy.online[lang] : null].filter(Boolean).join(". ")}
                onPress={() => router.push(entry.native as Href)} style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}>
                <Icon name={t.icon} size={24} color={colors.accentCyan} />
                <Text style={styles.tileTitle} numberOfLines={3}>{entry.title[lang]}</Text>
                {entry.online ? <Text style={styles.tileCaption}>{copy.online[lang]}</Text> : null}
              </Pressable>;
            })}
          </View>
        </View>
        <Text style={styles.credit}>{homeCopy.photoCredit[lang]}</Text>
      </View>
    </ScrollView>
    <View pointerEvents="none" style={[styles.statusStrip, { height: insets.top, opacity: overPaper ? 1 : 0 }]} />
  </Screen>;
}

function Stat({ value, label }: { value: string; label: string }) {
  return <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
  </View>;
}

const HERO_HEIGHT = 318;

const styles = StyleSheet.create({
  scroll: { paddingBottom: 28 },
  statusStrip: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: colors.bgPrimary, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderCyanFaint },
  hero: { minHeight: HERO_HEIGHT, paddingHorizontal: 20, paddingBottom: 52, justifyContent: "space-between", backgroundColor: "#0c4f6e" },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandText: { color: colors.onPhoto, fontSize: 13, fontWeight: "700", letterSpacing: 1.6 },
  heroTitle: { color: colors.onPhoto, fontSize: 30, lineHeight: 36, fontWeight: "700", letterSpacing: -0.4, maxWidth: 340, textShadowColor: "rgba(4, 20, 32, 0.45)", textShadowRadius: 12, textShadowOffset: { width: 0, height: 1 } },
  sheet: { marginTop: -28, borderTopLeftRadius: radii.sheet, borderTopRightRadius: radii.sheet, backgroundColor: colors.bgPrimary, paddingTop: 20, paddingHorizontal: 20, gap: 32, maxWidth: 760, width: "100%", alignSelf: "center" },
  continue: { gap: 16, padding: 18 },
  placeholder: { gap: 10, paddingVertical: 6 },
  bar: { height: 12, borderRadius: 6, backgroundColor: colors.sand },
  barTall: { height: 22 },
  stats: { flexDirection: "row", alignItems: "stretch", paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderCyanFaint },
  stat: { flex: 1, alignItems: "center", gap: 2 },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.borderCyanFaint },
  statValue: { fontSize: 20, lineHeight: 24, fontWeight: "700", color: colors.textPrimary, fontVariant: ["tabular-nums"] },
  statLabel: { fontSize: 13, lineHeight: 17, color: colors.textSecondary },
  next: { flexDirection: "row", gap: 14, alignItems: "center" },
  thumb: { width: 72, height: 72 },
  thumbImage: { borderRadius: 14 },
  nextText: { flex: 1, gap: 4 },
  nextTitle: { fontSize: 20, lineHeight: 25, fontWeight: "700", color: colors.textPrimary },
  meta: { fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.sand, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.accentCyan },
  section: { gap: 12 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: "700", color: colors.textPrimary },
  sectionLink: { minHeight: 44, justifyContent: "center" },
  sectionLinkText: { fontSize: 15, fontWeight: "600", color: colors.accentCyan },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  tile: { flexBasis: "47%", flexGrow: 1, minHeight: 104, padding: 14, gap: 8, borderRadius: 16, backgroundColor: colors.bgCard, shadowColor: "#123247", shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  tilePressed: { backgroundColor: colors.bgCardHover },
  tileTitle: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: colors.textPrimary },
  tileCaption: { fontSize: 12, lineHeight: 16, color: colors.textSecondary },
  credit: { fontSize: 12, lineHeight: 16, color: colors.textMuted, textAlign: "center" },
});
