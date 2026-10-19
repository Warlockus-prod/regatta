// Contract: the app's PostHog client never asks for IP-based location
// (disableGeoip), and a stored opt-out is applied to it on launch.
import { waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'en-US' }],
}));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '9.9.9', extra: {} } },
}));
jest.mock('../src/analytics/config', () => ({
  analyticsEnabled: true,
  posthogApiKey: 'phc_test_key',
  posthogHost: 'https://eu.i.posthog.com',
}));
jest.mock('posthog-react-native', () => {
  const ctor = jest.fn().mockImplementation(() => ({
    register: jest.fn().mockResolvedValue(undefined),
    optIn: jest.fn(),
    optOut: jest.fn(),
  }));
  return {
    __esModule: true,
    default: ctor,
    PostHogProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import PostHog from 'posthog-react-native';
import { AnalyticsProvider } from '../src/analytics/provider';
import { ANALYTICS_CONSENT_KEY } from '../src/persistence/analytics-consent';
import { renderWithProviders } from '../src/test-utils';

const PostHogMock = PostHog as unknown as jest.Mock;

beforeEach(async () => {
  await AsyncStorage.clear();
  PostHogMock.mockClear();
});

it('builds the client with GeoIP disabled', async () => {
  renderWithProviders(
    <AnalyticsProvider>
      <Text>child</Text>
    </AnalyticsProvider>,
  );
  expect(PostHogMock).toHaveBeenCalledTimes(1);
  expect(PostHogMock).toHaveBeenCalledWith(
    'phc_test_key',
    expect.objectContaining({ host: 'https://eu.i.posthog.com', disableGeoip: true }),
  );
  // No stored choice: the default (on) is applied once the read settles.
  const client = PostHogMock.mock.results[0]!.value as { optIn: jest.Mock };
  await waitFor(() => expect(client.optIn).toHaveBeenCalled());
});

it('applies a stored opt-out to the client', async () => {
  await AsyncStorage.setItem(ANALYTICS_CONSENT_KEY, JSON.stringify({ enabled: false }));
  renderWithProviders(
    <AnalyticsProvider>
      <Text>child</Text>
    </AnalyticsProvider>,
  );
  const client = PostHogMock.mock.results[0]!.value as { optOut: jest.Mock; optIn: jest.Mock };
  await waitFor(() => expect(client.optOut).toHaveBeenCalled());
  expect(client.optIn).not.toHaveBeenCalled();
});
