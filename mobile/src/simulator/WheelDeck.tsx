// Wheel mode of the native trainer (app/simulator/index.tsx), the React Native
// twin of the web's src/features/trainer-controls/WheelDeck.tsx: a big helm
// wheel in the middle, the jib sheet and the mainsheet small in the lower
// corners. Tapping a small sheet wheel swaps it with the helm; tapping the
// helm swaps back; after 4 s without a turn the sheet goes back by itself.
// The helm sets a course through the trainer's own setTargetHeading, the
// sheets the same 0..1 values as the sliders. No vibration here (owner
// decision 2026-10-19): clicks are sound and only when sound is on.

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, type AccessibilityActionEvent, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, Line, Marker, Path, Rect } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useI18n } from '../i18n/context';
import { Text } from '../design-system/components/Text';
// Both hosts (the race and Basics) are dark instrument screens.
import { darkColors as colors } from '../design-system/tokens';
import { angleDelta, type Sensitivity } from '../../../src/features/trainer-controls/mapping';
import {
  COLLAPSE_MS,
  a11yStep,
  deckLayout,
  easeToSheet,
  helmStepWheelDeg,
  normalizeDeg,
  sheetRotation,
  sheetToEase,
  stepSheetEase,
  trackTurn,
  turnHelmCourse,
  turnSheetEase,
  type Box,
  type TickKind,
} from './wheel-controls';
import { playWheelTick } from './wheel-sound';

/** Height of the wheel area; the helm gets up to 176 pt inside it. */
export const DECK_H = 250;
const SWAP_MS = 180;
const HINT_KEY = 'regatta.controls.wheelHint';

// Rim and spokes: the web mixes text-secondary into the card color (45% and 70%).
const RIM = '#4a5f76';
const SPOKE = '#688094';

/** Follows the system Reduce Motion setting. */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (alive) setReduce(v); })
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => { alive = false; sub.remove(); };
  }, []);
  return reduce;
}

interface WheelProps {
  kind: 'helm' | 'sheet';
  box: Box;
  small: boolean;
  rotation: number;
  label: string;
  valueText: string;
  value: string;
  unit?: string;
  a11yNow: number;
  a11yMin: number;
  a11yMax: number;
  reduceMotion: boolean;
  onActivate: () => void;
  onTurn: (deltaDeg: number) => void;
  onStep: (steps: number) => void;
  testID: string;
}

