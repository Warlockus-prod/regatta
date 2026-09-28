import { useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { readCompletedIds, readLastViewedId } from "../persistence/bootcamp";
import { readRaces } from "../persistence/race-history";
import { readSailProgress, SAIL_PROGRESS_KEY, type SailProgress } from "../../../src/features/sailing-lab/lessons/progress";

export interface LearningSnapshot {
  completedIds: Set<string>;
  lastViewedLessonId: string | null;
  sail: SailProgress;
  /** Races kept in local history (the history keeps the latest 20). */
  races: number;
}

/**
 * Everything the Home screen shows, read from this device only. Home stays
 * mounted under the stack while lessons are open, so it re-reads on every
 * focus instead of hydrating once. `null` until the first read finishes:
 * the screen shows a placeholder rather than a false "Start" state.
 */
export function useLearningSnapshot(): LearningSnapshot | null {
  const [snapshot, setSnapshot] = useState<LearningSnapshot | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([
      readCompletedIds(),
      readLastViewedId(),
      AsyncStorage.getItem(SAIL_PROGRESS_KEY).then(readSailProgress).catch(() => readSailProgress(null)),
      readRaces().then(list => list.length).catch(() => 0),
    ]).then(([completedIds, lastViewedLessonId, sail, races]) => {
      if (active) setSnapshot({ completedIds, lastViewedLessonId, sail, races });
    });
    return () => { active = false; };
  }, []));
  return snapshot;
}
