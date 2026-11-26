import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useI18n } from "../i18n/context";
import { Text } from "../design-system/components";
import { colors, spacing } from "../design-system/tokens";
import { useVenue } from "../persistence/venue";
import { RACE_MEDALS_STORAGE_KEY, courseMedal, medalThresholds, nextMedalGoal, parseMedalStore, type MedalCourse, type MedalStore, type RaceMedal } from "../../../src/lib/race-medals";
import { LEGACY_RACE_CONTEXT } from "../../../src/lib/race-context";
import { fillMedal, medalCourseText, medalGoalText, raceMedalCopy } from "../../../src/data/race-medal-copy";
import { hubMissions, type HubRaceSetup } from "./race-setup";

/** The medal course the hub's start opens: a first race is easy with medium wind, a mission its own level and wind. */
export function hubMedalCourse(setup: HubRaceSetup): MedalCourse {
  if (setup.preset === "mission") {
    const mission = hubMissions.find(m => m.id === setup.missionId) ?? hubMissions[0];
    return { raceContext: LEGACY_RACE_CONTEXT, difficulty: mission.difficulty, windStrength: mission.windStrength };
  }
  return setup.preset === "learn" ? { raceContext: LEGACY_RACE_CONTEXT, difficulty: "easy", windStrength: "medium" }
    : { raceContext: LEGACY_RACE_CONTEXT, difficulty: setup.difficulty, windStrength: setup.wind };
}

/** Metal tones, as on the web (src/app/game/RaceMedal.tsx); the outline is the text colour. */
const MEDAL_FILL: Record<RaceMedal, string> = { bronze: "#b87333", silver: "#a7b0b9", gold: "#d4a72c" };

/**
 * M4-5 in the app's race menu: the medal of the course the hub's start opens
 * and its next goal, the same line as the web race menu (RaceMedalLine). The
 * race WebView writes the medal row and the race bridge stores it in
 * AsyncStorage (race-web-storage.ts); the hub reads it again whenever it
 * comes back into focus, so a medal won in the race shows on return. Text
 * only, no action, not cyan, no animation.
 */
export function RaceHubMedal({ setup }: { setup: HubRaceSetup }) {
  const { lang } = useI18n();
  const { mode } = useVenue();
  const [store, setStore] = useState<MedalStore>({});
  useFocusEffect(useCallback(() => {
    let live = true;
    AsyncStorage.getItem(RACE_MEDALS_STORAGE_KEY).then(raw => { if (live) setStore(parseMedalStore(raw)); }, () => { if (live) setStore({}); });
    return () => { live = false; };
  }, []));
  const course = hubMedalCourse(setup);
  if (!medalThresholds(course)) return null;
  const medal = courseMedal(store, course);
  const goal = nextMedalGoal(medal, course);
  const title = medal ? fillMedal(raceMedalCopy.courseMedal[lang], { medal: raceMedalCopy.medal[medal][lang] }) : raceMedalCopy.noMedal[lang];
  return <View style={styles.row} testID="race-hub-medal" accessible accessibilityLabel={`${title}. ${medalCourseText(course.difficulty, course.windStrength, lang)}. ${goal ? medalGoalText(goal, mode, lang) : raceMedalCopy.top[lang]}`}>
    <Svg width={24} height={24} viewBox="0 0 24 24" accessibilityElementsHidden importantForAccessibility="no">
      <Path d="M8 2l2.5 6M16 2l-2.5 6" stroke={colors.textSecondary} strokeWidth={2} strokeLinecap="round" fill="none" />
      <Circle cx={12} cy={15} r={7} fill={medal ? MEDAL_FILL[medal] : "none"} stroke={colors.textSecondary} strokeWidth={medal ? 1.5 : 2} strokeDasharray={medal ? undefined : "3 2"} />
    </Svg>
    <View style={styles.text}>
      <Text style={styles.title}>{title}</Text>
      <Text variant="caption">{medalCourseText(course.difficulty, course.windStrength, lang)}</Text>
      <Text variant="caption" style={styles.goal}>{goal ? medalGoalText(goal, mode, lang) : raceMedalCopy.top[lang]}</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 16, lineHeight: 22, fontWeight: "600", color: colors.textPrimary },
  goal: { color: colors.textPrimary },
});
