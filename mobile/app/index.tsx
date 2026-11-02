import { useCallback, useState } from "react";
import { Stack, useFocusEffect, useRouter, type Href } from "expo-router";
import { ImageBackground, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type ImageSourcePropType } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { useI18n } from "../src/i18n/context";
import { Button, Card, Icon, Screen, Text } from "../src/design-system/components";
import { colors, radii, shadow } from "../src/design-system/tokens";
import { bootcampLessons, ruleScenarios } from "../src/data";
import { sailLessons } from "../../src/data/sailing-lab/course";
import { destinations, sections, type Language } from "../../src/lib/product/catalog";
import { copy } from "../../src/lib/product/copy";
import { hasMeaningfulStep } from "../../src/lib/product/home-entry";
import { useLearningSnapshot } from "../src/home/useLearningSnapshot";
import { homeStepEvidence, resolveContinue, type ContinueTarget } from "../src/home/continue";
import { passedLessonIds } from "../src/bootcamp/status";
import { checkedOf, homeCopy, lessonOf, lessonsCount, passedOf, scenariosCount } from "../src/home/copy";
import { DEFAULT_HUB_SETUP, hubRaceHref } from "../src/navigation/race-setup";
import { readHubSetup } from "../src/persistence/race-hub-setup";

const photos = {
  // Package 9: a still of the real race scene (the same frame as the website), not a bay photo.
  scene: require("../assets/design/race-scene.jpg"),
  basics: require("../assets/design/course-basics.jpg"),
  sails: require("../assets/design/course-sails.jpg"),
  rules: require("../assets/design/course-rules.jpg"),
};

