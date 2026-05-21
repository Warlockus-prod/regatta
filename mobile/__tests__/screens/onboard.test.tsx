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
import Onboard from '../../app/onboard/index';
import { onboardSections } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { renderWithProviders } from '../../src/test-utils';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Onboard screen', () => {
  it('renders every section title', async () => {
    const view = renderWithProviders(<Onboard />);
    const firstTitle = legacyPick(onboardSections[0]!, 'title', 'en');
    await waitFor(() => view.getByText(firstTitle));
    for (const section of onboardSections) {
      const title = legacyPick(section, 'title', 'en');
      expect(view.getAllByText(title).length).toBeGreaterThan(0);
    }
  });

  it('renders each section icon at least once', async () => {
    const view = renderWithProviders(<Onboard />);
    await waitFor(() =>
      view.getAllByText(onboardSections[0]!.icon),
    );
    const uniqueIcons = Array.from(
      new Set(onboardSections.map((s) => s.icon)),
    );
    for (const icon of uniqueIcons) {
      expect(view.getAllByText(icon).length).toBeGreaterThan(0);
    }
  });
});
