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
import Rules from '../../app/rules/index';
import { ruleScenarios } from '../../src/data';
import { renderWithProviders } from '../../src/test-utils';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Rules index screen', () => {
  it('renders the count summary', async () => {
    const view = renderWithProviders(<Rules />);
    await waitFor(() =>
      view.getByText(new RegExp(`${ruleScenarios.length} collision scenarios`)),
    );
  });

  it('shows source badge (RRS or COLREGS) on every scenario', async () => {
    const view = renderWithProviders(<Rules />);
    await waitFor(() =>
      view.getByText(new RegExp(`${ruleScenarios.length} collision scenarios`)),
    );
    // Every scenario tile has either "RRS" or "COLREGS" badge.
    const rrs = view.queryAllByText('RRS').length;
    const colregs = view.queryAllByText('COLREGS').length;
    expect(rrs + colregs).toBeGreaterThanOrEqual(ruleScenarios.length);
  });
});
