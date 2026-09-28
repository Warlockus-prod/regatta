import { bootcampLessons, type BootcampLesson } from "../data";
import { nextBootcampLesson, passedLessonIds, type BootcampEvidence } from "../bootcamp/status";
import { findSailLesson, sailLessons } from "../../../src/data/sailing-lab/course";
import { nextSailLesson, type SailProgress } from "../../../src/features/sailing-lab/lessons/progress";
import type { LearningBookmark } from "../persistence/learning-bookmark";

export interface ContinueInput {
  bootcamp: BootcampEvidence;
  sail: SailProgress;
  bookmark: LearningBookmark | null;
}

type SailLesson = (typeof sailLessons)[number];

/** What the Home card offers: which course, which lesson, how far along. */
export type ContinueTarget =
  | { course: "bootcamp"; state: "start" | "continue"; lesson: BootcampLesson; number: number; total: number; passed: number }
  | { course: "bootcamp"; state: "done"; total: number; passed: number }
  | { course: "sails"; state: "start" | "continue"; lesson: SailLesson; number: number; total: number; checked: number }
  | { course: "radio"; state: "continue" }
  | { course: "motor"; state: "continue" };

function hasBootcampActivity(e: BootcampEvidence): boolean {
  return Boolean(e.lastViewedLessonId || e.viewedIds.size || e.doneIds.size || Object.keys(e.quizResults).length);
}

/**
 * Continue the course the learner was in last (the bookmark). Sails resume the
 * bookmarked lesson unless its theory check is already done, then the next
 * unchecked one. Radio and the motorboat course reopen the course itself: their
 * exact step lives inside the embedded course. Without a bookmark, or when the
 * bookmarked course is finished, fall back to the first course.
 */
export function resolveContinue({ bootcamp, sail, bookmark }: ContinueInput): ContinueTarget {
  if (bookmark?.course === "radio") return { course: "radio", state: "continue" };
  if (bookmark?.course === "motor") return { course: "motor", state: "continue" };
  if (bookmark?.course === "sails") {
    const marked = bookmark.lessonId && !sail.checked.includes(bookmark.lessonId) ? findSailLesson(bookmark.lessonId) : undefined;
    const lesson = marked ?? nextSailLesson(sail);
    if (lesson) {
      return {
        course: "sails",
        state: sail.checked.length || bookmark.lessonId ? "continue" : "start",
        lesson,
        number: sailLessons.findIndex(l => l.id === lesson.id) + 1,
        total: sailLessons.length,
        checked: sail.checked.length,
      };
    }
  }
  const total = bootcampLessons.length;
  const passed = passedLessonIds(bootcamp).size;
  const next = nextBootcampLesson(bootcamp);
  if (!next) return { course: "bootcamp", state: "done", total, passed };
  const started = bookmark?.course === "bootcamp" || hasBootcampActivity(bootcamp);
  return {
    course: "bootcamp",
    state: started ? "continue" : "start",
    lesson: next,
    number: bootcampLessons.findIndex(l => l.id === next.id) + 1,
    total,
    passed,
  };
}
