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

// PlaceholderScreen used to run an `Animated.loop` for the pulse pill
// which kept the Jest worker alive after the test finished. Sprint 11
// retires the last placeholder (Leaderboard) so this stub is no longer
// load-bearing, but we keep it in place because the test name still
// implies a placeholder existed - guarding against a regression that
// re-introduces an Animated.loop without cleanup.
jest.mock('react-native/Libraries/Animated/Animated', () => {
  const actual = jest.requireActual('react-native/Libraries/Animated/Animated');
  return {
    ...actual,
    loop: () => ({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() }),
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import Leaderboard from '../../app/leaderboard/index';
import { renderWithProviders } from '../../src/test-utils';

beforeEach(async () => {
  await AsyncStorage.clear();
});

// Sprint 11 graduated Leaderboard from the Phase-3 PlaceholderScreen
// shape into a real local leaderboard backed by `useRaceHistory()`.
// Game (Sprint 9 Dev-A) and Multiplayer (Sprint 10 Dev-B) graduated
// earlier, so this file no longer asserts a Phase badge anywhere.
describe('Leaderboard screen (real, was Phase 3)', () => {
  it('renders the leaderboard subtitle in EN', async () => {
    const view = renderWithProviders(<Leaderboard />);
    // Stack.Screen is mocked away, so we assert on body content rather
    // than the route title. The subtitle copy is stable for v1.
    await waitFor(() =>
      view.getByText(/bests per course/i),
    );
  });

  it('renders the EmptyState when no races are persisted yet', async () => {
    const view = renderWithProviders(<Leaderboard />);
    // Empty AsyncStorage means race history hydrates to []. Once
    // history.ready flips true the EmptyState renders.
    await waitFor(() => view.getByText('No races yet'));
    // CTA label routes to /game.
    view.getByText('To the race');
  });

  it('renders the course filter pills', async () => {
    const view = renderWithProviders(<Leaderboard />);
    // The 4-pill course filter is the new core surface; assert that
    // every label is present so future copy edits don't silently break
    // the chip row.
    await waitFor(() => view.getByText('All'));
    view.getByText('Short');
    view.getByText('Medium');
    view.getByText('Long');
  });
});
