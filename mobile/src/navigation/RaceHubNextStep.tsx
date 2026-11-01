import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useI18n } from "../i18n/context";
import { Button, Text } from "../design-system/components";
import { colors, radii, shadow, spacing } from "../design-system/tokens";
import { BEST_TIMES_STORAGE_KEY, formatRecordTime } from "../../../src/lib/best-times";
import { RACE_MEDALS_STORAGE_KEY, parseMedalStore, type MedalStore } from "../../../src/lib/race-medals";
import { EMPTY_RACE_HOME, RACE_HOME_STORAGE_KEY, parseRaceHomeStore, type RaceHomeStore, type RaceHomeView } from "../../../src/lib/race-next-step";
import { racePracticeNativeHref, racePracticeTitle } from "../../../src/lib/race-practice";
import { RACE_PRACTICE_COPY } from "../../../src/data/race-practice";
import { raceNextStepCopy } from "../../../src/data/race-next-step-copy";
import { fillMedal, medalCourseText } from "../../../src/data/race-medal-copy";
import { copy as productCopy } from "../../../src/lib/product/copy";
import { RaceHubMedal } from "./RaceHubMedal";
import type { HubRaceSetup } from "./race-setup";

export interface RaceHubRows { home: RaceHomeStore; medals: MedalStore; bestTimesRaw: string | null }
const EMPTY_ROWS: RaceHubRows = { home: EMPTY_RACE_HOME, medals: {}, bestTimesRaw: null };

/** The three rows the next step reads, again whenever the hub comes back into
 * focus: the race WebView wrote them through the race bridge
 * (race-web-storage.ts) or the native best-time store (race-personal-best.ts). */
export function useRaceHubRows(enabled = true): RaceHubRows {
  const [rows, setRows] = useState<RaceHubRows>(EMPTY_ROWS);
  useFocusEffect(useCallback(() => {
    if (!enabled) return undefined;
    let live = true;
    AsyncStorage.multiGet([RACE_HOME_STORAGE_KEY, RACE_MEDALS_STORAGE_KEY, BEST_TIMES_STORAGE_KEY]).then(pairs => {
      if (!live) return;
      const get = (key: string) => pairs.find(([k]) => k === key)?.[1] ?? null;
      setRows({ home: parseRaceHomeStore(get(RACE_HOME_STORAGE_KEY)), medals: parseMedalStore(get(RACE_MEDALS_STORAGE_KEY)), bestTimesRaw: get(BEST_TIMES_STORAGE_KEY) });
    }, () => { if (live) setRows(EMPTY_ROWS); });
    return () => { live = false; };
  }, [enabled]));
  return rows;
}

/**
 * M4-6 in the app: the Race hub's ONE next-step card on top (the same choice
 * as the website lobby, src/lib/race-next-step.ts): the last race's goal with
 * its practice, the course medal line with the next medal, or today's daily
 * race; then the record, the medal progress and the days with a race this
 * week (no line at zero, never a streak). One secondary button at most; the
 * hub's primary action stays the start button. No animation.
 */
export function RaceHubNextStep({ view, setup, onOpen }: { view: RaceHomeView; setup: HubRaceSetup; onOpen: (href: string) => void }) {
  const { lang } = useI18n();
  const { step } = view;
  const progress = [
    view.recordSec !== null ? fillMedal(raceNextStepCopy.record[lang], { time: formatRecordTime(view.recordSec) }) : null,
    view.medals.total > 0 ? fillMedal(raceNextStepCopy.medals[lang], { won: String(view.medals.won), total: String(view.medals.total) }) : null,
    view.weekDays > 0 ? fillMedal(raceNextStepCopy.week[lang], { n: String(view.weekDays) }) : null,
  ].filter((line): line is string => line !== null);
  if (!step && !progress.length) return null;
  const dailyLine = fillMedal(raceNextStepCopy.dailyToday[lang], { course: medalCourseText(view.daily.difficulty, view.daily.windStrength, lang) });
  return <View style={styles.card} testID="race-hub-next-step">
    {step && <View style={styles.step}>
      <Text variant="caption" style={styles.eyebrow}>{raceNextStepCopy.eyebrow[lang]}</Text>
      {step.kind === "medal" ? <RaceHubMedal setup={setup} /> : <>
        <Text accessibilityRole="header" style={styles.title}>{step.kind === "goal" ? raceNextStepCopy.goal[step.goal].title[lang] : productCopy.daily[lang]}</Text>
        <Text style={styles.body}>{step.kind === "goal" ? raceNextStepCopy.goal[step.goal].body[lang] : dailyLine}</Text>
      </>}
      {step.kind === "goal" && <Button variant="secondary" onPress={() => onOpen(racePracticeNativeHref(step.practice))}>
        {`${RACE_PRACTICE_COPY.practise[lang]}: ${racePracticeTitle(step.practice, lang)}`}
      </Button>}
      {step.kind === "daily" && <Button variant="secondary" onPress={() => onOpen(`/game?daily=${step.day}`)}>{raceNextStepCopy.dailyGo[lang]}</Button>}
    </View>}
    {progress.length > 0 && <View style={[styles.progress, step && styles.progressDivider]} testID="race-hub-progress">
      {progress.map(line => <Text key={line} variant="caption">{line}</Text>)}
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgCard, borderRadius: radii.card, padding: spacing.lg, gap: spacing.md, ...shadow.card },
  step: { gap: spacing.sm },
  eyebrow: { fontWeight: "600" },
  title: { fontSize: 17, lineHeight: 24, fontWeight: "600", color: colors.textPrimary },
  body: { fontSize: 16, lineHeight: 24, color: colors.textSecondary },
  progress: { gap: spacing.xs },
  progressDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderCyanFaint, paddingTop: spacing.md },
});
