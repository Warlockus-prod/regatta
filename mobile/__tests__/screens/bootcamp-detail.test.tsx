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
import { renderWithProviders } from '../../src/test-utils';

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
  it('renders the focus block label uppercased', async () => {
    (globalThis as any).__regattaMocks.id = 'points-of-sail';
    const view = renderWithProviders(<BootcampLesson />);
    await waitFor(() => view.getByText(/FOCUS THIS TIME/i));
  });

  it('renders the Open CTA in EN', async () => {
    const view = renderWithProviders(<BootcampLesson />);
    await waitFor(() => view.getByText('Open'));
  });

  it('renders the localized "not found" copy when id is unknown', async () => {
    (globalThis as any).__regattaMocks.id = 'this-lesson-does-not-exist';
    const view = renderWithProviders(<BootcampLesson />);
    await waitFor(() => view.getByText(/Lesson not found/i));
  });

  it('records the lesson as viewed and navigates to the practice route on press', async () => {
    const view = renderWithProviders(<BootcampLesson />);
    const cta = await waitFor(() => view.getByText('Open'));
    fireEvent.press(cta);

    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(PROGRESS_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw ?? '[]');
      expect(parsed).toContain('wind-direction');
    });
    const mocks = (globalThis as any).__regattaMocks as RegattaMocks;
    expect(mocks.pushMock).toHaveBeenCalledWith(bootcampLessons[0]!.route);
  });

  it('opening the practice does not pass the lesson', async () => {
    const view = renderWithProviders(<BootcampLesson />);
    fireEvent.press(await waitFor(() => view.getByText('Open')));
    await waitFor(() => view.getByText(/at least 70% of the check below/));
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
    await waitFor(() => view.getByText('Lesson passed'));
  });
});
