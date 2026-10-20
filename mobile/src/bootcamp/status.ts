import { bootcampLessons, type BootcampLesson } from '../data';
import { hasQuiz, isQuizPassed } from './quiz-data';
import type { QuizResultsMap } from '../persistence/bootcamp-quiz';

/**
 * Lesson state on the course path and Home.
 *
 * - `passed`: there is evidence. A lesson with a quiz needs a passed quiz
 *   (>= 70%). A lesson without a quiz needs the learner's explicit "done".
 * - `viewed`: opened, practice opened, or a quiz attempted without passing.
 *   The legacy "completed" key lands here: it was written on opening
 *   practice, so it never proved a pass. Old saves stay intact.
 * - `new`: not opened yet.
 */
export type LessonStatus = 'passed' | 'viewed' | 'new';

export interface BootcampEvidence {
  /** Legacy `regatta.progress.bootcamp.v1` IDs: viewed, not passed. */
  viewedIds: Set<string>;
  quizResults: QuizResultsMap;
  /** Explicit "done" marks for lessons without a quiz. */
  doneIds: Set<string>;
  lastViewedLessonId?: string | null;
}

export function isLessonPassed(id: string, evidence: BootcampEvidence): boolean {
  if (hasQuiz(id)) {
    const result = evidence.quizResults[id];
    return Boolean(result && isQuizPassed(result.score, result.total));
  }
  return evidence.doneIds.has(id);
}

export function lessonStatus(id: string, evidence: BootcampEvidence): LessonStatus {
  if (isLessonPassed(id, evidence)) return 'passed';
  if (evidence.viewedIds.has(id) || evidence.quizResults[id] || evidence.lastViewedLessonId === id) return 'viewed';
  return 'new';
}

export function passedLessonIds(evidence: BootcampEvidence, lessons: BootcampLesson[] = bootcampLessons): Set<string> {
  return new Set(lessons.filter((l) => isLessonPassed(l.id, evidence)).map((l) => l.id));
}

/**
 * Next lesson to continue: the last opened one if it is not passed yet,
 * otherwise the first lesson in order that is not passed. Null when every
 * lesson is passed.
 */
export function nextBootcampLesson(evidence: BootcampEvidence, lessons: BootcampLesson[] = bootcampLessons): BootcampLesson | null {
  const passed = passedLessonIds(evidence, lessons);
  const last = evidence.lastViewedLessonId ? lessons.find((l) => l.id === evidence.lastViewedLessonId) : undefined;
  if (last && !passed.has(last.id)) return last;
  return [...lessons].sort((a, b) => a.order - b.order).find((l) => !passed.has(l.id)) ?? null;
}
