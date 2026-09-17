import { findSailLesson, sailLessons } from "../../../data/sailing-lab/course";

export const SAIL_PROGRESS_KEY = "regatta.sailing.theory.v1";
export interface SailProgress { version: 1; checked: string[]; current: string | null }
export const emptySailProgress = (): SailProgress => ({ version: 1, checked: [], current: null });
export function readSailProgress(raw: string | null): SailProgress {
  try {
    const value = JSON.parse(raw ?? "null");
    if (!value || value.version !== 1 || !Array.isArray(value.checked)) return emptySailProgress();
    return {
      version: 1,
      checked: [...new Set<string>(value.checked.filter((id: unknown): id is string => typeof id === "string" && Boolean(findSailLesson(id))))],
      current: typeof value.current === "string" && findSailLesson(value.current) ? value.current : null,
    };
  } catch { return emptySailProgress(); }
}
export function checkSailTheory(progress: SailProgress, id: string, answer: number): SailProgress {
  const lesson = findSailLesson(id);
  if (!lesson || answer !== lesson.correct) return progress;
  return { ...progress, current: id, checked: [...new Set([...progress.checked, id])] };
}
export function nextSailLesson(progress: SailProgress) {
  return sailLessons.find(lesson => lesson.id === progress.current && !progress.checked.includes(lesson.id))
    ?? sailLessons.find(lesson => !progress.checked.includes(lesson.id));
}
