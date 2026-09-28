/**
 * Regressions from the Codex round 2 review (R2.1, R3.1, R3.2): progress must
 * survive screen order, slow storage and Back navigation.
 */
import { act, fireEvent, renderHook, waitFor } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'en-US' }] }));
jest.mock('../src/design-system/components/LessonDiagram', () => ({ LessonDiagram: () => null }));

// Focus effects run on mount and again whenever a test "comes back" to the screen.
const mockFocusEffects = new Set<() => void | (() => void)>();
const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    Stack: { Screen: () => null },
    useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
    useLocalSearchParams: () => ({ id: 'wind-direction' }),
    useFocusEffect: (effect: () => void | (() => void)) => {
      React.useEffect(() => {
        mockFocusEffects.add(effect);
        const cleanup = effect();
        return () => { mockFocusEffects.delete(effect); if (typeof cleanup === 'function') cleanup(); };
      }, [effect]);
    },
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import BootcampIndex from '../app/bootcamp/index';
import BootcampLesson from '../app/bootcamp/[id]';
import { renderWithProviders, settleProgress } from '../src/test-utils';
import { useBootcampProgress } from '../src/persistence/bootcamp';
import { useBootcampQuiz } from '../src/persistence/bootcamp-quiz';
import { readBookmark, writeBookmark } from '../src/persistence/learning-bookmark';
import { readLearningSnapshot } from '../src/home/useLearningSnapshot';
import { resolveContinue } from '../src/home/continue';
import { sailLessons } from '../../src/data/sailing-lab/course';
import { emptySailProgress } from '../../src/features/sailing-lab/lessons/progress';

const VIEWED = 'regatta.progress.bootcamp.v1';
const QUIZ = 'regatta.bootcamp-quiz.v1';
const refocus = () => act(async () => { for (const effect of [...mockFocusEffects]) effect(); });
// Read storage the way the next screen would, inside act: the pending write
// of the action just taken may land during the read and update the hooks.
const readNow = async () => {
  let snapshot!: Awaited<ReturnType<typeof readLearningSnapshot>>;
  await act(async () => { snapshot = await readLearningSnapshot(); });
  return snapshot;
};
const emptyBootcamp = () => ({ viewedIds: new Set<string>(), doneIds: new Set<string>(), quizResults: {}, lastViewedLessonId: null });

beforeEach(async () => {
  mockFocusEffects.clear();
  mockPush.mockClear();
  await AsyncStorage.clear();
});

