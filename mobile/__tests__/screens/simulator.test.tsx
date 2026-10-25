// Contract: the native trainer (/simulator, 3,500 lines, the offline fallback
// for every WebView simulator and the target of the bootcamp drill links)
// mounts and keeps ticking in each of its views: plain open, a bootcamp drill
// deep link (?drill=&lesson=), and after switching to the side and rear views.
import { act, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => (globalThis as { __simParams?: object }).__simParams ?? {},
  Link: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'en-US' }],
}));
jest.mock('expo-screen-orientation', () => ({
  OrientationLock: { PORTRAIT_UP: 3 },
  lockAsync: jest.fn().mockResolvedValue(undefined),
  unlockAsync: jest.fn().mockResolvedValue(undefined),
}));
// Live wind is opt-in and network-backed; keep it offline.
jest.mock('../../src/api/weather', () => ({
  fetchWeatherNow: jest.fn().mockResolvedValue({ ok: false, error: 'offline' }),
}));
// The shared Skia stub in jest.setup.js lacks the primitives this screen
// uses (Fill, RadialGradient, vec, curve paths); extend it here.
jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const { View } = require('react-native');
  const passthrough = (props: { children?: React.ReactNode }) =>
    React.createElement(View, props, props && props.children);
  const makePath = () => {
    const path: Record<string, () => unknown> = {};
    for (const m of ['moveTo', 'lineTo', 'quadTo', 'cubicTo', 'close', 'addCircle', 'addPath', 'transform', 'reset']) {
      path[m] = () => path;
    }
    return path;
  };
  return {
    __esModule: true,
    Canvas: passthrough,
    Group: passthrough,
    Path: passthrough,
    Circle: passthrough,
    Line: passthrough,
    Rect: passthrough,
    Fill: passthrough,
    RadialGradient: passthrough,
    LinearGradient: passthrough,
    Text: passthrough,
    Image: passthrough,
    Skia: {
      Path: { Make: makePath },
      Color: () => 0,
      Matrix: () => ({ identity() {} }),
    },
    vec: (x: number, y: number) => ({ x, y }),
    useImage: () => null,
  };
});

import { AppState, StyleSheet } from 'react-native';
import Simulator from '../../app/simulator';
import { fetchWeatherNow } from '../../src/api/weather';
import { renderWithProviders } from '../../src/test-utils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONTROLS_STORAGE_KEY, __resetControlPrefsForTests, setControlPrefs } from '../../src/persistence/controls';

type View = ReturnType<typeof renderWithProviders>;

function setParams(params: Record<string, string>) {
  (globalThis as { __simParams?: object }).__simParams = params;
}

function chip(view: View, name: string) {
  return view.getByRole('button', { name });
}

/** Advances the 30 Hz loop and checks that the scene actually changed. */
async function tick(view: View, ms: number) {
  const before = JSON.stringify(view.toJSON());
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
  expect(JSON.stringify(view.toJSON())).not.toBe(before);
}

async function mountAndTick(): Promise<View> {
  const view = renderWithProviders(<Simulator />);
  await tick(view, 3000);
  return view;
}

// The RN Jest mock makes AppState.currentState a bare jest.fn; the sim loop
// only runs while the app is 'active'.
const appState = AppState as unknown as { currentState: unknown };
const mockedCurrentState = appState.currentState;

beforeEach(() => {
  jest.useFakeTimers();
  appState.currentState = 'active';
  setParams({});
  jest.spyOn(require('react-native'), 'useWindowDimensions').mockReturnValue({ width: 390, height: 844, scale: 1, fontScale: 1 });
});

afterEach(() => {
  appState.currentState = mockedCurrentState;
  jest.useRealTimers();
  jest.restoreAllMocks();
  delete (globalThis as { __simParams?: object }).__simParams;
});