const dest = (id: string) => destinations.find(d => d.id === id)!;
const firstLesson = [...bootcampLessons].sort((a, b) => a.order - b.order)[0];

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
  if (target.course === "sails") {
    const l = target.lesson;
    return {
      eyebrow: dest("sails").title[lang],
      title: l.title[lang],
      meta: `${lessonOf(target.number, target.total)[lang]} · ${l.minutes} ${copy.minutes[lang]}`,
      progress: { value: target.checked, max: target.total, label: checkedOf(target.checked, target.total)[lang] },
      action: copy.resume[lang],
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
  return {
    eyebrow: course.title[lang],
    title: tp(l.titleRu, l.titleEn, l.titlePl, { es: l.titleEs, fr: l.titleFr, de: l.titleDe, it: l.titleIt }),
    meta: `${lessonOf(target.number, target.total)[lang]} · ${l.estMinutes} ${copy.minutes[lang]}`,
    progress: { value: target.passed, max: target.total, label: passedOf(target.passed, target.total)[lang] },
    action: copy.resume[lang],
    photo: photos.basics,
    href: { pathname: "/bootcamp/[id]", params: { id: l.id } },
  };
}

/**
 * Home (package 9, audit K1 and K2). A frame of the real race scene, one value
 * line and exactly ONE primary action: "Start from scratch" for a new learner,
 * the continue card only after a meaningful step (a lesson passed or a sail
 * theory check passed, src/lib/product/home-entry.ts). "Go straight to a race"
 * is a quieter row that plays the Race hub's last setup; the radio and
 * motorboat courses are separate, quieter entrances below.
 */
export default function Home() {
  const { lang, tp } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height, fontScale } = useWindowDimensions();
  // Accessibility text sizes: drop the decorative thumbnails so long words
  // (German "funktioniert") get the full width instead of breaking mid-word.
  const roomy = fontScale < 1.6;
  // About 200 pt on a 667 pt phone, up to 280 pt on the largest ones, so the
  // primary action is on the first screen of every iPhone.
  const heroHeight = Math.round(Math.min(280, Math.max(200, height * 0.28)));
  const snapshot = useLearningSnapshot();
  const [raceHref, setRaceHref] = useState(() => hubRaceHref(DEFAULT_HUB_SETUP));
  useFocusEffect(useCallback(() => {
    let active = true;
    readHubSetup().then(setup => { if (active) setRaceHref(hubRaceHref(setup)); });
    return () => { active = false; };
  }, []));
  // Light status bar icons on the frame; once the paper sheet reaches the top,
  // a paper strip slides under the status bar and the icons turn dark.
  const [overPaper, setOverPaper] = useState(false);
  const returning = snapshot ? hasMeaningfulStep(homeStepEvidence(snapshot)) : false;
  const target = snapshot && returning ? resolveContinue(snapshot) : null;
  const card = target ? describe(target, lang, tp as Tp) : null;
  const passed = snapshot ? passedLessonIds(snapshot.bootcamp).size : 0;
  const checked = snapshot?.sail.checked.length ?? 0;
  const paths = !card ? [] : [
    { key: "bootcamp", photo: photos.basics, title: dest("course").title[lang], caption: passed ? passedOf(passed, 8)[lang] : lessonsCount(8)[lang], href: "/bootcamp" },
    { key: "sails", photo: photos.sails, title: dest("sails").title[lang], caption: checked ? checkedOf(checked, sailLessons.length)[lang] : lessonsCount(sailLessons.length)[lang], href: dest("sails").native! },
    { key: "rules", photo: photos.rules, title: dest("rules").title[lang], caption: scenariosCount(ruleScenarios.length)[lang], href: dest("rules").native! },
  ].filter(p => p.key !== target?.course);
  const exams = ["radio", "motor"].map(dest);
  const chevron = <Svg width={8} height={14} viewBox="0 0 8 14" accessibilityElementsHidden importantForAccessibility="no">
    <Path d="M1.5 1.5 6.5 7l-5 5.5" stroke={colors.textMuted} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
  return <Screen noTopInset>
    <Stack.Screen options={{ headerShown: false, title: sections[0].title[lang], statusBarStyle: overPaper ? "dark" : "light", animation: "fade" }} />
    <ScrollView contentContainerStyle={styles.scroll} scrollEventThrottle={32}
      onScroll={e => { const next = e.nativeEvent.contentOffset.y > heroHeight - 20 - insets.top; if (next !== overPaper) setOverPaper(next); }}>
      <ImageBackground source={photos.scene} resizeMode="cover" style={[styles.hero, { height: heroHeight, paddingTop: insets.top + 10 }]}
        accessible accessibilityRole="image" accessibilityLabel={homeCopy.sceneAlt[lang]} accessibilityIgnoresInvertColors>
        <LinearGradient colors={["rgba(8, 40, 60, 0.62)", "rgba(8, 40, 60, 0)"]} locations={[0, 0.42]} style={StyleSheet.absoluteFill} />
        <View style={styles.brand}>
          <Icon name="sail" size={22} color={colors.onPhoto} />
          <Text style={styles.brandText} maxFontSizeMultiplier={1.3}>{homeCopy.brand[lang]}</Text>
        </View>
      </ImageBackground>

      <View style={styles.sheet}>
        <View style={styles.valueBlock}>
          <Text style={styles.value} accessibilityRole="header" maxFontSizeMultiplier={1.6}>{homeCopy.value[lang]}</Text>
          <Text style={styles.valueDetail}>{homeCopy.valueDetail[lang]}</Text>
        </View>

        <View style={styles.actions}>
          {!snapshot ? <View style={styles.placeholder} accessibilityLabel={copy.next[lang]}>
            <View style={[styles.bar, styles.barTall]} />
          </View> : card ? <Card style={styles.continue}>
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
            <Button size="large" onPress={() => router.push(card.href)} accessibilityLabel={card.action}>{`${card.action} →`}</Button>
          </Card> : <Button size="large" onPress={() => router.push({ pathname: "/bootcamp/[id]", params: { id: firstLesson.id } })}
            accessibilityLabel={homeCopy.startFromScratch[lang]}>{`${homeCopy.startFromScratch[lang]} →`}</Button>}
          {snapshot && <Pressable accessibilityRole="button" accessibilityLabel={homeCopy.straightToRace[lang]} onPress={() => router.push(raceHref as Href)}
            style={({ pressed }) => [styles.raceRow, pressed && styles.pressed]}>
            <Text style={styles.raceRowText}>{homeCopy.straightToRace[lang]}</Text>
            {chevron}
          </Pressable>}
        </View>

        {paths.length > 0 && <View style={styles.section}>
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
              {chevron}
            </Pressable>)}
          </View></View>
        </View>}

        <View style={styles.quiet}>
          <Text style={styles.quietTitle} accessibilityRole="header">{homeCopy.examQuestion[lang]}</Text>
          {exams.map(d => <Pressable key={d.id} accessibilityRole="button" accessibilityLabel={`${d.title[lang]}. ${d.detail?.[lang] ?? ""}`} onPress={() => router.push(d.native as Href)}
            style={({ pressed }) => [styles.quietRow, pressed && styles.pressed]}>
            <View style={styles.pathText}>
              <Text style={styles.quietRowTitle}>{d.title[lang]}</Text>
              {d.detail ? <Text style={styles.pathCaption}>{d.detail[lang]}</Text> : null}
            </View>
            {chevron}
          </Pressable>)}
        </View>
        <Text style={styles.credit}>{homeCopy.sceneCaption[lang]}{paths.length ? `. ${homeCopy.photoCredit[lang]}` : ""}</Text>
      </View>
    </ScrollView>
    <View pointerEvents="none" style={[styles.statusStrip, { height: insets.top, opacity: overPaper ? 1 : 0 }]} />
  </Screen>;
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 28 },
  statusStrip: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: colors.bgPrimary, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderCyanFaint },
  hero: { paddingHorizontal: 20, backgroundColor: "#0c4f6e" },
  brand: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 32 },
  brandText: { color: colors.onPhoto, fontSize: 15, fontWeight: "700", letterSpacing: 0.2 },
  sheet: { marginTop: -20, borderTopLeftRadius: radii.sheet, borderTopRightRadius: radii.sheet, backgroundColor: colors.bgPrimary, paddingTop: 20, paddingHorizontal: 20, gap: 24, maxWidth: 760, width: "100%", alignSelf: "center" },
  valueBlock: { gap: 8 },
  value: { fontSize: 28, lineHeight: 34, fontWeight: "700", letterSpacing: -0.4, color: colors.textPrimary },
  valueDetail: { fontSize: 16, lineHeight: 24, color: colors.textSecondary },
  actions: { gap: 4 },
  continue: { gap: 16, padding: 18 },
  placeholder: { paddingVertical: 4 },
  bar: { height: 12, borderRadius: 6, backgroundColor: colors.sand },
  barTall: { height: 52, borderRadius: radii.control },
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
  // The quieter row: plain text and a chevron, not a second button.
  raceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 48, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderCyanFaint },
  raceRowText: { fontSize: 16, lineHeight: 22, fontWeight: "600", color: colors.textPrimary, flexShrink: 1 },
  pressed: { opacity: 0.7 },
  section: { gap: 12 },
  // Wraps: with large text the link moves under the title instead of squeezing
  // it until a word breaks ("Lernweg/e").
  sectionHead: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", columnGap: 12 },
  sectionTitle: { fontSize: 20, lineHeight: 26, fontWeight: "700", color: colors.textPrimary },
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
  quiet: { gap: 0 },
  quietTitle: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: colors.textSecondary, paddingBottom: 6 },
  quietRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 10, paddingHorizontal: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderCyanFaint },
  quietRowTitle: { fontSize: 16, lineHeight: 21, fontWeight: "500", color: colors.textPrimary },
  credit: { fontSize: 12, lineHeight: 16, color: colors.textMuted, textAlign: "center" },
});
