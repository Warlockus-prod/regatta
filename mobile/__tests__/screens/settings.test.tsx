import { fireEvent, waitFor } from '@testing-library/react-native';

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

// expo-constants ships ESM that Jest cannot transform out of the box;
// stub it with the values Settings reads at runtime.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      version: '0.2.0',
      ios: { buildNumber: '2' },
      android: { versionCode: 2 },
    },
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import Settings from '../../app/settings';
import { renderWithProviders } from '../../src/test-utils';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Settings screen', () => {
  it('renders all 7 enabled languages', async () => {
    const view = renderWithProviders(<Settings />);
    // Native names from LANGUAGE_CATALOG. Native and EN-name diverge for
    // every locale except English itself, so use the native form for the
    // unique-match assertion. English row shows "English" twice (native +
    // EN name), so we just assert at-least-one match for it.
    await waitFor(() => view.getByText('Polski'));
    view.getByText('Deutsch');
    view.getByText('Italiano');
    view.getByText('Français');
    view.getByText('Español');
    view.getByText('Русский');
    expect(view.getAllByText('English').length).toBeGreaterThan(0);
  });

  it('renders the About card with brand + version', async () => {
    const view = renderWithProviders(<Settings />);
    await waitFor(() => view.getByText('Week to Regatta'));
    // Version line is read dynamically from app.json via expo-constants,
    // so we just assert the shape (Version <semver> (build <n>)) rather
    // than pinning a literal that drifts on every release.
    view.getByText(/\d+\.\d+\.\d+\s+\(build\s+\d+\)/);
    // The stale "Phase 1 - Content shell" placeholder was removed in the
    // 2026-06 audit; the About card is now just brand + version.
  });

  it('persists the selected language to AsyncStorage', async () => {
    const view = renderWithProviders(<Settings />);
    await waitFor(() => view.getByText('Polski'));
    fireEvent.press(view.getByText('Polski'));
    await waitFor(async () => {
      const stored = await AsyncStorage.getItem('regatta.lang.v1');
      expect(stored).toBe('pl');
    });
  });
});
