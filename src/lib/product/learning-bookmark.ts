import { BOOTCAMP_LESSON_IDS } from "../../data/bootcamp-index";
import { SAIL_LESSON_IDS } from "../../data/sailing-lab/lesson-ids";
import { destinations } from "./catalog";

// The learning bookmark needs lesson ids and course roots only. Navigation
// (root layout, every page) imports this module, so it must never import the
// lesson data itself: learning-bookmark.test.ts walks the layout's import graph.

export const LEARNING_BOOKMARK_KEY = "regatta.learning.bookmark.v1";
export const learningTracks = ["course", "sails", "radio", "motor"] as const;
export type LearningTrack = typeof learningTracks[number];
export type LearningBookmark = { version: 1; course: LearningTrack; lesson: string | null };

export function readLearningBookmark(raw: string | null): LearningBookmark | null {
  try {
    const value = JSON.parse(raw ?? "null");
    if (!value || value.version !== 1 || !learningTracks.includes(value.course)) return null;
    const lessons = value.course === "course" ? BOOTCAMP_LESSON_IDS : value.course === "sails" ? SAIL_LESSON_IDS : [];
    return { version: 1, course: value.course, lesson: lessons.some(id => id === value.lesson) ? value.lesson : null };
  } catch { return null; }
}

/** Record learning entry only, never a grade, and never a user-supplied URL. */
export function bookmarkForPath(path: string, platform: "web" | "native"): LearningBookmark | null {
  const clean = path.split(/[?#]/)[0].replace(/\/$/, "");
  const sail = SAIL_LESSON_IDS.find(id => clean === `/learn/sails/${id}`);
  if (sail) return { version: 1, course: "sails", lesson: sail };
  if (platform === "native") {
    const boot = BOOTCAMP_LESSON_IDS.find(id => clean === `/bootcamp/${id}`);
    if (boot) return { version: 1, course: "course", lesson: boot };
  }
  for (const course of ["radio", "motor"] as const) {
    const root = destinations.find(d => d.id === course)![platform]!;
    if (clean === root || clean.startsWith(`${root}/`)) return { version: 1, course, lesson: null };
  }
  return null;
}

export function saveLearningBookmark(bookmark: LearningBookmark) {
  try { localStorage.setItem(LEARNING_BOOKMARK_KEY, JSON.stringify(bookmark)); }
  catch { /* Navigation remains available when storage is disabled. */ }
}