describe('R3.2 opening a lesson keeps the stored history', () => {
  it('keeps older viewed IDs when a lesson opens before the hook has read storage', async () => {
    await AsyncStorage.setItem(VIEWED, JSON.stringify(['tacking', 'points-of-sail']));
    renderWithProviders(<BootcampLesson />);
    await waitFor(async () => {
      expect(JSON.parse((await AsyncStorage.getItem(VIEWED)) ?? '[]')).toEqual(
        expect.arrayContaining(['tacking', 'points-of-sail', 'wind-direction']),
      );
    });
    await settleProgress();
  });

  it('keeps older IDs when storage answers late and lessons switch quickly', async () => {
    await AsyncStorage.setItem(VIEWED, JSON.stringify(['jibing']));
    await AsyncStorage.setItem('regatta.progress.bootcamp.lastViewed.v1', JSON.stringify('jibing'));
    // Every read waits at a gate until the test opens it: the hook cannot have
    // read storage when the learner already opened two lessons. getItem is
    // already a jest.fn in the storage mock, so wrap its implementation.
    const getItem = AsyncStorage.getItem as unknown as jest.Mock;
    const realImpl = getItem.getMockImplementation()!;
    let open!: () => void;
    const gate = new Promise<void>((resolve) => { open = resolve; });
    getItem.mockImplementation(async (key: string) => {
      await gate;
      return realImpl(key);
    });
    try {
      const { result } = renderHook(() => useBootcampProgress());
      act(() => {
        result.current.markCompleted('wind-direction');
        result.current.markLastViewed('wind-direction');
        result.current.markCompleted('points-of-sail');
        result.current.markLastViewed('points-of-sail');
      });
      expect(result.current.ready).toBe(false);
      await act(async () => { open(); });
      await waitFor(() => expect(result.current.ready).toBe(true));
      await waitFor(() => expect([...result.current.completedIds].sort()).toEqual(['jibing', 'points-of-sail', 'wind-direction']));
      // Hydration did not put the older "last viewed" back over the new one.
      expect(result.current.lastViewedLessonId).toBe('points-of-sail');
    } finally {
      getItem.mockImplementation(realImpl);
    }
    expect(JSON.parse((await AsyncStorage.getItem(VIEWED)) ?? '[]').sort()).toEqual(['jibing', 'points-of-sail', 'wind-direction']);
    expect(JSON.parse((await AsyncStorage.getItem('regatta.progress.bootcamp.lastViewed.v1')) ?? 'null')).toBe('points-of-sail');
  });

  it('recording a check before hydration keeps the other lessons results', async () => {
    await AsyncStorage.setItem(QUIZ, JSON.stringify({ 'points-of-sail': { score: 3, total: 3, answeredAt: 1 } }));
    const { result } = renderHook(() => useBootcampQuiz());
    act(() => { result.current.recordResult('wind-direction', 1, 3); });
    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem(QUIZ)) ?? '{}');
      expect(Object.keys(stored).sort()).toEqual(['points-of-sail', 'wind-direction']);
    });
    await settleProgress();
    expect(Object.keys(result.current.results).sort()).toEqual(['points-of-sail', 'wind-direction']);
  });
});

describe('R3.1 the course path shows the result after Back', () => {
  it('a passed check shows as passed when the mounted path regains focus', async () => {
    const view = renderWithProviders(<BootcampIndex />);
    await waitFor(() => view.getByText('Passed 0 of 8'));
    await act(async () => {
      await AsyncStorage.setItem(QUIZ, JSON.stringify({ 'wind-direction': { score: 3, total: 3, answeredAt: 1 } }));
    });
    await refocus();
    await waitFor(() => view.getByText('Passed 1 of 8'));
    expect(view.getByLabelText('Lesson 1: Wind & direction, passed')).toBeTruthy();
  });

  it('a failed check changes the status to viewed but not the passed count', async () => {
    const view = renderWithProviders(<BootcampIndex />);
    await waitFor(() => view.getByText('Passed 0 of 8'));
    await act(async () => {
      await AsyncStorage.setItem(QUIZ, JSON.stringify({ 'jibing': { score: 0, total: 3, answeredAt: 1 } }));
    });
    await refocus();
    await waitFor(() => view.getByLabelText(/^Lesson 5: .*, viewed$/));
    expect(view.getByText('Passed 0 of 8')).toBeTruthy();
  });

  it('a result written just before Back is visible on the very next read', async () => {
    const { result } = renderHook(() => useBootcampQuiz());
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => { result.current.recordResult('wind-direction', 3, 3); });
    // No waiting: the snapshot read is queued after the write.
    const snapshot = await readNow();
    expect(snapshot.bootcamp.quizResults['wind-direction']).toMatchObject({ score: 3, total: 3 });
    await settleProgress();
  });
});

