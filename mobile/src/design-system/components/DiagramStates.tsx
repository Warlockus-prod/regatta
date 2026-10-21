import { StyleSheet, Pressable, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Text } from './Text';
import { bySurface, useSurface } from '../surface';
import { radii } from '../tokens';

export interface DiagramState {
  /** Button name: what this state shows. */
  label: string;
  /** What changes in this state and why. */
  note: string;
  /** Spoken description of the drawing in this state. */
  description: string;
}

interface DiagramStatesProps {
  /** SVG of the drawing in a state (numbers and strokes only, no words). */
  svg: (state: number) => string;
  /** Width / height of the drawing. */
  aspectRatio: number;
  title?: string;
  states: DiagramState[];
  /** Accessible name of the state buttons. */
  stateGroup: string;
  selected: number;
  onSelect: (state: number) => void;
  /** Explains the numbers in the drawing, in order. */
  legend: string[];
  /** Legend row i belongs to state i (it is highlighted with it). */
  legendFollowsState?: boolean;
  limit: string;
  labels: { legend: string; limit: string };
}

/**
 * One drawing with a few explanatory states: the drawing, the state buttons
 * named by meaning, what the selected state shows, the numbered key and what
 * the drawing leaves out. One drawing at a time, never a strip of all states.
 * All words live here (localized), not in the SVG.
 */
export function DiagramStates({
  svg,
  aspectRatio,
  title,
  states,
  stateGroup,
  selected,
  onSelect,
  legend,
  legendFollowsState = false,
  limit,
  labels,
}: DiagramStatesProps) {
  const s = styles[useSurface()];
  const current = states[selected] ?? states[0]!;
  return (
    <View style={s.wrap}>
      {title ? <Text variant="subtitle" accessibilityRole="header">{title}</Text> : null}
      <View testID="diagram-image" accessible accessibilityRole="image" accessibilityLabel={current.description} style={[s.drawing, { aspectRatio }]}>
        <SvgXml xml={svg(selected)} width="100%" height="100%" />
      </View>
      <View style={s.states} accessibilityLabel={stateGroup}>
        {states.map((state, i) => {
          const on = i === selected;
          return (
            <Pressable
              key={i}
              testID={`diagram-state-${i}`}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => onSelect(i)}
              style={({ pressed }) => [s.chip, on && s.chipOn, pressed && !on && s.chipPressed]}
            >
              <Text style={[s.chipText, on && s.chipTextOn]}>{state.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={s.note} accessibilityLiveRegion="polite">{current.note}</Text>
      <View style={s.legend}>
        <Text variant="eyebrow">{labels.legend}</Text>
        {legend.map((item, i) => {
          const on = legendFollowsState && i === selected;
          return (
            <View key={i} style={s.legendRow}>
              <View style={[s.legendDot, legendFollowsState && !on && s.legendDotMuted]}>
                <Text style={[s.legendNumber, legendFollowsState && !on && s.legendNumberMuted]} maxFontSizeMultiplier={1.3}>{i + 1}</Text>
              </View>
              <Text style={[s.legendText, on && s.legendTextOn]}>{item}</Text>
            </View>
          );
        })}
      </View>
      <View style={s.legend}>
        <Text variant="eyebrow">{labels.limit}</Text>
        <Text style={s.limit}>{limit}</Text>
      </View>
    </View>
  );
}

const styles = bySurface((c) => StyleSheet.create({
  wrap: { gap: 12 },
  drawing: { width: '100%', borderRadius: radii.card, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: c.borderCyanFaint },
  states: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(18, 50, 71, 0.28)',
    backgroundColor: c.bgCard,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: c.textPrimary, borderColor: c.textPrimary },
  chipPressed: { backgroundColor: c.bgCardHover },
  chipText: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: c.textPrimary },
  chipTextOn: { color: c.bgCard },
  note: { fontSize: 16, lineHeight: 24, color: c.textPrimary },
  legend: { gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot: { minWidth: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: c.accentCyan, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bgCard },
  legendDotMuted: { borderColor: c.textMuted },
  legendNumber: { fontSize: 13, lineHeight: 16, fontWeight: '700', color: c.accentCyan },
  legendNumberMuted: { color: c.textMuted },
  legendText: { flex: 1, fontSize: 15, lineHeight: 22, color: c.textSecondary },
  legendTextOn: { color: c.textPrimary, fontWeight: '600' },
  limit: { fontSize: 14, lineHeight: 20, color: c.textSecondary },
}));
