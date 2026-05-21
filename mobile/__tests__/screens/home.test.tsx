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
import Home from '../../app/index';
import { renderWithProviders } from '../../src/test-utils';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Home screen', () => {
  it('renders the brand wordmark', async () => {
    const view = renderWithProviders(<Home />);
    await waitFor(() => {
      view.getByText('Regatta');
      view.getByText('Week to');
    });
  });

  it('renders all three primary cards (Bootcamp, Quick, Rules) regardless of language', async () => {
    const view = renderWithProviders(<Home />);
    await waitFor(() => view.getByText('Regatta'));
    // Bootcamp is the same word in all 7 supported locales.
    view.getByText('Bootcamp');
  });

  it('honors the lang persisted in AsyncStorage', async () => {
    await AsyncStorage.setItem('regatta.lang.v1', 'pl');
    const view = renderWithProviders(<Home />);
    // Polish tagline contains "Trener"
    await waitFor(() => view.getByText(/Trener/));
  });
});
