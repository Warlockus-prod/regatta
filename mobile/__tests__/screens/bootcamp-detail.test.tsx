import { fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Mutable refs for the expo-router mock. Hoisted-friendly (only var globals,
// no module-level closures captured), so the babel-jest hoisting check stays
// happy. The factory references `globalThis.__regattaMocks` which is set in
// beforeEach below.
jest.mock('expo-router', () => ({
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

  it('renders the focus block label uppercased', async () => {
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

  it('marks the lesson completed and navigates to the practice route on press', async () => {
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
});
