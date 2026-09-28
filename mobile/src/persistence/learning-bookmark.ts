import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { bootcampLessons } from '../data';
import { findSailLesson } from '../../../src/data/sailing-lab/course';

/**
 * The course (and lesson) the learner was in last, so Home continues THAT
 * path, not always the first course. Written while a course screen is in
 * focus. Radio (SRC) and the motorboat course keep their own state inside
 * the embedded course, so for them only the course is stored and Home
 * reopens the course itself.
 *
 *   key   = `regatta.learning.bookmark.v1`
 *   value = { version: 1, course, lessonId | null, at }
 *
 * Unknown courses read as "no bookmark"; unknown lesson IDs (content moved on
 * since the save) read as the course without a lesson.
 */
export type LearningCourse = 'bootcamp' | 'sails' | 'radio' | 'motor';

export interface LearningBookmark {
  version: 1;
  course: LearningCourse;
  lessonId: string | null;
  at: number;
}

export const LEARNING_BOOKMARK_KEY = 'regatta.learning.bookmark.v1';
const COURSES: readonly LearningCourse[] = ['bootcamp', 'sails', 'radio', 'motor'];

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
    return { version: 1, course, lessonId, at: typeof v.at === 'number' ? v.at : 0 };
  } catch {
    return null;
  }
}

export async function readBookmark(): Promise<LearningBookmark | null> {
  try {
    return parseBookmark(await AsyncStorage.getItem(LEARNING_BOOKMARK_KEY));
  } catch {
    return null;
  }
}

export async function writeBookmark(course: LearningCourse, lessonId: string | null = null): Promise<void> {
  const value: LearningBookmark = { version: 1, course, lessonId, at: Date.now() };
  try {
    await AsyncStorage.setItem(LEARNING_BOOKMARK_KEY, JSON.stringify(value));
  } catch {
    /* ignore - Home falls back to the first course */
  }
}

/** Record this course (and lesson) every time the screen gains focus. */
export function useLearningBookmark(course: LearningCourse | null, lessonId: string | null = null): void {
  useFocusEffect(useCallback(() => {
    if (course) void writeBookmark(course, lessonId);
  }, [course, lessonId]));
}