function Wheel(props: WheelProps) {
  const { kind, box, small, rotation, label, valueText, value, unit, a11yNow, a11yMin, a11yMax, reduceMotion, onActivate, onTurn, onStep, testID } = props;
  const [cx, cy, d] = box;
  const left = useSharedValue(cx - d / 2);
  const top = useSharedValue(cy - d / 2);
  const size = useSharedValue(d);
  useEffect(() => {
    const go = (v: number) => (reduceMotion ? v : withTiming(v, { duration: SWAP_MS }));
    left.value = go(cx - d / 2);
    top.value = go(cy - d / 2);
    size.value = go(d);
  }, [cx, cy, d, reduceMotion, left, top, size]);
  const placed = useAnimatedStyle(() => ({ left: left.value, top: top.value, width: size.value, height: size.value }));

  // Gesture callbacks read the latest geometry and handlers through refs, so
  // the gesture object is built once per wheel.
  const live = useRef({ d, onActivate, onTurn });
  live.current = { d, onActivate, onTurn };
  const last = useRef(0);
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(0)
        .onBegin((e) => {
          live.current.onActivate();
          last.current = trackTurn(0, e.x, e.y, live.current.d).last;
        })
        .onChange((e) => {
          const t = trackTurn(last.current, e.x, e.y, live.current.d);
          last.current = t.last;
          if (t.delta !== 0) live.current.onTurn(t.delta);
        }),
    [],
  );

  const onA11y = (e: AccessibilityActionEvent) => {
    const s = a11yStep(e.nativeEvent.actionName);
    if (s !== 0) onStep(s);
  };

  const spokes = kind === 'helm' ? 8 : 4;
  const capW = small ? 104 : 132;
  return (
    <Animated.View
      testID={testID}
      style={[styles.wheel, placed]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min: a11yMin, max: a11yMax, now: Math.round(a11yNow), text: valueText }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onA11y}
    >
      <GestureDetector gesture={pan}>
        <View style={styles.fill} collapsable={false}>
          <Svg width="100%" height="100%" viewBox="-112 -112 224 224">
            <G rotation={rotation}>
              <Circle r={84} fill="none" stroke={RIM} strokeWidth={kind === 'helm' ? 14 : 20} />
              {Array.from({ length: spokes }, (_, i) => (
                <G key={i} rotation={(i * 360) / spokes}>
                  <Line x1={0} y1={0} x2={0} y2={-84} stroke={SPOKE} strokeWidth={kind === 'helm' ? 6 : 9} strokeLinecap="round" />
                  {kind === 'helm' ? <Circle cx={0} cy={-100} r={7} fill={SPOKE} /> : null}
                </G>
              ))}
              {Array.from({ length: 36 }, (_, i) => (
                <Line key={`t${i}`} x1={0} y1={-74} x2={0} y2={i % 9 === 0 ? -64 : -69} rotation={i * 10} stroke={colors.textMuted} strokeWidth={1.5} />
              ))}
              <Circle r={kind === 'helm' ? 22 : 30} fill={colors.bgCard} stroke={SPOKE} strokeWidth={4} />
              {kind === 'helm' ? <Rect x={-5} y={-96} width={10} height={20} rx={3} fill={colors.accentCyan} /> : null}
            </G>
            {kind === 'sheet' ? (
              <>
                <Defs>
                  <Marker id={`arrow-${testID}`} viewBox="0 0 10 10" refX={5} refY={5} markerWidth={5} markerHeight={5} orient="auto">
                    <Path d="M0 0L10 5L0 10z" fill={colors.accentCyan} />
                  </Marker>
                </Defs>
                <Path d="M -40 -40 A 57 57 0 0 1 40 -40" fill="none" stroke={colors.accentCyan} strokeWidth={3} markerEnd={`url(#arrow-${testID})`} />
              </>
            ) : null}
          </Svg>
        </View>
      </GestureDetector>
      <View pointerEvents="none" style={[styles.caption, { width: capW, left: (d - capW) / 2, top: d + 2 }]}>
        <Text style={styles.capName} numberOfLines={2} maxFontSizeMultiplier={1.3}>{label}</Text>
        <Text style={styles.capValue} maxFontSizeMultiplier={1.3}>{value}</Text>
        {!small && unit ? <Text style={styles.capUnit} maxFontSizeMultiplier={1.3}>{unit}</Text> : null}
      </View>
    </Animated.View>
  );
}

export interface WheelDeckProps {
  /** Current course target of the trainer, screen degrees 0..360. */
  targetHeadingDeg: number;
  /** True wind FROM, screen degrees, to tell a tack from a gybe. */
  windFromDeg: number;
  /** Native sheet values: 1 = sheeted in, 0 = fully eased. */
  mainSheet: number;
  jibSheet: number;
  onCourse: (headingDeg: number) => void;
  setMainSheet: (value: number) => void;
  setJibSheet: (value: number) => void;
  sound: boolean;
  sensitivity: Sensitivity;
  jibSheetSide: 'left' | 'right';
}

