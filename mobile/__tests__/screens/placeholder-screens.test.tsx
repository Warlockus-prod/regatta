import { waitFor } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'en-US' }],
}));

// PlaceholderScreen runs an `Animated.loop` for the pulse pill which keeps
// the Jest worker alive after the test finishes. Stub the loop to a noop.
jest.mock('react-native/Libraries/Animated/Animated', () => {
  const actual = jest.requireActual('react-native/Libraries/Animated/Animated');
  return {
    ...actual,
    loop: () => ({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() }),
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import Leaderboard from '../../app/leaderboard/index';
import Multiplayer from '../../app/multiplayer/index';
import { renderWithProviders } from '../../src/test-utils';

beforeEach(async () => {
  await AsyncStorage.clear();
});

// Game has graduated past the placeholder shape in Sprint 9 (Dev-A) and now
// renders a real Skia race; its tests live in a dedicated game suite once
// the Skia jest mock grows path methods. Leaderboard and Multiplayer remain
// placeholders for v1 so they stay covered here.
describe('Placeholder screens (Leaderboard / Multiplayer)', () => {
  it('Leaderboard renders the title + Phase 3 badge in EN', async () => {
    const view = renderWithProviders(<Leaderboard />);
    await waitFor(() => view.getByText('Phase 3'));
    view.getByText(/^Leaderboard/);
  });

  it('Multiplayer renders the title + Phase 4 badge in EN', async () => {
    const view = renderWithProviders(<Multiplayer />);
    await waitFor(() => view.getByText('Phase 4'));
    view.getByText(/^Multiplayer/);
  });

  it('honors the persisted lang on placeholder screens (PL)', async () => {
    await AsyncStorage.setItem('regatta.lang.v1', 'pl');
    const view = renderWithProviders(<Multiplayer />);
    await waitFor(() => view.getByText(/Wyscigi/));
  });
});
