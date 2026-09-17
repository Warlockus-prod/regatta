import { useCallback, useRef, useState } from "react";
import { Stack, useFocusEffect, useRouter, type Href } from "expo-router";
import { Linking, ScrollView, StyleSheet, View } from "react-native";
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

export function SailingCourseScreen({ lessonId }: { lessonId?: string }) {
  const { lang } = useI18n();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [progress, setProgress] = useState<SailProgress | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [selected, setSelected] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const lesson = lessonId ? findSailLesson(lessonId) : undefined;
  useFocusEffect(useCallback(() => {
    let active = true;
    AsyncStorage.getItem(SAIL_PROGRESS_KEY).then(raw => {
      if (active) setProgress(readSailProgress(raw));
    }).catch(() => { if (active) { setProgress(emptySailProgress()); setStorageError(true); } });
    return () => { active = false; };
  }, []));
  const openLesson = (id: string) => router.push({ pathname: "/learn/sails/[lesson]", params: { lesson: id } });
  const next = progress ? nextSailLesson(progress) : sailLessons[0];
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
      <Text style={styles.note}>{sailCourse.scope[lang]}</Text>
      <View style={styles.next}>
        <Text variant="subtitle" accessibilityRole="header">{copy.next[lang]}</Text>
        <Button disabled={!progress} onPress={() => openLesson((next ?? sailLessons[0]).id)}>{next?.title[lang] ?? copy.overview[lang]}</Button>
        <Text style={styles.note}>{progress?.checked.length ?? 0}/{sailLessons.length} · {sailCourse.completed[lang]}</Text>
      </View>
      <View>{sailLessons.map((item, index) => <ListRow key={item.id} title={`${index + 1}. ${item.title[lang]}`} caption={`${item.minutes} ${copy.minutes[lang]}${progress?.checked.includes(item.id) ? ` · ${sailCourse.completed[lang]}` : ""}`} onPress={() => openLesson(item.id)} />)}</View>
      {storageError && <Text accessibilityRole="alert">{sailCourse.savedError[lang]}</Text>}
    </ScrollView>
  </Screen>;
  const index = sailLessons.findIndex(item => item.id === lesson.id);
  const destination = destinations.find(item => item.id === lesson.destination)!;
  const checked = progress?.checked.includes(lesson.id);
  return <Screen noTopInset>
    <Stack.Screen options={{ title: sailCourse.title[lang] }} />
    <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
      <Text style={styles.note}>{index + 1}/{sailLessons.length} · {lesson.minutes} {copy.minutes[lang]}</Text>
      <Text variant="title" accessibilityRole="header">{lesson.title[lang]}</Text>
      <View style={styles.diagram} accessible accessibilityRole="image" accessibilityLabel={diagramCopy[lesson.diagram][lang]}>
        <SvgXml xml={sailDiagram(lesson.diagram, selected)} width="100%" height="100%" />
      </View>
      <Text style={styles.note}>{diagramCopy[lesson.diagram][lang]}</Text>
      {diagramReadout(lesson.diagram, selected, lang) && <Text style={styles.note} accessibilityLiveRegion="polite">{diagramReadout(lesson.diagram, selected, lang)}</Text>}
      <View style={styles.controls}>{diagramOptions(lesson.diagram, lang).map(option => <Button key={option.value} variant={selected === option.value ? "primary" : "secondary"} accessibilityState={{ selected: selected === option.value }} onPress={() => setSelected(option.value)}>{option.label}</Button>)}</View>
      {lesson.diagram === "wind" && <Text style={styles.note}>{diagramCopy.windKeys.map((label, i) => `${i + 1}. ${label[lang]}`).join(" · ")}</Text>}
      {lesson.sections.map((section, i) => <View key={i} style={styles.section}><Text variant="subtitle" accessibilityRole="header">{section.title[lang]}</Text><Text style={styles.body}>{section.body[lang]}</Text></View>)}
      <View style={styles.section}>
        <Text variant="subtitle" accessibilityRole="header">{sailCourse.check[lang]}</Text><Text style={styles.body}>{lesson.question[lang]}</Text>
        {lesson.answers.map((option, i) => <Button key={i} variant={answer === i ? "primary" : "secondary"} accessibilityState={{ selected: answer === i }} onPress={() => setAnswer(i)}>{option[lang]}</Button>)}
        {answer !== null && <View accessibilityLiveRegion="polite" style={styles.section}><Text>{answer === lesson.correct ? sailCourse.correct[lang] : sailCourse.retry[lang]}</Text><Text style={styles.body}>{lesson.explanation[lang]}</Text></View>}
        {checked ? <Text accessibilityLiveRegion="polite">✓ {sailCourse.completed[lang]}</Text> : <Button disabled={!progress || answer !== lesson.correct || saving} onPress={() => { void saveCheck(); }}>{sailCourse.finish[lang]}</Button>}
        {storageError && <Text accessibilityRole="alert">{sailCourse.savedError[lang]}</Text>}
      </View>
      <View style={styles.section}><Text variant="subtitle" accessibilityRole="header">{sailCourse.observe[lang]}</Text><Text style={styles.body}>{lesson.observe[lang]}</Text><Button variant="secondary" onPress={() => router.push(`${destination.native}${lesson.study ? `?study=${lesson.study}` : ""}` as Href)}>{destination.title[lang]}</Button></View>
      <Text style={styles.note}>{sailCourse.safety[lang]}</Text>
      <View style={styles.section}><Text variant="subtitle" accessibilityRole="header">{sailCourse.sources[lang]}</Text>{lesson.sources.map(source => <Button key={source.url} variant="ghost" onPress={() => { void Linking.openURL(source.url).catch(() => {}); }}>{source.title} ↗</Button>)}</View>
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
  diagram: { width: "100%", aspectRatio: 1.5 },
  controls: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
