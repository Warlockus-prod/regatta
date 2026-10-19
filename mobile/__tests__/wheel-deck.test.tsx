// Contract: the native wheel deck is three VoiceOver-adjustable controls
// (helm 5 degrees, sheets 5% per step) that drive the trainer's own setters,
// clicks only when sound is on, never vibrates, keeps 44 pt targets and
// moves without animation under Reduce Motion.
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Reanimated from 'react-native-reanimated';
import { WheelDeck, type WheelDeckProps } from '../src/simulator/WheelDeck';
import { playWheelTick } from '../src/simulator/wheel-sound';
import { I18nProvider } from '../src/i18n/context';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageTag: 'en-US' }] }));
jest.mock('../src/simulator/wheel-sound', () => ({ playWheelTick: jest.fn() }));

function props(over: Partial<WheelDeckProps> = {}): WheelDeckProps {
  return {
    targetHeadingDeg: 90,
    windFromDeg: 0,
    mainSheet: 0.6,
    jibSheet: 0.7,
    onCourse: jest.fn(),
    setMainSheet: jest.fn(),
    setJibSheet: jest.fn(),
    sound: false,
    sensitivity: 1,
    jibSheetSide: 'left',
    ...over,
  };
}

const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider initialLang="en">{children}</I18nProvider>;
/** Renders and lets the language and hint storage reads settle. */
async function mount(ui: React.ReactElement) {
  const view = render(ui, { wrapper });
  await act(async () => { await Promise.resolve(); });
  return view;
}

const action = (actionName: string) => ({ nativeEvent: { actionName } });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
});

describe('native wheel deck', () => {
  it('exposes the helm and both sheets as adjustable controls with spoken values', async () => {
    const view = await mount(<WheelDeck {...props()} />);
    const helm = view.getByTestId('wheel-helm');
    expect(helm.props.accessibilityRole).toBe('adjustable');
    expect(helm.props.accessibilityLabel).toBe('Helm');
    expect(helm.props.accessibilityValue).toMatchObject({ now: 90, min: 0, max: 359, text: '90° heading' });
    expect(helm.props.accessibilityActions).toEqual([{ name: 'increment' }, { name: 'decrement' }]);
    const main = view.getByTestId('wheel-main');
    expect(main.props.accessibilityLabel).toBe('Mainsheet');
    expect(main.props.accessibilityValue).toMatchObject({ now: 40, min: 0, max: 100, text: '40%, eased' });
    expect(view.getByTestId('wheel-jib').props.accessibilityLabel).toBe('Jib sheet');
    await waitFor(() => expect(view.getByText(/Turn a wheel in a circle/)).toBeTruthy());
  });

  it('steps the course 5 degrees through the trainer setter', async () => {
    const p = props();
    const view = await mount(<WheelDeck {...p} />);
    const helm = view.getByTestId('wheel-helm');
    fireEvent(helm, 'accessibilityAction', action('increment'));
    expect(p.onCourse).toHaveBeenLastCalledWith(95);
    fireEvent(helm, 'accessibilityAction', action('decrement'));
    fireEvent(helm, 'accessibilityAction', action('decrement'));
    expect(p.onCourse).toHaveBeenLastCalledWith(85);
  });

  it('steps a sheet 5%: increment eases, decrement sheets in, in native units', async () => {
    const p = props();
    const view = await mount(<WheelDeck {...p} />);
    fireEvent(view.getByTestId('wheel-main'), 'accessibilityAction', action('increment'));
    expect(p.setMainSheet).toHaveBeenLastCalledWith(0.55); // ease 40% -> 45%
    fireEvent(view.getByTestId('wheel-jib'), 'accessibilityAction', action('decrement'));
    expect(p.setJibSheet).toHaveBeenLastCalledWith(0.75); // ease 30% -> 25%
    expect(p.onCourse).not.toHaveBeenCalled();
  });

  it('stays silent with sound off and clicks with sound on, never vibrating', async () => {
    const off = await mount(<WheelDeck {...props()} />);
    fireEvent(off.getByTestId('wheel-helm'), 'accessibilityAction', action('increment'));
    fireEvent(off.getByTestId('wheel-main'), 'accessibilityAction', action('increment'));
    expect(playWheelTick).not.toHaveBeenCalled();
    off.unmount();

    const on = await mount(<WheelDeck {...props({ sound: true, mainSheet: 0.05 })} />);
    fireEvent(on.getByTestId('wheel-helm'), 'accessibilityAction', action('increment'));
    expect(playWheelTick).toHaveBeenLastCalledWith('tick');
    fireEvent(on.getByTestId('wheel-main'), 'accessibilityAction', action('increment'));
    expect(playWheelTick).toHaveBeenLastCalledWith('stop'); // ease 95% -> 100%
    for (const fn of [Haptics.selectionAsync, Haptics.impactAsync, Haptics.notificationAsync]) {
      expect(fn).not.toHaveBeenCalled();
    }
  });

  it('keeps every wheel at least 44 pt', async () => {
    const view = await mount(<WheelDeck {...props()} />);
    for (const id of ['wheel-helm', 'wheel-main', 'wheel-jib']) {
      const s = StyleSheet.flatten(view.getByTestId(id).props.style);
      expect(s.width).toBeGreaterThanOrEqual(44);
      expect(s.height).toBeGreaterThanOrEqual(44);
    }
  });

  it('moves the wheels without animation when Reduce Motion is on', async () => {
    const timing = jest.spyOn(Reanimated, 'withTiming');
    const run = async (reduce: boolean) => {
      jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(reduce);
      const view = await mount(<WheelDeck {...props()} />);
      timing.mockClear();
      // Moving the jib sheet to the other side moves two wheels.
      view.rerender(<WheelDeck {...props({ jibSheetSide: 'right' })} />);
      const calls = timing.mock.calls.length;
      view.unmount();
      return calls;
    };
    expect(await run(true)).toBe(0);
    expect(await run(false)).toBeGreaterThan(0);
  });
});
