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

import { AppState } from 'react-native';
import Simulator from '../../app/simulator';
import { fetchWeatherNow } from '../../src/api/weather';
import { renderWithProviders } from '../../src/test-utils';

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
});

afterEach(() => {
  appState.currentState = mockedCurrentState;
  jest.useRealTimers();
  delete (globalThis as { __simParams?: object }).__simParams;
});

describe('Native trainer (/simulator)', () => {
  it('mounts on a plain open in free mode with the top view', async () => {
    const view = await mountAndTick();
    expect(chip(view, 'Free').props.accessibilityState.selected).toBe(true);
    expect(chip(view, 'Top').props.accessibilityState.selected).toBe(true);
    expect(view.getByLabelText(/^Wind and steering control/)).toBeTruthy();
    expect(fetchWeatherNow).not.toHaveBeenCalled();
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
});
