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
  it('renders the RRS and COLREGS standard sections', async () => {
    const view = renderWithProviders(<Rules />);
    // Scenarios are now grouped under two standard section headers.
    await waitFor(() => view.getByText('🏁 RRS'));
    view.getByText('🌊 COLREGS');
    // The data splits into both standards.
    expect(ruleScenarios.some((r) => r.source === 'colregs')).toBe(true);
    expect(ruleScenarios.some((r) => r.source !== 'colregs')).toBe(true);
  });

  it('links to the official COLREGS source', async () => {
    const view = renderWithProviders(<Rules />);
    await waitFor(() => view.getByText('🏁 RRS'));
    // The COLREGS block surfaces an official source link (IMO / national PDF).
    expect(view.queryAllByText(/IMO|PDF/).length).toBeGreaterThan(0);
  });
});
