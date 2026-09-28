import { useState } from "react";
import { Stack, useRouter, type Href } from "expo-router";
import { ImageBackground, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useI18n } from "../src/i18n/context";
import { Button, Card, Icon, Screen, Text } from "../src/design-system/components";
import { colors, radii, shadow } from "../src/design-system/tokens";
import { ruleScenarios } from "../src/data";
import { sailLessons } from "../../src/data/sailing-lab/course";
import { destinations, sections, type Language } from "../../src/lib/product/catalog";
import { copy } from "../../src/lib/product/copy";
import { useLearningSnapshot } from "../src/home/useLearningSnapshot";
import { resolveContinue, type ContinueTarget } from "../src/home/continue";
import { passedLessonIds } from "../src/bootcamp/status";
import { checkedOf, homeCopy, lessonOf, lessonsCount, passedOf, scenariosCount } from "../src/home/copy";

const photos = {
  hero: require("../assets/design/home-hero.jpg"),
  basics: require("../assets/design/course-basics.jpg"),
  sails: require("../assets/design/course-sails.jpg"),
  rules: require("../assets/design/course-rules.jpg"),
  exams: require("../assets/design/course-exams.jpg"),
};

const dest = (id: string) => destinations.find(d => d.id === id)!;

interface ContinueCard {
  eyebrow: string;
  title: string;
  meta: string | null;
  progress: { value: number; max: number; label: string } | null;
  action: string;
  photo: ImageSourcePropType;
  href: Href;
}

type Tp = (ru: string, en: string, pl: string, extra?: Partial<Record<"es" | "fr" | "de" | "it", string>>) => string;

function describe(target: ContinueTarget, lang: Language, tp: Tp): ContinueCard {
  const course = dest("course");
  if (target.course === "radio" || target.course === "motor") {
    const entry = dest(target.course);
    return { eyebrow: homeCopy.lastCourse[lang], title: entry.title[lang], meta: entry.detail?.[lang] ?? null, progress: null, action: copy.resume[lang], photo: photos.exams, href: entry.native as Href };
  }
  if (target.course === "sails") {
    const l = target.lesson;
    return {
      eyebrow: dest("sails").title[lang],
      title: l.title[lang],
      meta: `${lessonOf(target.number, target.total)[lang]} · ${l.minutes} ${copy.minutes[lang]}`,
      progress: { value: target.checked, max: target.total, label: checkedOf(target.checked, target.total)[lang] },
      action: target.state === "start" ? copy.start[lang] : copy.resume[lang],
      photo: photos.sails,
      href: { pathname: "/learn/sails/[lesson]", params: { lesson: l.id } },
    };
  }
  if (target.state === "done") {
    return {
      eyebrow: course.title[lang], title: copy.learned[lang], meta: null,
      progress: { value: target.passed, max: target.total, label: passedOf(target.passed, target.total)[lang] },
      action: sections.find(s => s.id === "race")!.title[lang], photo: photos.basics, href: "/race",
    };
  }
  const l = target.lesson;
  const lessonTitle = tp(l.titleRu, l.titleEn, l.titlePl, { es: l.titleEs, fr: l.titleFr, de: l.titleDe, it: l.titleIt });
  const href: Href = { pathname: "/bootcamp/[id]", params: { id: l.id } };
  if (target.state === "start") {
    return { eyebrow: homeCopy.startHere[lang], title: course.title[lang], meta: course.detail![lang], progress: null, action: copy.start[lang], photo: photos.basics, href };
  }
  return {
    eyebrow: course.title[lang],
    title: lessonTitle,
    meta: `${lessonOf(target.number, target.total)[lang]} · ${l.estMinutes} ${copy.minutes[lang]}`,
    progress: { value: target.passed, max: target.total, label: passedOf(target.passed, target.total)[lang] },
    action: copy.resume[lang],
    photo: photos.basics,
    href,
  };
}

