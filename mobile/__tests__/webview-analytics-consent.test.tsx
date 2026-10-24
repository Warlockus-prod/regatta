// Contract: the in-app "Anonymous analytics" switch also covers the embedded
// web pages. When it is off, every WebView host (SectionWebView, SimWebView,
// OfflineRadioCourse) injects the no-analytics flag before the page's own
// scripts; the WebView does not mount before the stored choice is known; and
// a change made elsewhere (Settings) remounts the page with the new choice.
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Pressable, Text, View } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useNavigation: () => ({ addListener: () => () => {}, dispatch: jest.fn() }),
  useFocusEffect: (callback: () => void | (() => void)) => jest.requireActual('react').useEffect(callback, [callback]),
}));
jest.mock('expo-speech', () => ({
  getAvailableVoicesAsync: jest.fn().mockResolvedValue([]),
  stop: jest.fn().mockResolvedValue(undefined), speak: jest.fn(),
}));
jest.mock('../src/i18n/context', () => ({
  useI18n: () => ({ lang: 'en', tp: (_ru: string, en: string) => en }),
}));
jest.mock('../src/design-system/components', () => ({
  Screen: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View: RNView } = require('react-native');
  return {
    WebView: React.forwardRef((props: object, ref: unknown) => {
      React.useImperativeHandle(ref, () => ({ injectJavaScript: jest.fn() }));
      return React.createElement(RNView, { ...props, testID: 'webview' });
    }),
  };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SectionWebView } from '../src/course/SectionWebView';
import { SimWebView } from '../src/simulator/SimWebView';
import { OfflineRadioCourse } from '../src/course/OfflineRadioCourse';
import {
  ANALYTICS_CONSENT_KEY,
  WEB_NO_ANALYTICS_SCRIPT,
  useAnalyticsConsent,
} from '../src/persistence/analytics-consent';

const FLAG = '__REGATTA_NO_ANALYTICS__=true';

const hosts: [string, () => React.ReactElement][] = [
  ['SectionWebView', () => <SectionWebView path="/sternik" section="/sternik" title="Sternik" />],
  ['SimWebView', () => <SimWebView path="/simulator-v3" title="Trainer" tier="trainer" />],
  ['SimWebView (bundled)', () => (
    <SimWebView path="/simulator2" title="3D" tier="boat3d" offlineSource={{ uri: 'file:///bundle/sailing-offline.html' }} />
  )],
  ['OfflineRadioCourse', () => <OfflineRadioCourse />],
];

async function optOut() {
  await AsyncStorage.setItem(ANALYTICS_CONSENT_KEY, JSON.stringify({ enabled: false }));
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

it('the flag sets both the global and the sessionStorage marker the web side reads', () => {
  expect(WEB_NO_ANALYTICS_SCRIPT).toContain(FLAG);
  expect(WEB_NO_ANALYTICS_SCRIPT).toContain("sessionStorage.setItem('regatta.noanalytics.v1','1')");
});

describe.each(hosts)('%s', (_name, element) => {
  it('injects the no-analytics flag before the page scripts when analytics is off', async () => {
    await optOut();
    const view = render(element());
    const web = await waitFor(() => view.getByTestId('webview'));
    expect(web.props.injectedJavaScriptBeforeContentLoaded.startsWith(WEB_NO_ANALYTICS_SCRIPT)).toBe(true);
  });

  it('injects no flag when analytics is on (the default)', async () => {
    const view = render(element());
    const web = await waitFor(() => view.getByTestId('webview'));
    expect(web.props.injectedJavaScriptBeforeContentLoaded ?? '').not.toContain(FLAG);
  });
});

it('does not mount the page before the stored choice is read', async () => {
  await optOut();
  const view = render(<SectionWebView path="/sternik" section="/sternik" title="Sternik" />);
  expect(view.queryByTestId('webview')).toBeNull();
  await waitFor(() => expect(view.getByTestId('webview')).toBeTruthy());
});

it('the online /radio pages get the flag too', async () => {
  await optOut();
  const view = render(<OfflineRadioCourse />);
  const offline = await waitFor(() => view.getByTestId('webview'));
  act(() => {
    fireEvent(offline, 'message', {
      nativeEvent: { data: JSON.stringify({ type: 'radio-open-online', path: '/radio/symulator' }) },
    });
  });
  const online = view.getByTestId('webview');
  expect(online.props.source.uri).toContain('/radio/symulator');
  expect(online.props.injectedJavaScriptBeforeContentLoaded).toContain(FLAG);
});

// Stand-in for the Settings switch: another screen that flips the shared choice.
function ConsentToggle() {
  const { enabled, setEnabled } = useAnalyticsConsent();
  return (
    <Pressable accessibilityRole="button" onPress={() => setEnabled(!enabled)}>
      <Text>{enabled ? 'analytics on' : 'analytics off'}</Text>
    </Pressable>
  );
}

it('a change made elsewhere reloads the page with the new choice', async () => {
  const view = render(
    <View>
      <ConsentToggle />
      <SectionWebView path="/sternik" section="/sternik" title="Sternik" />
    </View>,
  );
  const before = await waitFor(() => view.getByTestId('webview'));
  await waitFor(() => view.getByText('analytics on'));
  expect(before.props.injectedJavaScriptBeforeContentLoaded).not.toContain(FLAG);

  fireEvent.press(view.getByText('analytics on'));
  await waitFor(() => view.getByText('analytics off'));
  const after = view.getByTestId('webview');
  expect(after).not.toBe(before);
  expect(after.props.injectedJavaScriptBeforeContentLoaded).toContain(FLAG);
  await waitFor(async () => {
    expect(await AsyncStorage.getItem(ANALYTICS_CONSENT_KEY)).toBe(JSON.stringify({ enabled: false }));
  });
});
