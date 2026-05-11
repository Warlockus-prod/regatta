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
// the Jest worker alive after the test finishes. We don't need the
// animation to assert layout/text, so stub the loop to a noop. This keeps
// the suite under the default timeout and stops the "worker process has
// failed to exit gracefully" warning.
jest.mock('react-native/Libraries/Animated/Animated', () => {
  const actual = jest.requireActual('react-native/Libraries/Animated/Animated');
  return {
    ...actual,
    loop: () => ({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() }),
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import Game from '../../app/game/index';
import Leaderboard from '../../app/leaderboard/index';
import Multiplayer from '../../app/multiplayer/index';
import { renderWithProviders } from '../../src/test-utils';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Placeholder screens (Game / Leaderboard / Multiplayer)', () => {
  it('Game renders the title + Phase 2 badge in EN', async () => {
    const view = renderWithProviders(<Game />);
    await waitFor(() => view.getByText('Phase 2'));
    view.getByText(/^Race/);
  });

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

  it('Game renders all 3 highlight bullet items', async () => {
    const view = renderWithProviders(<Game />);
    await waitFor(() => view.getByText(/Countdown start, timed finish/i));
    view.getByText(/AI coach hints on the fly/i);
    view.getByText(/Replay recording, publish to leaderboard/i);
  });

  it('honors the persisted lang on placeholder screens (PL)', async () => {
    await AsyncStorage.setItem('regatta.lang.v1', 'pl');
    const view = renderWithProviders(<Multiplayer />);
    // Polish translation of "real-time races" begins with "Wyscigi".
    await waitFor(() => view.getByText(/Wyscigi/));
  });
});