export default function Home() {
  const { lang, tp } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height, fontScale } = useWindowDimensions();
  // Accessibility text sizes: drop the decorative thumbnails so long words
  // (German "funktioniert") get the full width instead of breaking mid-word.
  const roomy = fontScale < 1.6;
  // About 200 pt on a 667 pt phone, up to 300 pt on the largest ones, so the
  // continue action is on the first screen of every iPhone.
  const heroHeight = Math.round(Math.min(300, Math.max(200, height * 0.3)));
  const snapshot = useLearningSnapshot();
  // Light status bar icons on the photo; once the paper sheet reaches the top,
  // a paper strip slides under the status bar and the icons turn dark.
  const [overPaper, setOverPaper] = useState(false);
  const target = snapshot ? resolveContinue(snapshot) : null;
  const card = target ? describe(target, lang, tp as Tp) : null;
  const passed = snapshot ? passedLessonIds(snapshot.bootcamp).size : 0;
  const checked = snapshot?.sail.checked.length ?? 0;
  const paths = [
    { key: "bootcamp", photo: photos.basics, title: dest("course").title[lang], caption: passed ? passedOf(passed, 8)[lang] : lessonsCount(8)[lang], href: "/bootcamp" },
    { key: "sails", photo: photos.sails, title: dest("sails").title[lang], caption: checked ? checkedOf(checked, sailLessons.length)[lang] : lessonsCount(sailLessons.length)[lang], href: dest("sails").native! },
    { key: "rules", photo: photos.rules, title: dest("rules").title[lang], caption: scenariosCount(ruleScenarios.length)[lang], href: dest("rules").native! },
    { key: "exams", photo: photos.exams, title: homeCopy.exams[lang], caption: `SRC · ${dest("motor").title[lang]}`, href: "/learn" },
  ].filter(p => p.key !== target?.course);
  return <Screen noTopInset>
    <Stack.Screen options={{ headerShown: false, title: sections[0].title[lang], statusBarStyle: overPaper ? "dark" : "light", animation: "fade" }} />
    <ScrollView contentContainerStyle={styles.scroll} scrollEventThrottle={32}
      onScroll={e => { const next = e.nativeEvent.contentOffset.y > heroHeight - 28 - insets.top; if (next !== overPaper) setOverPaper(next); }}>
      <ImageBackground source={photos.hero} resizeMode="cover" style={[styles.hero, { minHeight: heroHeight, paddingTop: insets.top + 10 }]} accessibilityIgnoresInvertColors>
        <LinearGradient colors={["rgba(8, 40, 60, 0.6)", "rgba(8, 40, 60, 0)", "rgba(8, 40, 60, 0)", "rgba(8, 40, 60, 0.72)"]} locations={[0, 0.34, 0.45, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.brand} accessible accessibilityRole="header" accessibilityLabel="Week to Regatta">
          <Icon name="sail" size={22} color={colors.onPhoto} />
          <Text style={styles.brandText} maxFontSizeMultiplier={1.3}>{homeCopy.brand}</Text>
        </View>
        <Text style={styles.heroTitle} accessibilityRole="header" maxFontSizeMultiplier={1.4}>{copy.hello[lang]}</Text>
      </ImageBackground>

      <View style={styles.sheet}>
        <Card style={styles.continue}>
          {!card ? <View style={styles.placeholder} accessibilityLabel={copy.next[lang]}>
            <View style={[styles.bar, { width: "40%" }]} /><View style={[styles.bar, styles.barTall, { width: "75%" }]} /><View style={[styles.bar, { width: "55%" }]} />
          </View> : <>
            <View style={styles.next}>
              {roomy && <ImageBackground source={card.photo} style={styles.thumb} imageStyle={styles.thumbImage} accessibilityIgnoresInvertColors />}
              <View style={styles.nextText}>
                <Text variant="eyebrow">{card.eyebrow}</Text>
                <Text style={styles.nextTitle} accessibilityRole="header">{card.title}</Text>
                {card.meta ? <Text style={styles.meta}>{card.meta}</Text> : null}
              </View>
            </View>
            {card.progress && <View style={styles.progress}>
              <View accessibilityRole="progressbar" accessibilityLabel={card.progress.label} accessibilityValue={{ min: 0, max: card.progress.max, now: card.progress.value }} style={styles.track}>
                <View style={[styles.fill, { width: `${(card.progress.value / card.progress.max) * 100}%` }]} />
              </View>
              <Text style={styles.progressLabel}>{card.progress.label}</Text>
            </View>}
          </>}
          <Button size="large" disabled={!card} onPress={() => card && router.push(card.href)} accessibilityLabel={card?.action}>{card ? `${card.action}\u00a0→` : copy.start[lang]}</Button>
        </Card>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle} accessibilityRole="header">{homeCopy.otherPaths[lang]}</Text>
            <Pressable accessibilityRole="link" onPress={() => router.push("/learn")} hitSlop={10} style={styles.sectionLink}>
              <Text style={styles.sectionLinkText}>{homeCopy.allCourses[lang]}</Text>
            </Pressable>
          </View>
          <View style={styles.groupShadow}><View style={styles.group}>
            {paths.map((p, index) => <Pressable key={p.key} accessibilityRole="button" accessibilityLabel={`${p.title}. ${p.caption}`} onPress={() => router.push(p.href as Href)}
              style={({ pressed }) => [styles.path, index < paths.length - 1 && styles.pathBorder, pressed && styles.pathPressed]}>
              {roomy && <ImageBackground source={p.photo} style={styles.pathThumb} imageStyle={styles.pathThumbImage} accessibilityIgnoresInvertColors />}
              <View style={styles.pathText}>
                <Text style={styles.pathTitle}>{p.title}</Text>
                <Text style={styles.pathCaption}>{p.caption}</Text>
              </View>
              <Svg width={8} height={14} viewBox="0 0 8 14" accessibilityElementsHidden importantForAccessibility="no">
                <Path d="M1.5 1.5 6.5 7l-5 5.5" stroke={colors.textMuted} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>)}
          </View></View>
        </View>
        <Text style={styles.credit}>{homeCopy.photoCredit[lang]}</Text>
      </View>
    </ScrollView>
    <View pointerEvents="none" style={[styles.statusStrip, { height: insets.top, opacity: overPaper ? 1 : 0 }]} />
  </Screen>;
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 28 },
  statusStrip: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: colors.bgPrimary, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderCyanFaint },
  hero: { paddingHorizontal: 20, paddingBottom: 48, justifyContent: "space-between", backgroundColor: "#0c4f6e" },
  brand: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 32 },
  brandText: { color: colors.onPhoto, fontSize: 13, fontWeight: "700", letterSpacing: 1.6 },
  heroTitle: { color: colors.onPhoto, fontSize: 30, lineHeight: 36, fontWeight: "700", letterSpacing: -0.4, maxWidth: 360, marginTop: 16, textShadowColor: "rgba(4, 20, 32, 0.45)", textShadowRadius: 12, textShadowOffset: { width: 0, height: 1 } },
  sheet: { marginTop: -28, borderTopLeftRadius: radii.sheet, borderTopRightRadius: radii.sheet, backgroundColor: colors.bgPrimary, paddingTop: 20, paddingHorizontal: 20, gap: 28, maxWidth: 760, width: "100%", alignSelf: "center" },
  continue: { gap: 16, padding: 18 },
  placeholder: { gap: 10, paddingVertical: 6 },
  bar: { height: 12, borderRadius: 6, backgroundColor: colors.sand },
  barTall: { height: 22 },
  next: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  thumb: { width: 72, height: 72 },
  thumbImage: { borderRadius: 14 },
  nextText: { flex: 1, gap: 4 },
  nextTitle: { fontSize: 20, lineHeight: 25, fontWeight: "700", color: colors.textPrimary },
  meta: { fontSize: 14, lineHeight: 20, color: colors.textSecondary },
  progress: { gap: 8 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.sand, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.accentCyan },
  progressLabel: { fontSize: 13, lineHeight: 18, color: colors.textSecondary, fontWeight: "600" },
  section: { gap: 12 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: "700", color: colors.textPrimary, flexShrink: 1 },
  sectionLink: { minHeight: 44, justifyContent: "center" },
  sectionLinkText: { fontSize: 15, fontWeight: "600", color: colors.accentCyan },
  groupShadow: { backgroundColor: colors.bgCard, borderRadius: radii.card, ...shadow.card },
  group: { borderRadius: radii.card, overflow: "hidden" },
  path: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 14, paddingVertical: 12, minHeight: 76 },
  pathBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderCyanFaint },
  pathPressed: { backgroundColor: colors.bgCardHover },
  pathThumb: { width: 56, height: 56 },
  pathThumbImage: { borderRadius: 12 },
  pathText: { flex: 1, gap: 2 },
  pathTitle: { fontSize: 16, lineHeight: 21, fontWeight: "600", color: colors.textPrimary },
  pathCaption: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
  credit: { fontSize: 12, lineHeight: 16, color: colors.textMuted, textAlign: "center" },
});