describe('R2.1 the sail course overview keeps the unfinished lesson', () => {
  const continueFrom = async () => resolveContinue({ bootcamp: emptyBootcamp(), sail: emptySailProgress(), bookmark: await readBookmark() });

  it('lesson 4 -> overview -> Home continues lesson 4, also after a restart', async () => {
    const lesson = sailLessons[3]!;
    await writeBookmark('sails', lesson.id);
    await writeBookmark('sails', null);
    const target = await continueFrom();
    expect(target.course === 'sails' && target.lesson.id).toBe(lesson.id);
    // A restart reads the same stored value.
    expect((await readBookmark())?.lessonId).toBe(lesson.id);
  });

  it('radio in between does not lose the sail position and never borrows an ID', async () => {
    const lesson = sailLessons[5]!;
    await writeBookmark('sails', lesson.id);
    await writeBookmark('radio');
    expect(await readBookmark()).toMatchObject({ course: 'radio', lessonId: null });
    await writeBookmark('sails', null);
    const target = await continueFrom();
    expect(target.course === 'sails' && target.lesson.id).toBe(lesson.id);
  });

  it('an unknown lesson ID from an older version keeps the course and the last valid position', async () => {
    const lesson = sailLessons[2]!;
    await writeBookmark('sails', lesson.id);
    await writeBookmark('sails', 'renamed-lesson');
    expect(await readBookmark()).toMatchObject({ course: 'sails', lessonId: lesson.id });
  });

  it('a lesson whose theory is already checked moves on to the next unchecked one', async () => {
    const first = sailLessons[0]!;
    await writeBookmark('sails', first.id);
    await writeBookmark('sails', null);
    const target = resolveContinue({ bootcamp: emptyBootcamp(), sail: { version: 1, checked: [first.id], current: first.id }, bookmark: await readBookmark() });
    expect(target.course === 'sails' && target.lesson.id).toBe(sailLessons[1]!.id);
  });

  it('a bootcamp position never becomes a sail lesson', async () => {
    await writeBookmark('bootcamp', 'tacking');
    await writeBookmark('sails', null);
    const bookmark = await readBookmark();
    expect(bookmark).toMatchObject({ course: 'sails', lessonId: null });
    expect(bookmark?.positions?.bootcamp).toBe('tacking');
  });
});

describe('the lesson screen itself', () => {
  const answerAll = async (view: ReturnType<typeof renderWithProviders>, pick: 'right' | 'wrong') => {
    const { getQuizForLesson } = jest.requireActual('../src/bootcamp/quiz-data') as typeof import('../src/bootcamp/quiz-data');
    const questions = getQuizForLesson('wind-direction');
    fireEvent.press(await waitFor(() => view.getByText('Start quiz')));
    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i]!;
      const option = q.options.find((o) => (pick === 'right' ? o.correct : !o.correct))!;
      fireEvent.press(await waitFor(() => view.getByText(option.label.en)));
      fireEvent.press(view.getByText('Check answer'));
      fireEvent.press(await waitFor(() => view.getByText(i === questions.length - 1 ? 'Finish quiz' : 'Next question')));
    }
  };

  it('finishing a passed check records it at once: Back right away keeps it', async () => {
    const view = renderWithProviders(<BootcampLesson />);
    await answerAll(view, 'right');
    await waitFor(() => view.getByText(/3 of 3/));
    // No further tap: the result is already stored.
    const snapshot = await readNow();
    expect(snapshot.bootcamp.quizResults['wind-direction']).toMatchObject({ score: 3, total: 3 });
    expect(view.queryByText('Mark complete')).toBeNull();
    await waitFor(() => view.getByText('Lesson passed'));
    await settleProgress();
  });

  it('finishing a failed check records the attempt, not a pass', async () => {
    const view = renderWithProviders(<BootcampLesson />);
    await answerAll(view, 'wrong');
    const snapshot = await readNow();
    expect(snapshot.bootcamp.quizResults['wind-direction']).toMatchObject({ score: 0, total: 3 });
    expect(view.queryByText('Lesson passed')).toBeNull();
    await settleProgress();
  });

  it('opening the practice and coming back leaves the lesson not passed', async () => {
    const view = renderWithProviders(<BootcampLesson />);
    fireEvent.press(await waitFor(() => view.getByText('Open')));
    await refocus();
    await waitFor(() => view.getByText(/at least 70% of the check below/));
    const snapshot = await readNow();
    expect(snapshot.bootcamp.viewedIds.has('wind-direction')).toBe(true);
    expect(snapshot.bootcamp.quizResults['wind-direction']).toBeUndefined();
    await settleProgress();
  });
});
