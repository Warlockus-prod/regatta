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
import BootcampIndex from '../../app/bootcamp/index';
import { bootcampLessons } from '../../src/data';
import { renderWithProviders } from '../../src/test-utils';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Bootcamp index screen', () => {
  it('renders the summary line', async () => {
    const view = renderWithProviders(<BootcampIndex />);
    // Default locale is EN (per mocked device locale + empty AsyncStorage).
    await waitFor(() => view.getByText(/lessons, around .* min total/i));
  });

  it('lists every bootcamp lesson by emoji', async () => {
    const view = renderWithProviders(<BootcampIndex />);
    await waitFor(() => view.getAllByText(bootcampLessons[0]!.emoji));
    // Each unique lesson emoji appears at least once on the screen.
    const uniqueEmojis = Array.from(new Set(bootcampLessons.map((l) => l.emoji)));
    for (const emoji of uniqueEmojis) {
      expect(view.getAllByText(emoji).length).toBeGreaterThan(0);
    }
  });

  it('renders the first lesson title in EN', async () => {
    const view = renderWithProviders(<BootcampIndex />);
    // First lesson EN title.
    await waitFor(() => view.getByText('Wind & direction'));
  });

  it('renders titles in the persisted language (PL)', async () => {
    await AsyncStorage.setItem('regatta.lang.v1', 'pl');
    const view = renderWithProviders(<BootcampIndex />);
    // First lesson Polish title.
    await waitFor(() => view.getByText('Wiatr i kierunek'));
  });
});
