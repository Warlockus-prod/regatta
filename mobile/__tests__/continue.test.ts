jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));

import { homeStepEvidence, resolveContinue, type ContinueInput } from '../src/home/continue';
import { hasMeaningfulStep } from '../../src/lib/product/home-entry';
import { parseBookmark, type LearningBookmark } from '../src/persistence/learning-bookmark';
import { bootcampLessons } from '../src/data';
import { hasQuiz } from '../src/bootcamp/quiz-data';
import { sailLessons } from '../../src/data/sailing-lab/course';
import { emptySailProgress } from '../../src/features/sailing-lab/lessons/progress';

const input = (over: Partial<ContinueInput> = {}): ContinueInput => ({
  bootcamp: { viewedIds: new Set(), quizResults: {}, doneIds: new Set(), lastViewedLessonId: null },
  sail: emptySailProgress(),
  bookmark: null,
  ...over,
});
const mark = (course: LearningBookmark['course'], lessonId: string | null = null): LearningBookmark => ({ version: 1, course, lessonId, at: 1 });

describe('Home continues the course the learner was in', () => {
  it('a new learner starts the first lesson of the first course', () => {
    const target = resolveContinue(input());
    expect(target.course).toBe('bootcamp');
    expect(target.state).toBe('start');
    expect(target.course === 'bootcamp' && target.state !== 'done' && target.lesson.id).toBe('wind-direction');
  });

  it('returning from a bootcamp lesson continues that lesson', () => {
    const target = resolveContinue(input({
      bootcamp: { viewedIds: new Set(), quizResults: {}, doneIds: new Set(), lastViewedLessonId: 'how-sail-works' },
      bookmark: mark('bootcamp', 'how-sail-works'),
    }));
    expect(target).toMatchObject({ course: 'bootcamp', state: 'continue', number: 3 });
  });

  it('returning from the sail course continues the sail lesson, not the first course', () => {
    const lesson = sailLessons[3]!;
    const target = resolveContinue(input({ bookmark: mark('sails', lesson.id) }));
    expect(target.course).toBe('sails');
    expect(target.course === 'sails' && target.lesson.id).toBe(lesson.id);
  });

  it('a sail lesson whose theory is already checked moves on to the next unchecked one', () => {
    const first = sailLessons[0]!;
    const target = resolveContinue(input({ sail: { version: 1, checked: [first.id], current: first.id }, bookmark: mark('sails', first.id) }));
    expect(target.course === 'sails' && target.lesson.id).toBe(sailLessons[1]!.id);
  });

  it('a radio or motorboat bookmark is never the continuation (package 9, R-14)', () => {
    for (const course of ['radio', 'motor'] as const) {
      expect(resolveContinue(input({ bookmark: mark(course) }))).toMatchObject({ course: 'bootcamp', state: 'start' });
    }
  });

  it('only a passed lesson or a passed sail check is a meaningful step, not a visit', () => {
    expect(hasMeaningfulStep(homeStepEvidence(input()))).toBe(false);
    const viewed = input({ bootcamp: { viewedIds: new Set(bootcampLessons.map((l) => l.id)), quizResults: {}, doneIds: new Set(), lastViewedLessonId: 'tacking' }, bookmark: mark('sails', sailLessons[1]!.id) });
    expect(hasMeaningfulStep(homeStepEvidence(viewed))).toBe(false);
    const failed = bootcampLessons.find((l) => hasQuiz(l.id))!;
    expect(hasMeaningfulStep(homeStepEvidence(input({ bootcamp: { viewedIds: new Set(), quizResults: { [failed.id]: { score: 0, total: 9, answeredAt: 1 } }, doneIds: new Set(), lastViewedLessonId: null } })))).toBe(false);
    expect(hasMeaningfulStep(homeStepEvidence(input({ bootcamp: { viewedIds: new Set(), quizResults: { [failed.id]: { score: 9, total: 9, answeredAt: 1 } }, doneIds: new Set(), lastViewedLessonId: null } })))).toBe(true);
    expect(hasMeaningfulStep(homeStepEvidence(input({ sail: { version: 1, checked: [sailLessons[0]!.id], current: null } })))).toBe(true);
  });

  it('every bootcamp lesson opened but the sail course chosen: continue sails', () => {
    const all = new Set(bootcampLessons.map((l) => l.id));
    const target = resolveContinue(input({
      bootcamp: { viewedIds: all, quizResults: {}, doneIds: new Set(), lastViewedLessonId: 'mini-race' },
      bookmark: mark('sails'),
    }));
    expect(target.course).toBe('sails');
  });

  it('a finished sail course falls back to the first course', () => {
    const target = resolveContinue(input({ sail: { version: 1, checked: sailLessons.map((l) => l.id), current: null }, bookmark: mark('sails') }));
    expect(target.course).toBe('bootcamp');
  });

  it('only passed lessons finish the first course', () => {
    const quizResults = Object.fromEntries(bootcampLessons.filter((l) => hasQuiz(l.id)).map((l) => [l.id, { score: 9, total: 9, answeredAt: 1 }]));
    const doneIds = new Set(bootcampLessons.filter((l) => !hasQuiz(l.id)).map((l) => l.id));
    expect(resolveContinue(input({ bootcamp: { viewedIds: new Set(), quizResults, doneIds, lastViewedLessonId: null } }))).toMatchObject({ course: 'bootcamp', state: 'done', passed: bootcampLessons.length });
  });
});

describe('bookmark storage', () => {
  it('survives a restart: the stored shape reads back the same', () => {
    const lesson = sailLessons[2]!;
    expect(parseBookmark(JSON.stringify(mark('sails', lesson.id)))).toEqual(mark('sails', lesson.id));
  });

  it('an unknown lesson ID from an older version keeps the course, drops the lesson', () => {
    expect(parseBookmark(JSON.stringify(mark('sails', 'renamed-lesson')))).toMatchObject({ course: 'sails', lessonId: null });
    expect(parseBookmark(JSON.stringify(mark('bootcamp', 'renamed-lesson')))).toMatchObject({ course: 'bootcamp', lessonId: null });
  });

  it('an unknown course or broken value reads as no bookmark', () => {
    expect(parseBookmark(JSON.stringify({ version: 1, course: 'kitesurf', lessonId: null, at: 1 }))).toBeNull();
    expect(parseBookmark('{not json')).toBeNull();
    expect(parseBookmark(null)).toBeNull();
    expect(parseBookmark(JSON.stringify({ version: 2, course: 'sails' }))).toBeNull();
  });
});
