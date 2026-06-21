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
import Racing from '../../app/racing/index';
import { racingRules, racingStrategies } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { renderWithProviders } from '../../src/test-utils';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Racing tactics screen', () => {
  it('renders both section labels', async () => {
    const view = renderWithProviders(<Racing />);
    await waitFor(() => view.getByText('RIGHT OF WAY'));
    view.getByText('STRATEGIES');
  });

  it('renders all racing rules and strategies by EN title', async () => {
    const view = renderWithProviders(<Racing />);
    const firstRule = legacyPick(racingRules[0]!, 'title', 'en');
    await waitFor(() => view.getByText(firstRule));

    for (const rule of racingRules) {
      const title = legacyPick(rule, 'title', 'en');
      expect(view.getAllByText(title).length).toBeGreaterThan(0);
    }
    for (const strat of racingStrategies) {
      const title = legacyPick(strat, 'title', 'en');
      expect(view.getAllByText(title).length).toBeGreaterThan(0);
    }
  });
});
