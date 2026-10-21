import { useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { readCompletedIds, readDoneIds, readLastViewedId } from "../persistence/bootcamp";
import { readQuizResults } from "../persistence/bootcamp-quiz";
import { readRaces } from "../persistence/race-history";
import { readBookmark, type LearningBookmark } from "../persistence/learning-bookmark";
import { readSailProgress, SAIL_PROGRESS_KEY, type SailProgress } from "../../../src/features/sailing-lab/lessons/progress";
import type { BootcampEvidence } from "../bootcamp/status";

export interface LearningSnapshot {
  bootcamp: BootcampEvidence;
  sail: SailProgress;
  bookmark: LearningBookmark | null;
  /** Races kept in local history (the history keeps the latest 20). */
  races: number;
}

export async function readLearningSnapshot(): Promise<LearningSnapshot> {
  const [viewedIds, lastViewedLessonId, doneIds, quizResults, sail, bookmark, races] = await Promise.all([
    readCompletedIds(),
    readLastViewedId(),
    readDoneIds(),
    readQuizResults(),
    AsyncStorage.getItem(SAIL_PROGRESS_KEY).then(readSailProgress).catch(() => readSailProgress(null)),
    readBookmark(),
    readRaces().then(list => list.length).catch(() => 0),
  ]);
  return { bootcamp: { viewedIds, lastViewedLessonId, doneIds, quizResults }, sail, bookmark, races };
}

/**
 * Everything Home and the Menu progress card show, read from this device
 * only. Home stays mounted under the stack while lessons are open, so it
 * re-reads on every focus instead of hydrating once. `null` until the first
 * read finishes: screens show a placeholder rather than a false "Start".
 */
export function useLearningSnapshot(): LearningSnapshot | null {
  const [snapshot, setSnapshot] = useState<LearningSnapshot | null>(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    readLearningSnapshot().then(next => { if (active) setSnapshot(next); });
    return () => { active = false; };
  }, []));
  return snapshot;
}
