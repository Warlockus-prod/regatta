/**
 * 7-day "race-ready in a week" mapping for the 8 bootcamp lessons.
 *
 * Day 3 pairs the two turning maneuvers (tacking + jibing) so the user
 * learns both sides of the same skill in one sitting; the rest is 1:1.
 * Day 7 is the regatta day (mini race) - the product narrative anchor.
 *
 * If `mobile/src/data/bootcamp.json` ever changes its lesson set, update
 * `LESSON_TO_DAY` and `DAY_LABEL_KEYS`. Lessons without a mapping fall
 * back to the highest day so they still render but are visibly grouped
 * at the end.
 */

import { bootcampLessons, type BootcampLesson } from '../data';
import {
  getQuizForLesson,
  hasQuiz,
  isQuizPassed,
} from './quiz-data';
import type { QuizResult, QuizResultsMap } from '../persistence/bootcamp-quiz';

export const TOTAL_DAYS = 7 as const;

const LESSON_TO_DAY: Record<string, number> = {
  'wind-direction': 1,
  'points-of-sail': 2,
  'tacking': 3,
  'jibing': 3,
  'how-sail-works': 4,
  'vmg-beating': 5,
  'simple-rules': 6,
  'mini-race': 7,
};

export interface BootcampDay {
  day: number;
  lessons: BootcampLesson[];
}

export function getLessonDay(lessonId: string): number {
  return LESSON_TO_DAY[lessonId] ?? TOTAL_DAYS;
}

/**
 * Group the bootcamp lesson list into ordered day buckets. Lessons inside
 * a day stay in their original `order` so the existing reading flow holds.
 */
export function groupLessonsByDay(lessons: BootcampLesson[] = bootcampLessons): BootcampDay[] {
  const buckets = new Map<number, BootcampLesson[]>();
  for (const lesson of lessons) {
    const day = getLessonDay(lesson.id);
    const list = buckets.get(day) ?? [];
    list.push(lesson);
    buckets.set(day, list);
  }
  const days: BootcampDay[] = [];
  for (let d = 1; d <= TOTAL_DAYS; d += 1) {
    const list = buckets.get(d);
    if (list && list.length > 0) {
      days.push({ day: d, lessons: [...list].sort((a, b) => a.order - b.order) });
    }
  }
  return days;
}

/**
 * The next lesson the user should open. Picks `lastViewedLessonId` first
 * if it exists and is not yet complete; otherwise the lowest-order
 * uncompleted lesson; null when every lesson is done.
 */
export function pickContinueLesson(
  completedIds: Set<string>,
  lastViewedLessonId: string | null,
  lessons: BootcampLesson[] = bootcampLessons,
): BootcampLesson | null {
  if (lastViewedLessonId) {
    const last = lessons.find((l) => l.id === lastViewedLessonId);
    if (last && !completedIds.has(last.id)) return last;
  }
  const ordered = [...lessons].sort((a, b) => a.order - b.order);
  return ordered.find((l) => !completedIds.has(l.id)) ?? null;
}

/**
 * Snapshot of where the user stands: which day to nudge toward, how
 * many lessons in that day are done, and the all-done flag for the
 * celebration row.
 */
export interface BootcampContinueState {
  /** True when every lesson is completed. */
  allDone: boolean;
  /** The day to surface in the Continue hook (1..7). Null when allDone. */
  nextDay: number | null;
  /** The specific lesson to deep-link into. Null when allDone. */
  nextLesson: BootcampLesson | null;
  /** Within `nextDay`, how many lessons are already complete. */
  doneInNextDay: number;
  /** Within `nextDay`, the total lesson count. */
  totalInNextDay: number;
}

/**
 * Sprint 11 helper: a lesson is "fully complete" only when both the
 * lesson is marked viewed (in `completedIds`) AND the quiz attached to
 * it has been passed (>=70% correct, see `QUIZ_PASS_THRESHOLD`).
 *
 * Lessons without a quiz fall back to the legacy rule (viewed = done)
 * so we do not regress when the quiz bank is missing entries.
 *
 * Pure helper, additive: existing call sites of `completedIds.has(id)`
 * keep their old behaviour.
 */
export function isLessonFullyComplete(
  lessonId: string,
  completedIds: Set<string>,
  quizResults: QuizResultsMap,
): boolean {
  if (!completedIds.has(lessonId)) return false;
  if (!hasQuiz(lessonId)) return true;
  const result: QuizResult | undefined = quizResults[lessonId];
  if (!result) return false;
  return isQuizPassed(result.score, result.total);
}

/**
 * Sprint 11 helper: how many quiz questions a lesson has. Useful for
 * the bootcamp index "X of N quiz" affordance once it lands. Returns 0
 * when the lesson has no quiz bank entry.
 */
export function quizLength(lessonId: string): number {
  return getQuizForLesson(lessonId).length;
}

export function summarizeContinue(
  completedIds: Set<string>,
  lastViewedLessonId: string | null,
  lessons: BootcampLesson[] = bootcampLessons,
): BootcampContinueState {
  const next = pickContinueLesson(completedIds, lastViewedLessonId, lessons);
  if (!next) {
    return {
      allDone: true,
      nextDay: null,
      nextLesson: null,
      doneInNextDay: 0,
      totalInNextDay: 0,
    };
  }
  const day = getLessonDay(next.id);
  const dayLessons = lessons.filter((l) => getLessonDay(l.id) === day);
  const done = dayLessons.filter((l) => completedIds.has(l.id)).length;
  return {
    allDone: false,
    nextDay: day,
    nextLesson: next,
    doneInNextDay: done,
    totalInNextDay: dayLessons.length,
  };
}
