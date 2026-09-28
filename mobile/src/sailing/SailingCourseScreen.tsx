import { useCallback, useRef, useState } from "react";
import { Stack, useFocusEffect, useRouter, type Href } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SvgXml } from "react-native-svg";
import { Button, ListRow, Screen, Text } from "../design-system/components";
import { colors } from "../design-system/tokens";
import { useI18n } from "../i18n/context";
import { destinations } from "../../../src/lib/product/catalog";
import { copy } from "../../../src/lib/product/copy";
import { findSailLesson, sailCourse, sailLessons } from "../../../src/data/sailing-lab/course";
import { checkSailTheory, emptySailProgress, nextSailLesson, readSailProgress, SAIL_PROGRESS_KEY, type SailProgress } from "../../../src/features/sailing-lab/lessons/progress";
import { diagramCopy, diagramOptions, diagramReadout, sailDiagram } from "../../../src/features/sailing-lab/lessons/diagrams";
import { courseModules, learningCopy, lessonSteps, lessonTermIds, lessonTerms, type LessonStep } from "../../../src/data/sailing-lab/learning-path";
import { assessmentCopy } from "../../../src/data/sailing-lab/assessment-copy";
import { readBookmark, useLearningBookmark } from "../persistence/learning-bookmark";
import { sailPilots } from "../lessons/pilots";
import { HowItWorks, LessonIntro, LessonMistake, LessonPhoto, LessonScene } from "../lessons/LessonBlocks";
import { LineBench } from "./LineBench";

/**
 * Sail course: the outline grouped by module, and one lesson in three steps
 * (understand, check, on the boat). Steps are navigation, never evidence: only
 * the saved theory check records progress. Lessons on the v3 template
 * (src/lessons/pilots.ts) show their image and "How it works" inside the first
 * step. Keyed by lesson, so the step and the answer reset on a lesson change.
 */
export function SailingCourseScreen({ lessonId }: { lessonId?: string }) {
  return <CourseContent key={lessonId ?? "outline"} lessonId={lessonId} />;
}

