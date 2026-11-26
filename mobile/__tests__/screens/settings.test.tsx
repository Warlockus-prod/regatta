import { fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const mockPush = jest.fn();
let mockAdsDemo = true;
jest.mock('../../src/config/ads-demo', () => ({
  get ADS_DEMO_ENABLED() {
    return mockAdsDemo;
  },
}));
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({
    push: mockPush,
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

// expo-application ships the same untransformed ESM; stub the two fields the
// Settings "about" line reads (Application.nativeApplicationVersion / nativeBuildVersion).
jest.mock('expo-application', () => ({
  __esModule: true,
  nativeApplicationVersion: '1.5.0',
  nativeBuildVersion: '31',
}));

import { Alert, type AlertButton } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Settings from '../../app/settings';
import { renderWithProviders } from '../../src/test-utils';
import {
  ANALYTICS_CONSENT_KEY,
  readAnalyticsEnabled,
} from '../../src/persistence/analytics-consent';

beforeEach(async () => {
  mockPush.mockReset();
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Settings screen', () => {
  it('opens the Ads formats from its named Settings entry', async () => {
    mockAdsDemo = true;
    const view = renderWithProviders(<Settings />);
    const button = await waitFor(() => view.getByRole('button', { name: 'Ads' }));
    fireEvent.press(button);
    expect(mockPush).toHaveBeenCalledWith('/ads');
  });
  it('keeps Ads at the very bottom of Settings, below Data (owner 2026-11-05)', async () => {
    mockAdsDemo = true;
    const view = renderWithProviders(<Settings />);
    await waitFor(() => view.getByRole('button', { name: 'Ads' }));
    const tree = JSON.stringify(view.toJSON());
    expect(tree.indexOf('"Ads"')).toBeGreaterThan(tree.indexOf('Polski'));
    expect(tree.indexOf('"Ads"')).toBeGreaterThan(tree.indexOf('Clear all data'));
    expect(tree.indexOf('"Ads"')).toBeLessThan(tree.lastIndexOf('Week to Regatta'));
  });
  it('has no Ads entry in a store build (EXPO_PUBLIC_ADS_DEMO unset)', async () => {
    mockAdsDemo = false;
    const view = renderWithProviders(<Settings />);
    await waitFor(() => view.getByText('Polski'));
    expect(view.queryByRole('button', { name: 'Ads' })).toBeNull();
    mockAdsDemo = true;
  });
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

  // Contract: "Clear all data" never turns an opted-out user's analytics back
  // on (the default is on, so wiping the choice would do exactly that).
  it('"Clear all data" keeps the analytics opt-out and wipes everything else', async () => {
    await AsyncStorage.multiSet([
      [ANALYTICS_CONSENT_KEY, JSON.stringify({ enabled: false })],
      ['regatta.progress.bootcamp.v1', JSON.stringify(['wind-direction'])],
      ['regatta.units.v1', JSON.stringify({ speed: 'kmh' })],
    ]);
    // Accept both confirmation steps; the final "Done" alert has no action.
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons?: AlertButton[]) => {
      buttons?.find((b) => b.text === 'Continue' || b.text === 'Delete all')?.onPress?.();
    });
    const view = renderWithProviders(<Settings />);
    fireEvent.press(await waitFor(() => view.getByRole('button', { name: 'Clear all data' })));
    await waitFor(async () => {
      expect(await AsyncStorage.getItem('regatta.progress.bootcamp.v1')).toBeNull();
    });
    expect(await AsyncStorage.getItem('regatta.units.v1')).toBeNull();
    expect(await readAnalyticsEnabled()).toBe(false);
  });

  it('reports an unconfirmed global clear instead of a false Done alert', async () => {
    await AsyncStorage.setItem('regatta.best-times.v1', 'preserve-unread-data');
    const alerts = jest.spyOn(Alert, 'alert').mockImplementation((_title, _body, buttons?: AlertButton[]) => {
      buttons?.find(button => button.text === 'Continue' || button.text === 'Delete all')?.onPress?.();
    });
    const view = renderWithProviders(<Settings />);
    const button = await waitFor(() => view.getByRole('button', { name: 'Clear all data' }));
    (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValueOnce(new Error('storage-read-failure'));
    fireEvent.press(button);
    await waitFor(() => expect(alerts).toHaveBeenCalledWith('Clear not confirmed', expect.stringContaining('Restart the app'), expect.any(Array)));
    expect(alerts.mock.calls.some(([title]) => title === 'Done')).toBe(false);
    expect(await AsyncStorage.getItem('regatta.best-times.v1')).toBe('preserve-unread-data');
  });
});

// Package 13 (ADR-0022): Settings offer the race's helm control, the same row
// as the race hub and the race's own settings. Contract: a new install shows
// the arrows, a stored trainers' record keeps its mode, a pick is stored.
describe('Settings: race helm', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('../../src/persistence/controls').__resetControlPrefsForTests();
  });
  it('a new install steers the race with the arrows; a pick is stored in the race row', async () => {
    const view = renderWithProviders(<Settings />);
    const arrows = await waitFor(() => view.getByTestId('race-helm-arrows'));
    await waitFor(() => expect(arrows.props.accessibilityState).toMatchObject({ checked: true, disabled: false }));
    view.getByText('RACE HELM');
    fireEvent.press(view.getByTestId('race-helm-wheels'));
    await waitFor(async () => expect(await AsyncStorage.getItem('regatta.race.helm.v1')).toBe('wheels'));
    await waitFor(() => expect(view.getByTestId('race-helm-wheels').props.accessibilityState).toMatchObject({ checked: true }));
  });
  it('a stored trainers record keeps its mode for the race until a race control is picked', async () => {
    await AsyncStorage.setItem('regatta.controls.v1', JSON.stringify({ version: 1, mode: 'sliders', sound: false }));
    const view = renderWithProviders(<Settings />);
    await waitFor(() => expect(view.getByTestId('race-helm-sliders').props.accessibilityState).toMatchObject({ checked: true, disabled: false }));
    expect(await AsyncStorage.getItem('regatta.race.helm.v1')).toBeNull();
  });
});
