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

import AsyncStorage from '@react-native-async-storage/async-storage';
import Quick from '../../app/quick/index';
import { quickRefreshLessons } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { renderWithProviders } from '../../src/test-utils';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Quick refresh screen', () => {
  it('renders the count summary', async () => {
    const view = renderWithProviders(<Quick />);
    // Header mirrors the web copy: a "<minutes> min before start" kicker
    // plus a "<N> key topics" subtitle (replaced the old "<N> quick tips").
    await waitFor(() => view.getByText(/min before start/));
    view.getByText(new RegExp(`${quickRefreshLessons.length} key topics`));
  });

  it('renders all quick lesson titles in EN', async () => {
    const view = renderWithProviders(<Quick />);
    const firstTitle = legacyPick(quickRefreshLessons[0]!, 'title', 'en');
    await waitFor(() => view.getByText(firstTitle));
    for (const lesson of quickRefreshLessons) {
      const title = legacyPick(lesson, 'title', 'en');
      expect(view.getAllByText(title).length).toBeGreaterThan(0);
    }
  });
});