function WheelDeckImpl(props: WheelDeckProps) {
  const { targetHeadingDeg, windFromDeg, mainSheet, jibSheet, onCourse, setMainSheet, setJibSheet, sound, sensitivity, jibSheetSide } = props;
  const { tl } = useI18n();
  const reduceMotion = useReduceMotion();
  const [w, setW] = useState(340);
  const [expanded, setExpanded] = useState<'main' | 'jib' | null>(null);
  const [courseAngle, setCourseAngle] = useState(0);
  const [showNote, setShowNote] = useState(false);

  const labels = useMemo(() => ({
    helm: tl({ ru: 'Руль', en: 'Helm', pl: 'Ster', es: 'Timón', fr: 'Barre', de: 'Steuer', it: 'Timone' }),
    mainsheet: tl({ ru: 'Гика-шкот', en: 'Mainsheet', pl: 'Szot grota', es: 'Escota de mayor', fr: 'Écoute de grand-voile', de: 'Großschot', it: 'Scotta della randa' }),
    jibsheet: tl({ ru: 'Стаксель-шкот', en: 'Jib sheet', pl: 'Szot foka', es: 'Escota de foque', fr: 'Écoute de foc', de: 'Fockschot', it: 'Scotta del fiocco' }),
    heading: tl({ ru: 'курс', en: 'heading', pl: 'kurs', es: 'rumbo', fr: 'cap', de: 'Kurs', it: 'rotta' }),
    eased: tl({ ru: 'потравлен', en: 'eased', pl: 'poluzowany', es: 'lascada', fr: 'choquée', de: 'gefiert', it: 'lascata' }),
    hint: tl({
      ru: 'Крути штурвал по кругу. Нажми на шкот, чтобы увеличить его штурвал, или на руль, чтобы вернуть руль в центр.',
      en: 'Turn a wheel in a circle. Tap a sheet to enlarge it, tap the helm to swap back.',
      pl: 'Obracaj koło ruchem okrężnym. Dotknij szotu, aby go powiększyć, dotknij steru, aby wrócić.',
      es: 'Gira la rueda en círculo. Toca una escota para ampliarla y el timón para volver.',
      fr: "Tourne la roue en cercle. Touche une écoute pour l'agrandir, la barre pour revenir.",
      de: 'Dreh das Rad im Kreis. Tippe auf eine Schot zum Vergrößern, auf das Steuer zum Zurückwechseln.',
      it: 'Gira la ruota in cerchio. Tocca una scotta per ingrandirla, il timone per tornare.',
    }),
  }), [tl]);

  // One line of help for the first three times the wheels open (no modal tour).
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(HINT_KEY)
      .then((v) => {
        const seen = Number(v ?? '0') || 0;
        if (alive && seen < 3) setShowNote(true);
        return AsyncStorage.setItem(HINT_KEY, String(seen + 1));
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);

  const tick = useCallback((kind: TickKind | null) => {
    if (kind && sound) playWheelTick(kind);
  }, [sound]);

  // Touch moves arrive faster than the trainer re-renders, so the deck keeps
  // its own latest values and adopts a prop only when something else (drag
  // steering, the hold buttons, auto trim, a reset) changed it.
  const course = useRef({ headingDeg: normalizeDeg(targetHeadingDeg), acc: 0 });
  const ourHeading = useRef<number | null>(null);
  useEffect(() => {
    const ours = ourHeading.current;
    if (ours === null || Math.abs(angleDelta(ours, targetHeadingDeg)) > 1e-3) {
      course.current.headingDeg = normalizeDeg(targetHeadingDeg);
      ourHeading.current = null;
    }
  }, [targetHeadingDeg]);
  const ease = useRef({ main: sheetToEase(mainSheet), jib: sheetToEase(jibSheet) });
  const ourEase = useRef<{ main?: number; jib?: number }>({});
  useEffect(() => {
    for (const [k, v] of [['main', mainSheet], ['jib', jibSheet]] as const) {
      const ours = ourEase.current[k];
      if (ours === undefined || Math.abs(easeToSheet(ours) - v) > 1e-6) {
        ease.current[k] = sheetToEase(v);
        ourEase.current[k] = undefined;
      }
    }
  }, [mainSheet, jibSheet]);

  const collapse = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (collapse.current) clearTimeout(collapse.current); }, []);
  const armCollapse = useCallback(() => {
    if (collapse.current) clearTimeout(collapse.current);
    collapse.current = setTimeout(() => setExpanded(null), COLLAPSE_MS);
  }, []);

  const turnHelm = useCallback((wheelDeg: number) => {
    const next = turnHelmCourse(course.current, wheelDeg, sensitivity, windFromDeg);
    course.current = { headingDeg: next.headingDeg, acc: next.acc };
    ourHeading.current = next.headingDeg;
    setCourseAngle((a) => a + wheelDeg);
    onCourse(next.headingDeg);
    tick(next.tick);
  }, [sensitivity, windFromDeg, onCourse, tick]);

  const stepHelm = useCallback((steps: number) => turnHelm(helmStepWheelDeg(steps, sensitivity)), [turnHelm, sensitivity]);

  const setSheet = useCallback((which: 'main' | 'jib', next: number) => {
    ease.current[which] = next;
    ourEase.current[which] = next;
    (which === 'main' ? setMainSheet : setJibSheet)(easeToSheet(next));
  }, [setMainSheet, setJibSheet]);

  const turnSheet = useCallback((which: 'main' | 'jib', wheelDeg: number) => {
    armCollapse();
    const r = turnSheetEase(ease.current[which], wheelDeg, sensitivity);
    if (r.ease === ease.current[which]) return;
    setSheet(which, r.ease);
    tick(r.tick);
  }, [armCollapse, sensitivity, setSheet, tick]);

  const stepSheet = useCallback((which: 'main' | 'jib', steps: number) => {
    const r = stepSheetEase(ease.current[which], steps);
    if (r.ease === ease.current[which]) return;
    setSheet(which, r.ease);
    tick(r.tick);
  }, [setSheet, tick]);

  const pos = deckLayout(w, DECK_H, jibSheetSide, expanded);
  const onLayout = (e: LayoutChangeEvent) => {
    const nw = Math.round(e.nativeEvent.layout.width);
    if (nw > 0 && nw !== w) setW(nw);
  };

  const sheetWheel = (which: 'main' | 'jib') => {
    const e = sheetToEase(which === 'main' ? mainSheet : jibSheet);
    const name = which === 'main' ? labels.mainsheet : labels.jibsheet;
    const pct = `${Math.round(e * 100)}%`;
    return (
      <Wheel
        key={which}
        kind="sheet"
        testID={`wheel-${which}`}
        box={pos[which]}
        small={expanded !== which}
        rotation={sheetRotation(e)}
        label={name}
        value={pct}
        valueText={`${pct}, ${labels.eased}`}
        a11yNow={e * 100}
        a11yMin={0}
        a11yMax={100}
        reduceMotion={reduceMotion}
        onActivate={() => { if (expanded !== which) setExpanded(which); armCollapse(); }}
        onTurn={(dd) => turnSheet(which, dd)}
        onStep={(n) => stepSheet(which, n)}
      />
    );
  };

  const headingShown = `${Math.round(normalizeDeg(targetHeadingDeg)) % 360}°`;
  return (
    <View style={styles.deck}>
      {showNote ? <Text variant="caption" style={styles.note}>{labels.hint}</Text> : null}
      <View testID="wheel-deck" style={styles.area} onLayout={onLayout}>
        {sheetWheel(jibSheetSide === 'left' ? 'jib' : 'main')}
        <Wheel
          kind="helm"
          testID="wheel-helm"
          box={pos.helm}
          small={Boolean(expanded)}
          rotation={courseAngle}
          label={labels.helm}
          value={headingShown}
          unit={labels.heading}
          valueText={`${headingShown} ${labels.heading}`}
          a11yNow={Math.round(normalizeDeg(targetHeadingDeg)) % 360}
          a11yMin={0}
          a11yMax={359}
          reduceMotion={reduceMotion}
          onActivate={() => { if (expanded) setExpanded(null); }}
          onTurn={turnHelm}
          onStep={stepHelm}
        />
        {sheetWheel(jibSheetSide === 'left' ? 'main' : 'jib')}
      </View>
    </View>
  );
}

export const WheelDeck = memo(WheelDeckImpl);

const styles = StyleSheet.create({
  deck: { gap: 4 },
  note: { textAlign: 'center', color: colors.textMuted, fontSize: 12, lineHeight: 16 },
  area: { height: DECK_H, position: 'relative' },
  wheel: { position: 'absolute' },
  fill: { flex: 1 },
  caption: { position: 'absolute', alignItems: 'center' },
  capName: { color: colors.textPrimary, fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 16 },
  capValue: { color: colors.accentCyan, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'], lineHeight: 16 },
  capUnit: { color: colors.textMuted, fontSize: 11, lineHeight: 14 },
});