describe('Native trainer (/simulator)', () => {
  it('mounts on a plain open in free mode with the top view', async () => {
    const view = await mountAndTick();
    expect(chip(view, 'Free').props.accessibilityState.selected).toBe(true);
    expect(chip(view, 'Top').props.accessibilityState.selected).toBe(true);
    expect(view.getByLabelText(/^Wind and steering control/)).toBeTruthy();
    expect(fetchWeatherNow).not.toHaveBeenCalled();
    // A clean install uses the same wheel cockpit as the 3D trainers.
    expect(view.getByTestId('wheel-deck')).toBeTruthy();
    expect(view.queryByLabelText('Steer to port')).toBeNull();
    expect(view.queryByLabelText('Steer to starboard')).toBeNull();
    expect(view.queryByLabelText(/^Mainsheet, 0% sheeted in/)).toBeNull();
  });

  it('opens a bootcamp drill link (?drill=&lesson=) in drill mode', async () => {
    setParams({ drill: 'twa45', lesson: 'wind-direction' });
    const view = await mountAndTick();
    await waitFor(() => expect(chip(view, 'Drill').props.accessibilityState.selected).toBe(true));
    expect(chip(view, 'Free').props.accessibilityState.selected).toBe(false);
    expect(view.getByText(/TWA held: \d+ \/ 30 sec/)).toBeTruthy();
  });

  it('ignores an unknown drill id and stays in free mode', async () => {
    setParams({ drill: 'not-a-drill', lesson: 'wind-direction' });
    const view = await mountAndTick();
    expect(chip(view, 'Free').props.accessibilityState.selected).toBe(true);
  });

  it('switches to the side and rear views and keeps running', async () => {
    const view = await mountAndTick();
    fireEvent.press(chip(view, 'Side'));
    await tick(view, 1000);
    expect(chip(view, 'Side').props.accessibilityState.selected).toBe(true);
    expect(view.queryByLabelText(/^Wind and steering control/)).toBeNull();

    fireEvent.press(chip(view, 'Rear'));
    await tick(view, 1000);
    expect(chip(view, 'Rear').props.accessibilityState.selected).toBe(true);
    expect(view.queryByLabelText(/^Wind and steering control/)).toBeNull();

    fireEvent.press(chip(view, 'Top'));
    expect(view.getByLabelText(/^Wind and steering control/)).toBeTruthy();
  });

  it('honours a ?view=rear deep link', async () => {
    setParams({ view: 'rear' });
    const view = await mountAndTick();
    expect(chip(view, 'Rear').props.accessibilityState.selected).toBe(true);
  });

  it('keeps an existing slider choice and changes live to wheels when Settings selects them', async () => {
    await AsyncStorage.setItem(CONTROLS_STORAGE_KEY, JSON.stringify({ version: 1, mode: 'sliders', sound: false }));
    __resetControlPrefsForTests();
    const view = await mountAndTick();
    await waitFor(() => expect(view.getByLabelText(/^Mainsheet, 0% sheeted in/)).toBeTruthy());
    expect(view.queryByTestId('wheel-deck')).toBeNull();
    expect(view.getByLabelText('Steer to port')).toBeTruthy();
    const beforeSteer = view.getByLabelText(/^Wind and steering control/).props.accessibilityLabel;
    fireEvent(view.getByLabelText('Steer to port'), 'pressIn');
    await act(async () => { jest.advanceTimersByTime(500); });
    fireEvent(view.getByLabelText('Steer to port'), 'pressOut');
    expect(view.getByLabelText(/^Wind and steering control/).props.accessibilityLabel).not.toBe(beforeSteer);
    act(() => setControlPrefs({ version: 1, mode: 'wheels', sound: false }));
    await waitFor(() => expect(view.getByTestId('wheel-deck')).toBeTruthy());
    expect(view.queryByLabelText(/^Mainsheet, 0% sheeted in/)).toBeNull();
    expect(view.getByLabelText('TWIST')).toBeTruthy();
    expect(view.queryByLabelText('Steer to port')).toBeNull();
    expect(view.queryByLabelText('Steer to starboard')).toBeNull();
    const helm = view.getByTestId('wheel-helm');
    const before = helm.props.accessibilityValue.now as number;
    fireEvent(helm, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    await act(async () => { jest.advanceTimersByTime(200); });
    expect(view.getByTestId('wheel-helm').props.accessibilityValue.now).toBe((before + 5) % 360);
    await AsyncStorage.removeItem(CONTROLS_STORAGE_KEY);
    __resetControlPrefsForTests();
  });

  it('reserves the scene for its diagram and keeps wind and controls in the dock', async () => {
    const view = await mountAndTick();
    const scene = view.getByTestId('native-trainer-scene');
    const dock = view.getByTestId('native-trainer-controls');
    const inRegion = (node: { parent: unknown }, region: unknown): boolean => {
      let current: unknown = node;
      while (current) {
        if (current === region) return true;
        current = (current as { parent: unknown }).parent;
      }
      return false;
    };
    for (const node of scene.findAll((node: { props: { style?: unknown } }) => node.props.style && typeof node.props.style === 'object')) {
      expect((StyleSheet.flatten(node.props.style) ?? {}).position).not.toBe('absolute');
      expect(node.props.accessibilityRole).not.toBe('button');
      expect(node.props.accessibilityRole).not.toBe('switch');
    }
    const compass = view.getByTestId('native-trainer-compass');
    expect(inRegion(compass, scene)).toBe(false);
    expect(inRegion(compass, dock)).toBe(true);
    expect(inRegion(view.getByRole('button', { name: /^Wind:/ }), dock)).toBe(true);
    const previousWind = compass.props.accessibilityValue.now as number;
    fireEvent(compass, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    await act(async () => { jest.advanceTimersByTime(50); });
    expect(view.getByTestId('native-trainer-compass').props.accessibilityValue.now).toBe((previousWind + 15) % 360);
    for (const control of [...view.getAllByRole('button'), ...view.getAllByRole('switch')]) {
      const style = StyleSheet.flatten(control.props.style);
      expect(style.height ?? style.minHeight).toBeGreaterThanOrEqual(44);
    }
  });

  it.each([
    { width: 320, height: 568, hostHeight: 443, landscape: false },
    { width: 667, height: 375, hostHeight: 290, landscape: true },
  ])('fits the measured $width x $height host with a reserved scrolling dock', async dimensions => {
    const orientation = require('expo-screen-orientation');
    const previousUnlocks = orientation.unlockAsync.mock.calls.length;
    jest.mocked(require('react-native').useWindowDimensions).mockReturnValue({ width: dimensions.width, height: dimensions.height, scale: 1, fontScale: 1 });
    const view = await mountAndTick();
    expect(orientation.unlockAsync).toHaveBeenCalledTimes(previousUnlocks + 1);
    fireEvent(view.getByTestId('native-trainer-workspace'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: dimensions.width, height: dimensions.hostHeight } } });
    const workspace = StyleSheet.flatten(view.getByTestId('native-trainer-workspace').props.style);
    const column = StyleSheet.flatten(view.getByTestId('native-trainer-scene-column').props.style);
    const scene = StyleSheet.flatten(view.getByTestId('native-trainer-scene').props.style);
    const dock = StyleSheet.flatten(view.getByTestId('native-trainer-controls').props.style);
    expect(scene.width + 40).toBeLessThanOrEqual(column.width + 0.01);
    expect(scene.height).toBeGreaterThanOrEqual(96);
    expect(scene.height).toBeLessThan(dimensions.hostHeight - 120);
    expect(dock.flex).toBe(1);
    expect(dock.minHeight).toBe(0);
    if (dimensions.landscape) {
      expect(workspace.flexDirection).toBe('row');
      expect(column.width + dock.width).toBeCloseTo(dimensions.width);
    } else {
      expect(column.width).toBe(dimensions.width);
      expect(workspace.flexDirection).not.toBe('row');
    }
    expect(orientation.unlockAsync).toHaveBeenCalledTimes(previousUnlocks + 1);
    view.unmount();
    expect(orientation.lockAsync).toHaveBeenLastCalledWith(orientation.OrientationLock.PORTRAIT_UP);
  });

  it('keeps a real drill timeout and retry in the reserved dock without covering the boat', async () => {
    setParams({ drill: 'noGoRecovery' });
    const view = await mountAndTick();
    await act(async () => { jest.advanceTimersByTime(31000); });
    const result = view.getByTestId('native-trainer-result');
    expect(StyleSheet.flatten(result.props.style).position).not.toBe('absolute');
    expect(result.findByProps({ accessibilityLabel: 'Try again' })).toBeTruthy();
    let parent = result.parent;
    while (parent && parent !== view.getByTestId('native-trainer-controls')) parent = parent.parent;
    expect(parent).toBe(view.getByTestId('native-trainer-controls'));
    expect(view.getByTestId('native-trainer-scene')).toBeTruthy();
    fireEvent.press(view.getByRole('button', { name: 'Try again' }));
    await act(async () => { jest.advanceTimersByTime(100); });
    expect(view.queryByTestId('native-trainer-result')).toBeNull();
    expect(chip(view, 'Drill').props.accessibilityState.selected).toBe(true);
    expect(fetchWeatherNow).not.toHaveBeenCalled();
  });
});
