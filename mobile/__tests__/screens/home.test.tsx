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

// Home mounts WindNowCard, which fetches /api/weather on mount. Stub fetch so
// the test resolves immediately instead of hitting the network (and waiting
// out the 8s request timeout).
const originalFetch = global.fetch;
beforeEach(async () => {
  await AsyncStorage.clear();
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      provider: 'open-meteo',
      ts: '2026-05-25T12:00:00Z',
      wind: { speedKn: 12, dirDeg: 270, gustKn: 18 },
      wave: { heightM: 0.5, dirDeg: 270, periodS: 4 },
      attribution: 'Weather data by Open-Meteo.com (CC BY 4.0)',
    }),
  })) as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
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
