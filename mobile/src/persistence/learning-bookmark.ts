import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { bootcampLessons } from '../data';
import { findSailLesson } from '../../../src/data/sailing-lab/course';
import { serial } from './serial';

/**
 * The course (and lesson) the learner was in last, so Home continues THAT
 * path, not always the first course. Written while a course screen is in
 * focus. Radio (SRC) and the motorboat course keep their own state inside
 * the embedded course, so for them only the course is stored and Home
 * reopens the course itself.
 *
 *   key   = `regatta.learning.bookmark.v1`
 *   value = { version: 1, course, lessonId | null, at, positions? }
 *
 * `positions` keeps the last lesson per course (bootcamp, sails). Visiting a
 * course overview updates the course but never erases the lesson the learner
 * left unfinished there, and a lesson ID never moves to another course.
 * Unknown courses read as "no bookmark"; unknown lesson IDs (content moved on
 * since the save) read as the course without a lesson.
 */
export type LearningCourse = 'bootcamp' | 'sails' | 'radio' | 'motor';
type LessonCourse = 'bootcamp' | 'sails';

export interface LearningBookmark {
  version: 1;
  course: LearningCourse;
  lessonId: string | null;
  at: number;
  positions?: Partial<Record<LessonCourse, string>>;
}

export const LEARNING_BOOKMARK_KEY = 'regatta.learning.bookmark.v1';
const COURSES: readonly LearningCourse[] = ['bootcamp', 'sails', 'radio', 'motor'];
const LESSON_COURSES: readonly LessonCourse[] = ['bootcamp', 'sails'];

function lessonExists(course: LearningCourse, id: string): boolean {
  if (course === 'bootcamp') return bootcampLessons.some((l) => l.id === id);
  if (course === 'sails') return Boolean(findSailLesson(id));
  return false;
}

export function parseBookmark(raw: string | null): LearningBookmark | null {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (!value || typeof value !== 'object') return null;
    const v = value as Record<string, unknown>;
    if (v.version !== 1 || !COURSES.includes(v.course as LearningCourse)) return null;
    const course = v.course as LearningCourse;
    const lessonId = typeof v.lessonId === 'string' && lessonExists(course, v.lessonId) ? v.lessonId : null;
    const positions: Partial<Record<LessonCourse, string>> = {};
    const rawPositions = v.positions && typeof v.positions === 'object' ? (v.positions as Record<string, unknown>) : {};
    for (const c of LESSON_COURSES) {
      const id = rawPositions[c];
      if (typeof id === 'string' && lessonExists(c, id)) positions[c] = id;
    }
    const bookmark: LearningBookmark = { version: 1, course, lessonId, at: typeof v.at === 'number' ? v.at : 0 };
    if (Object.keys(positions).length) bookmark.positions = positions;
    return bookmark;
  } catch {
    return null;
  }
}

async function readRaw(): Promise<LearningBookmark | null> {
  try {
    return parseBookmark(await AsyncStorage.getItem(LEARNING_BOOKMARK_KEY));
  } catch {
    return null;
  }
}

export function readBookmark(): Promise<LearningBookmark | null> {
  return serial(readRaw);
}

/**
 * Record the current course. With a lesson, that lesson becomes the course's
 * position; without one (an overview), the course's last position is kept.
 */
export function writeBookmark(course: LearningCourse, lessonId: string | null = null): Promise<void> {
  return serial(async () => {
    const previous = await readRaw();
    const positions: Partial<Record<LessonCourse, string>> = { ...(previous?.positions ?? {}) };
    // Saves from before `positions` existed: their lesson belongs to their course.
    if (previous?.lessonId && (previous.course === 'bootcamp' || previous.course === 'sails') && !positions[previous.course]) {
      positions[previous.course] = previous.lessonId;
    }
    const valid = lessonId && lessonExists(course, lessonId) ? lessonId : null;
    if (valid && (course === 'bootcamp' || course === 'sails')) positions[course] = valid;
    const kept = course === 'bootcamp' || course === 'sails' ? positions[course] ?? null : null;
    const value: LearningBookmark = { version: 1, course, lessonId: valid ?? kept, at: Date.now() };
    if (Object.keys(positions).length) value.positions = positions;
    try {
      await AsyncStorage.setItem(LEARNING_BOOKMARK_KEY, JSON.stringify(value));
    } catch {
      /* ignore - Home falls back to the first course */
    }
  });
}

/** Record this course (and lesson) every time the screen gains focus. */
export function useLearningBookmark(course: LearningCourse | null, lessonId: string | null = null): void {
  useFocusEffect(useCallback(() => {
    if (course) void writeBookmark(course, lessonId);
  }, [course, lessonId]));
}