function CourseContent({ lessonId }: { lessonId?: string }) {
  const { lang } = useI18n();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState<LessonStep>("understand");
  const [termsOpen, setTermsOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const moveTo = (nextStep: LessonStep) => {
    setStep(nextStep);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };
  const [progress, setProgress] = useState<SailProgress | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [selected, setSelected] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  // The last sail lesson the learner opened (bookmark), so this overview and
  // Home offer the same next lesson.
  const [position, setPosition] = useState<string | null>(null);
  const lesson = lessonId ? findSailLesson(lessonId) : undefined;
  useLearningBookmark("sails", lesson?.id ?? null);
  useFocusEffect(useCallback(() => {
    let active = true;
    AsyncStorage.getItem(SAIL_PROGRESS_KEY).then(raw => {
      if (active) setProgress(readSailProgress(raw));
    }).catch(() => { if (active) { setProgress(emptySailProgress()); setStorageError(true); } });
    readBookmark().then(b => { if (active) setPosition(b?.positions?.sails ?? null); });
    return () => { active = false; };
  }, []));
  const openLesson = (id: string) => router.push({ pathname: "/learn/sails/[lesson]", params: { lesson: id } });
  const resumed = position && progress && !progress.checked.includes(position) ? findSailLesson(position) : undefined;
  const next = progress ? resumed ?? nextSailLesson(progress) : sailLessons[0];
  const saveCheck = async () => {
    if (!lesson || !progress || answer === null || saving) return;
    const updated = checkSailTheory(progress, lesson.id, answer);
    setSaving(true);
    try { await AsyncStorage.setItem(SAIL_PROGRESS_KEY, JSON.stringify(updated)); setProgress(updated); setStorageError(false); }
    catch { setStorageError(true); }
    finally { setSaving(false); }
  };
  if (lessonId && !lesson) return <Screen noTopInset>
    <Stack.Screen options={{ title: sailCourse.title[lang] }} />
    <View style={styles.content}><Text>{copy.empty[lang]}</Text><Button onPress={() => router.replace("/learn/sails")}>{sailCourse.back[lang]}</Button></View>
  </Screen>;
  if (!lesson) return <Screen noTopInset>
    <Stack.Screen options={{ title: sailCourse.title[lang] }} />
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.intro}>{sailCourse.intro[lang]}</Text>
      <View style={styles.next}>
        <Text variant="subtitle" accessibilityRole="header">{next ? copy.next[lang] : learningCopy.review[lang]}</Text>
        <Button disabled={!progress} onPress={() => openLesson((next ?? sailLessons[0]).id)}>{next?.title[lang] ?? learningCopy.review[lang]}</Button>
        <Text style={styles.note}>{progress?.checked.length ?? 0}/{sailLessons.length} · {sailCourse.completed[lang]}</Text>
      </View>
      <Text variant="subtitle" accessibilityRole="header">{learningCopy.outline[lang]}</Text>
      {courseModules.map(module => <View key={module.id} style={styles.section}>
        <Text accessibilityRole="header" style={styles.moduleTitle}>{module.title[lang]}</Text>
        <View>{module.lessons.map(id => {
          const item = findSailLesson(id)!;
          return <ListRow key={id} title={`${sailLessons.indexOf(item) + 1}. ${item.title[lang]}`} caption={`${item.minutes} ${copy.minutes[lang]}${progress?.checked.includes(id) ? ` · ${sailCourse.completed[lang]}` : ""}`} onPress={() => openLesson(id)} />;
        })}</View>
      </View>)}
      <Text style={styles.note}>{sailCourse.scope[lang]}</Text>
      {storageError && <Text accessibilityRole="alert">{sailCourse.savedError[lang]}</Text>}
    </ScrollView>
  </Screen>;
  const index = sailLessons.findIndex(item => item.id === lesson.id);
  const destination = destinations.find(item => item.id === lesson.destination)!;
  const checked = progress?.checked.includes(lesson.id);
  const pilot = sailPilots[lesson.id];
  return <Screen noTopInset>
    <Stack.Screen options={{ title: sailCourse.title[lang] }} />
    <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
      <Text style={styles.note}>{index + 1}/{sailLessons.length} · {lesson.minutes} {copy.minutes[lang]}</Text>
      <Text variant="title" accessibilityRole="header">{lesson.title[lang]}</Text>
      <View style={styles.steps} accessibilityLabel={learningCopy.steps[lang]}>{lessonSteps.map((item, i) => <Pressable key={item} accessibilityRole="button" accessibilityLabel={`${i + 1}. ${learningCopy[item][lang]}`} accessibilityState={{ selected: step === item }} onPress={() => moveTo(item)} style={[styles.step, step === item && styles.stepActive]}><Text style={styles.stepNumber}>{i + 1}</Text><Text style={[styles.stepLabel, step === item && styles.stepLabelActive]}>{learningCopy[item][lang]}</Text></Pressable>)}</View>
      <Text variant="subtitle" accessibilityRole="header" accessibilityLiveRegion="polite">{learningCopy[step][lang]}</Text>
      {step === "understand" && <>
        {pilot ? <>
          {/* v3 lesson template: recognise the thing on the image, then the drawing as "How it works". */}
          <LessonIntro pilot={pilot} />
          {pilot.photo && <LessonPhoto photo={pilot.photo} />}
          {pilot.sceneRole === "lead" ? <LessonScene pilot={pilot} /> : <HowItWorks pilot={pilot} />}
        </> : <>
          <View style={styles.diagram} accessible accessibilityRole="image" accessibilityLabel={diagramCopy[lesson.diagram][lang]}>
            <SvgXml xml={sailDiagram(lesson.diagram, selected)} width="100%" height="100%" />
          </View>
          <Text style={styles.note}>{diagramCopy[lesson.diagram][lang]}</Text>
          {diagramReadout(lesson.diagram, selected, lang) && <Text style={styles.note} accessibilityLiveRegion="polite">{diagramReadout(lesson.diagram, selected, lang)}</Text>}
          <View style={styles.controls}>{diagramOptions(lesson.diagram, lang).map(option => <Button key={option.value} variant={selected === option.value ? "primary" : "secondary"} accessibilityState={{ selected: selected === option.value }} onPress={() => setSelected(option.value)}>{option.label}</Button>)}</View>
          {lesson.diagram === "wind" && <Text style={styles.note}>{diagramCopy.windKeys.map((label, i) => `${i + 1}. ${label[lang]}`).join(" · ")}</Text>}
        </>}
        {(lessonTermIds[lesson.id] ?? []).length > 0 && <View style={styles.terms}>
          <Button variant="ghost" accessibilityState={{ expanded: termsOpen }} onPress={() => setTermsOpen(value => !value)}>{learningCopy.terms[lang]}</Button>
          {termsOpen && lessonTermIds[lesson.id]!.map(id => <View key={id} style={styles.section}><Text style={styles.moduleTitle}>{lessonTerms[id].name[lang]}</Text><Text style={styles.body}>{lessonTerms[id].meaning[lang]}</Text></View>)}
        </View>}
        {lesson.sections.map((section, i) => <View key={i} style={styles.section}><Text variant="subtitle" accessibilityRole="header">{section.title[lang]}</Text><Text style={styles.body}>{section.body[lang]}</Text></View>)}
        {pilot && <LessonMistake pilot={pilot} />}
        <View style={styles.section}><Button variant="ghost" accessibilityState={{ expanded: sourcesOpen }} onPress={() => setSourcesOpen(value => !value)}>{sailCourse.sources[lang]}</Button>{sourcesOpen && lesson.sources.map(source => <Button key={source.url} variant="ghost" onPress={() => { void Linking.openURL(source.url).catch(() => {}); }}>{source.title} ↗</Button>)}</View>
        <Button onPress={() => moveTo("check")}>{learningCopy.toCheck[lang]}</Button>
      </>}
      {step === "check" && <>
        <View style={styles.section}>
          <Text variant="subtitle" accessibilityRole="header">{sailCourse.check[lang]}</Text><Text style={styles.body}>{lesson.question[lang]}</Text>
          {lesson.answers.map((option, i) => <Button key={i} variant={answer === i ? "primary" : "secondary"} accessibilityState={{ selected: answer === i }} onPress={() => setAnswer(i)}>{option[lang]}</Button>)}
          {answer !== null && <View accessibilityLiveRegion="polite" style={styles.section}><Text>{answer === lesson.correct ? sailCourse.correct[lang] : sailCourse.retry[lang]}</Text><Text style={styles.body}>{lesson.explanation[lang]}</Text></View>}
          {checked ? <Text accessibilityLiveRegion="polite">✓ {sailCourse.completed[lang]}</Text> : <Button disabled={!progress || answer !== lesson.correct || saving} onPress={() => { void saveCheck(); }}>{sailCourse.finish[lang]}</Button>}
          {storageError && <Text accessibilityRole="alert">{sailCourse.savedError[lang]}</Text>}
          <Text style={styles.note}>{learningCopy.theoryOnly[lang]}</Text>
        </View>
        <Button variant="secondary" onPress={() => moveTo("try")}>{learningCopy.toTry[lang]}</Button>
        <Button variant="ghost" onPress={() => moveTo("understand")}>{learningCopy.toTheory[lang]}</Button>
      </>}
      {step === "try" && <>
        {lesson.practice === "line-bench" ? <LineBench lang={lang} /> : <>
          <Text style={styles.note}>{learningCopy.observeOnly[lang]}</Text>
          <View style={styles.section}><Text variant="subtitle" accessibilityRole="header">{sailCourse.observe[lang]}</Text><Text style={styles.body}>{lesson.observe[lang]}</Text><Button onPress={() => router.push(`${destination.native}${lesson.study ? `?study=${lesson.study}` : ""}` as Href)}>{destination.title[lang]}</Button></View>
          <Text style={styles.note}>{learningCopy.sessionNote[lang]}</Text>
        </>}
        {lesson.id === "outhaul" && <View style={styles.section}>
          <Text variant="subtitle" accessibilityRole="header">{assessmentCopy.title[lang]}</Text><Text style={styles.body}>{assessmentCopy.intro[lang]}</Text>
          {(["twist", "depth"] as const).map(task => <Button variant="secondary" key={task} onPress={() => router.push(`/simulator-v3?assessment=${task}` as Href)}>{assessmentCopy[task][lang]}</Button>)}
          <Text style={styles.note}>{assessmentCopy.temporary[lang]}</Text>
        </View>}
        <Text style={styles.note}>{sailCourse.safety[lang]}</Text>
      </>}
      {sailLessons[index + 1] && <Button onPress={() => openLesson(sailLessons[index + 1].id)}>{sailCourse.next[lang]}</Button>}
      <Button variant="ghost" onPress={() => router.navigate("/learn/sails")}>{sailCourse.back[lang]}</Button>
    </ScrollView>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 36, gap: 24, maxWidth: 780, width: "100%", alignSelf: "center" },
  intro: { fontSize: 18, lineHeight: 28, color: colors.textSecondary },
  body: { fontSize: 16, lineHeight: 26 },
  note: { fontSize: 14, lineHeight: 22, color: colors.textSecondary },
  next: { borderWidth: 1, borderColor: colors.borderCyanFaint, backgroundColor: colors.bgSecondary, borderRadius: 12, padding: 20, gap: 14 },
  section: { gap: 14 },
  moduleTitle: { fontSize: 16, lineHeight: 24, fontWeight: "600" },
  steps: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.borderCyanFaint },
  step: { flex: 1, minHeight: 64, paddingHorizontal: 4, paddingVertical: 10, alignItems: "center", justifyContent: "center", gap: 4, borderBottomWidth: 3, borderBottomColor: "transparent" },
  stepActive: { borderBottomColor: colors.accentCyan },
  stepNumber: { fontSize: 12, color: colors.textSecondary },
  stepLabel: { fontSize: 14, lineHeight: 20, textAlign: "center", color: colors.textSecondary },
  stepLabelActive: { color: colors.accentCyan, fontWeight: "600" },
  terms: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.borderCyanFaint, paddingVertical: 12, gap: 16 },
  diagram: { width: "100%", aspectRatio: 1.5 },
  controls: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
