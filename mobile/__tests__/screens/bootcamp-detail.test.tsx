import { fireEvent, waitFor } from '@testing-library/react-native';
import { CommonActions, StackActions, StackRouter } from '@react-navigation/routers';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mutable refs for the expo-router mock. Hoisted-friendly (only var globals,
// no module-level closures captured), so the babel-jest hoisting check stays
// happy. The factory references `globalThis.__regattaMocks` which is set in
// beforeEach below.
jest.mock('expo-router', () => ({
  // The lesson records the course bookmark on focus; run it once on mount.
  useFocusEffect: (effect: () => void | (() => void)) =>
    jest.requireActual('react').useEffect(effect, [effect]),
  Stack: { Screen: () => null },
  useRouter: () => ({
    push: (route: string) =>
      (globalThis as any).__regattaMocks?.pushMock?.(route),
    back: jest.fn(),
    replace: jest.fn(),
    navigate: (route: string) =>
      (globalThis as any).__regattaMocks?.navigateMock?.(route),
    dismissTo: (route: string) =>
      (globalThis as any).__regattaMocks?.dismissToMock?.(route),
  }),
  useLocalSearchParams: () => ({
    id: (globalThis as any).__regattaMocks?.id ?? 'wind-direction',
  }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'en-US' }],
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import BootcampLesson from '../../app/bootcamp/[id]';
import { bootcampLessons } from '../../src/data';
import { renderWithProviders, settleProgress } from '../../src/test-utils';
import { AnalyticsClientContext } from '../../src/analytics/context';
import { BOOTCAMP_QUIZZES } from '../../src/bootcamp/quiz-data';
import { FOUNDATION_POSITION_KEY, loadFoundationPositions, saveFoundationPosition } from '../../src/bootcamp/lesson-position';
import { QUIZ_RESULTS_KEY, readQuizResults, recordQuizResult } from '../../src/persistence/bootcamp-quiz';
import { addViewedId, writeLastViewedId } from '../../src/persistence/bootcamp';
import { foundationCopy } from '../../src/bootcamp/learning-guide';

const PROGRESS_KEY = 'regatta.progress.bootcamp.v1';

interface RegattaMocks {
  pushMock: jest.Mock;
  navigateMock: jest.Mock;
  dismissToMock: jest.Mock;
  id: string;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  (globalThis as any).__regattaMocks = {
    pushMock: jest.fn(),
    navigateMock: jest.fn(),
    dismissToMock: jest.fn(),
    id: 'wind-direction',
  } satisfies RegattaMocks;
});

afterEach(() => {
  delete (globalThis as any).__regattaMocks;
});

describe('Bootcamp lesson detail', () => {
  it('renders the lesson title for a known id', async () => {
    const view = renderWithProviders(<BootcampLesson />);
    await waitFor(() => view.getByText('Wind & direction'));
  });

  // wind-direction is on the v3 lesson template (goal card instead of the
  // focus card, see pilot-lessons.test.tsx); the other lessons keep it.
  it('shows the lesson goal and interactive diagram', async () => {
    (globalThis as any).__regattaMocks.id = 'points-of-sail';
    const view = renderWithProviders(<BootcampLesson />);
    await waitFor(() => view.getByText('Goal'));
    expect(view.getByTestId('diagram-image')).toBeTruthy();
  });

  it('shows a destination action in the practice step', async () => {
    const view = renderWithProviders(<BootcampLesson />);
    await settleProgress();
    fireEvent.press(view.getByRole('button', { name: '3. Practice' }));
    await waitFor(() => view.getByRole('button', { name: /→$/ }));
  });

  it('the course footer removes lesson history before the next Back and preserves saved learning evidence', async () => {
    const stack = StackRouter({ initialRouteName: 'learn/index' });
    // Match the actual native root Stack, with no getId override.
    const config = { routeNames: ['learn/index', 'bootcamp/index', 'bootcamp/[id]'], routeParamList: {}, routeGetIdList: {} };
    let state = stack.getInitialState(config);
    const dispatch = (action: Parameters<typeof stack.getStateForAction>[1]) => {
      const next = stack.getStateForAction(state, action, config);
      if (!next || next.stale !== false) throw new Error('Foundation footer did not return a hydrated state');
      state = next;
    };
    dispatch(StackActions.push('bootcamp/index'));
    const originalCourseKey = state.routes[state.index].key;
    dispatch(StackActions.push('bootcamp/[id]', { id: 'points-of-sail' }));
    dispatch(StackActions.push('bootcamp/[id]', { id: 'wind-direction' }));
    const mocks = (globalThis as any).__regattaMocks as RegattaMocks;
    mocks.navigateMock.mockImplementation(route => { expect(route).toBe('/bootcamp'); dispatch(CommonActions.navigate('bootcamp/index')); });
    mocks.dismissToMock.mockImplementation(route => { expect(route).toBe('/bootcamp'); dispatch(StackActions.popTo('bootcamp/index')); });
    await addViewedId('points-of-sail');
    await writeLastViewedId('wind-direction');
    await saveFoundationPosition('wind-direction', { step: 'practice', diagram: 2 });
    const total = BOOTCAMP_QUIZZES['wind-direction']!.length;
    const quiz = { score: total, total, answeredAt: 123 };
    await recordQuizResult('wind-direction', quiz);
    const view = renderWithProviders(<BootcampLesson />);
    await settleProgress();
    await waitFor(() => expect(view.getByRole('button', { name: '3. Practice' }).props.accessibilityState.selected).toBe(true));
    const keys = [PROGRESS_KEY, FOUNDATION_POSITION_KEY, QUIZ_RESULTS_KEY, 'regatta.progress.bootcamp.lastViewed.v1'];
    // Capture after legitimate mount/focus writes, before the return action.
    const before = await AsyncStorage.multiGet(keys);
    expect(before.every(([, value]) => value !== null)).toBe(true);
    fireEvent.press(view.getByRole('button', { name: foundationCopy.outline.en }));
    expect(state.routes.map(route => route.name)).toEqual(['learn/index', 'bootcamp/index']);
    expect(state.routes[state.index].key).toBe(originalCourseKey);
    dispatch(CommonActions.goBack());
    expect(state.routes.map(route => route.name)).toEqual(['learn/index']);
    await settleProgress();
    expect(await AsyncStorage.multiGet(keys)).toEqual(before);
    expect((await loadFoundationPositions())['wind-direction']).toEqual({ step: 'practice', diagram: 2 });
    expect((await readQuizResults())['wind-direction']).toEqual(quiz);
    expect(mocks.pushMock).not.toHaveBeenCalled();
  });

  it('renders the localized "not found" copy when id is unknown', async () => {
    (globalThis as any).__regattaMocks.id = 'this-lesson-does-not-exist';
    const view = renderWithProviders(<BootcampLesson />);
    await waitFor(() => view.getByText(/Lesson not found/i));
  });

  it('records the lesson as viewed and navigates to the practice route on press', async () => {
    const view = renderWithProviders(<BootcampLesson />);
    await settleProgress();
    fireEvent.press(view.getByRole('button', { name: '3. Practice' }));
    const cta = await waitFor(() => view.getByRole('button', { name: /→$/ }));
    fireEvent.press(cta);

    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(PROGRESS_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw ?? '[]');
      expect(parsed).toContain('wind-direction');
    });
    const mocks = (globalThis as any).__regattaMocks as RegattaMocks;
    expect(mocks.pushMock).toHaveBeenCalledWith('/simulator-v3?fromLesson=wind-direction');
  });

  it('opening the practice does not pass the lesson', async () => {
    const view = renderWithProviders(<BootcampLesson />);
    await settleProgress();
    fireEvent.press(view.getByRole('button', { name: '3. Practice' }));
    fireEvent.press(view.getByRole('button', { name: /→$/ }));
    fireEvent.press(view.getByRole('button', { name: '2. Check yourself' }));
    await waitFor(() => view.getByText(/at least 70% of the check/));
    expect(view.queryByText('Lesson passed')).toBeNull();
  });

  it('shows the lesson number in the header area and no decorative emoji', async () => {
    const view = renderWithProviders(<BootcampLesson />);
    await waitFor(() => view.getByText('Wind & direction'));
    expect(view.queryByText(bootcampLessons[0]!.emoji)).toBeNull();
  });

  it('a passed check marks the lesson passed', async () => {
    await AsyncStorage.setItem('regatta.bootcamp-quiz.v1', JSON.stringify({ 'wind-direction': { score: 3, total: 3, answeredAt: 1 } }));
    const view = renderWithProviders(<BootcampLesson />);
    await settleProgress();
    fireEvent.press(view.getByRole('button', { name: '2. Check yourself' }));
    await waitFor(() => view.getByText('Lesson passed'));
  });

  it('captures lesson_completed once, on the first passed check only', async () => {
    const capture = jest.fn();
    const view = renderWithProviders(
      <AnalyticsClientContext.Provider value={{ capture } as any}>
        <BootcampLesson />
      </AnalyticsClientContext.Provider>,
    );
    await settleProgress();
    fireEvent.press(view.getByRole('button', { name: '2. Check yourself' }));
    const passQuiz = async () => {
      fireEvent.press(await waitFor(() => view.getByText(/Start quiz|Retake/)));
      const questions = BOOTCAMP_QUIZZES['wind-direction']!;
      questions.forEach((q, i) => {
        const right = q.options.find((o) => o.correct)!;
        fireEvent.press(view.getByText(right.label.en));
        fireEvent.press(view.getByText('Check answer'));
        fireEvent.press(view.getByText(i === questions.length - 1 ? 'Finish quiz' : 'Next question'));
      });
      await settleProgress();
    };
    await passQuiz();
    await waitFor(() => expect(capture).toHaveBeenCalledWith('lesson_completed', { course: 'bootcamp', lesson_id: 'wind-direction' }));
    expect(capture.mock.calls.filter(([name]) => name === 'lesson_completed')).toHaveLength(1);
  });
});
