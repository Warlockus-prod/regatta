import AsyncStorage from "@react-native-async-storage/async-storage";
import { LESSON_POSITION_KEY, readPositions, visitLesson, type LessonPosition } from "../../../src/features/sailing-lab/lessons/lesson-position";

let pending: Promise<unknown> = Promise.resolve();
// Serialize read/merge/write so a quick step change or Back never loses a newer position.
export function saveLessonPosition(id: string, patch: Partial<LessonPosition> = {}) {
  const operation = pending.then(async () => {
    const next = visitLesson(readPositions(await AsyncStorage.getItem(LESSON_POSITION_KEY)), id, patch);
    await AsyncStorage.setItem(LESSON_POSITION_KEY, JSON.stringify(next));
    return next;
  });
  pending = operation.catch(() => {});
  return operation;
}
export async function loadLessonPositions() {
  await pending;
  return readPositions(await AsyncStorage.getItem(LESSON_POSITION_KEY));
}
