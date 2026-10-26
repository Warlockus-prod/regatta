import { fireEvent, waitFor } from '@testing-library/react-native';

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
    navigate: jest.fn(),
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

const PROGRESS_KEY = 'regatta.progress.bootcamp.v1';

interface RegattaMocks {
  pushMock: jest.Mock;
  id: string;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  (globalThis as any).__regattaMocks = {
    pushMock: jest.fn(),
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
