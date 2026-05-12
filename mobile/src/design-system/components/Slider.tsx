import { useCallback, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import {
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { colors, radii, spacing } from '../tokens';
import { Text } from './Text';

export type SliderOrientation = 'horizontal' | 'vertical';

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  orientation?: SliderOrientation;
  min?: number;
  max?: number;
  step?: number;
  width?: number;
  height?: number;
  formatValue?: (value: number) => string;
  /**
   * Optional overriding accessibilityLabel. Defaults to the visible
   * `label` prop. Useful when the visible label is a glyph or
   * abbreviation that needs a fuller spoken form.
   */
  accessibilityLabel?: string;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function defaultFormat(v: number): string {
  return `${Math.round(v * 100)}%`;
}

/**
 * Pan-driven slider with cyan track and a knob with cyan glow. Light haptic
 * fires on touch start, plus a tick whenever the value crosses a step
 * boundary (default 10%). Vertical layout reads as "sheet": top of the
 * track = hard sheeted (1.0), bottom = fully eased (0.0). Horizontal layout
 * reads left-to-right (0 to 1).
 */
export function Slider({
  label,
  value,
  onChange,
  orientation = 'vertical',
  min = 0,
  max = 1,
  step = 0.1,
  width,
  height,
  formatValue = defaultFormat,
  accessibilityLabel,
}: SliderProps) {
  const trackLengthRef = useRef(0);
  const lastStepRef = useRef<number>(Math.round(value / step));

  function clampRange(v: number): number {
    return clamp(v, min, max);
  }
  const nudgeBy = (max - min) * 0.05;
  const handleA11yAction = useCallback(
    (e: AccessibilityActionEvent) => {
      if (e.nativeEvent.actionName === 'increment') {
        onChange(clampRange(value + nudgeBy));
        Haptics.selectionAsync().catch(() => {});
      } else if (e.nativeEvent.actionName === 'decrement') {
        onChange(clampRange(value - nudgeBy));
        Haptics.selectionAsync().catch(() => {});
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onChange, value, nudgeBy, min, max],
  );
  const a11yRatio = clamp((value - min) / (max - min), 0, 1);
  const a11yNow = Math.round(a11yRatio * 100);
  const a11yProps = {
    accessible: true,
    accessibilityRole: 'adjustable' as const,
    accessibilityLabel: accessibilityLabel ?? label,
    accessibilityValue: { min: 0, max: 100, now: a11yNow },
    accessibilityActions: [
      { name: 'increment' as const },
      { name: 'decrement' as const },
    ],
    onAccessibilityAction: handleA11yAction,
  };

  const setFromCoord = useCallback(
    (coord: number) => {
      const len = trackLengthRef.current;
      if (len <= 0) return;
      const t = clamp(coord / len, 0, 1);
      const ratio = orientation === 'vertical' ? 1 - t : t;
      const next = clamp(min + ratio * (max - min), min, max);
      const stepIdx = Math.round(next / step);
      if (stepIdx !== lastStepRef.current) {
        lastStepRef.current = stepIdx;
        Haptics.selectionAsync().catch(() => {});
      }
      onChange(next);
    },
    [orientation, min, max, step, onChange],
  );

  const pan = Gesture.Pan()
    .runOnJS(true)
    .minDistance(0)
    .onBegin((e) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const c = orientation === 'vertical' ? e.y : e.x;
      setFromCoord(c);
    })
    .onChange((e) => {
      const c = orientation === 'vertical' ? e.y : e.x;
      setFromCoord(c);
    });

  const ratio = clamp((value - min) / (max - min), 0, 1);
  const fillPct = Math.round(ratio * 100);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      trackLengthRef.current =
        orientation === 'vertical'
          ? e.nativeEvent.layout.height
          : e.nativeEvent.layout.width;
    },
    [orientation],
  );

  if (orientation === 'vertical') {
    const trackH = height ?? 124;
    return (
      <View style={[stylesV.wrap, { width: width ?? 56 }]} {...a11yProps}>
        <Text allowFontScaling={false} style={stylesV.label}>{label}</Text>
        <Text allowFontScaling={false} style={stylesV.value}>{formatValue(value)}</Text>
        <GestureDetector gesture={pan}>
          <View
            style={[stylesV.track, { height: trackH }]}
            onLayout={onLayout}
          >
            <View style={stylesV.trackBg} />
            <View
              style={[stylesV.fill, { height: `${fillPct}%` }]}
            />
            <View
              style={[stylesV.knob, { bottom: `${fillPct}%` }]}
              pointerEvents="none"
            />
          </View>
        </GestureDetector>
      </View>
    );
  }

  const trackW = width ?? 160;
  return (
    <View style={stylesH.wrap} {...a11yProps}>
      <View style={stylesH.head}>
        <Text allowFontScaling={false} style={stylesH.label}>{label}</Text>
        <Text allowFontScaling={false} style={stylesH.value}>{formatValue(value)}</Text>
      </View>
      <GestureDetector gesture={pan}>
        <View style={[stylesH.track, { width: trackW }]} onLayout={onLayout}>
          <View style={stylesH.trackBg} />
          <View style={[stylesH.fill, { width: `${fillPct}%` }]} />
          <View
            style={[stylesH.knob, { left: `${fillPct}%` }]}
            pointerEvents="none"
          />
        </View>
      </GestureDetector>
    </View>
  );
}

const KNOB = 18;

const stylesV = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.xs,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  value: {
    color: colors.accentCyan,
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  track: {
    width: 22,
    borderRadius: radii.pill,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'visible',
    marginTop: 2,
  },
  trackBg: {
    position: 'absolute',
    left: 9,
    right: 9,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(232, 244, 248, 0.12)',
    borderRadius: radii.pill,
  },
  fill: {
    position: 'absolute',
    left: 9,
    right: 9,
    bottom: 0,
    backgroundColor: colors.accentCyan,
    borderRadius: radii.pill,
    opacity: 0.85,
  },
  knob: {
    position: 'absolute',
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: colors.bgPrimary,
    borderColor: colors.accentCyan,
    borderWidth: 2,
    marginBottom: -KNOB / 2,
    shadowColor: colors.accentCyan,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
});

const stylesH = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  value: {
    color: colors.accentCyan,
    fontSize: 11,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 22,
    borderRadius: radii.pill,
    justifyContent: 'center',
  },
  trackBg: {
    position: 'absolute',
    top: 9,
    bottom: 9,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(232, 244, 248, 0.12)',
    borderRadius: radii.pill,
  },
  fill: {
    position: 'absolute',
    top: 9,
    bottom: 9,
    left: 0,
    backgroundColor: colors.accentCyan,
    borderRadius: radii.pill,
    opacity: 0.85,
  },
  knob: {
    position: 'absolute',
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: colors.bgPrimary,
    borderColor: colors.accentCyan,
    borderWidth: 2,
    marginLeft: -KNOB / 2,
    shadowColor: colors.accentCyan,
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
});
