import { useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { miniTaskCopy as copy } from "../../../src/data/foundation-mini-tasks";
import { boomForAngle, inNoGoZone, isTaskFinished, MINI_TASK_HOLD_MS, onTarget, shownWindAngle, type MiniTask as Task } from "../../../src/lib/learning/mini-task";
import { NO_GO_HALF_DEG } from "../../../src/lib/sailing-physics/constants";
import { Button, Slider, Text } from "../design-system/components";
import { colors, spacing } from "../design-system/tokens";
import { useI18n } from "../i18n/context";
import { renderAngleTask } from "../lessons/graphics/drawings";
import { addMiniTaskDone, readMiniTaskDone } from "../persistence/bootcamp";

/** The lesson's own practice: the same rules and drawing as the site (src/app/start/MiniTask.tsx). */
export function MiniTask({ lessonId, task }: { lessonId: string; task: Task }) {
  const { lang } = useI18n();
  const { width: screenWidth } = useWindowDimensions();
  const [angle, setAngle] = useState(task.start);
  const [step, setStep] = useState(0);
  const finished = isTaskFinished(task, step);
  const holding = !finished && onTarget(task, step, angle);

  // A task finished earlier stays finished when the lesson is opened again.
  useEffect(() => {
    let live = true;
    void readMiniTaskDone().then(done => { if (live && done.has(lessonId)) setStep(task.targets.length); });
    return () => { live = false; };
  }, [lessonId, task]);
  useEffect(() => {
    if (!holding) return;
    const timer = setTimeout(() => setStep(current => current + 1), MINI_TASK_HOLD_MS);
    return () => clearTimeout(timer);
  }, [holding, step]);
  useEffect(() => { if (finished) void addMiniTaskDone(lessonId); }, [finished, lessonId]);

  const shown = Math.round(shownWindAngle(angle));
  const target = finished ? null : task.targets[step];
  const svg = renderAngleTask({ angle, boom: boomForAngle(angle), target: target?.angle ?? null, noGo: NO_GO_HALF_DEG, shownAngle: shown, windLabel: copy.wind[lang] });
  return <View style={styles.card} testID="mini-task">
    <Text variant="subtitle">{copy.title[lang]}</Text>
    <Text accessibilityLiveRegion="polite" style={finished ? styles.success : styles.prompt} testID="mini-task-status">
      {finished ? `✓ ${copy.success[lang]}` : holding ? copy.hold[lang] : target?.prompt[lang]}
    </Text>
    {finished ? <Text>{task.done[lang]}</Text> : null}
    <View style={styles.scene} accessible accessibilityRole="image" accessibilityLabel={`${copy.control[lang]}: ${shown}°`}>
      <SvgXml xml={svg} width="100%" height="100%" />
    </View>
    <Slider
      label={copy.control[lang]}
      orientation="horizontal"
      width={screenWidth - spacing.lg * 2}
      value={angle}
      min={task.min}
      max={task.max}
      step={5}
      onChange={value => setAngle(Math.round(value))}
      formatValue={() => `${shown}°`}
    />
    {!finished && inNoGoZone(angle) ? <Text style={styles.note} testID="mini-task-no-go">{copy.noGo[lang]}</Text> : null}
    {finished ? <Button variant="ghost" onPress={() => { setStep(0); setAngle(task.start); }}>{copy.again[lang]}</Button> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, marginBottom: spacing.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  prompt: { fontWeight: "600", minHeight: 48 },
  success: { fontWeight: "600", minHeight: 48, color: colors.success },
  scene: { width: "100%", aspectRatio: 900 / 560, borderRadius: 8, overflow: "hidden" },
  note: { color: colors.textMuted },
});
