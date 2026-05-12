import { StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import Svg, {
  Circle,
  G as SvgG,
  Line,
  Path,
  Polygon,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import { useI18n } from '../../i18n/context';
import { colors, radii, spacing } from '../tokens';
import { Text } from './Text';

interface StrategyDiagramProps {
  strategyId: string;
}

export function RacingCourseDiagram() {
  const { tp } = useI18n();
  return (
    <View style={styles.courseFrame}>
      <Text style={styles.courseTitle}>
        {tp('Дистанция windward-leeward', 'Windward-leeward course', 'Trasa windward-leeward', {
          es: 'Recorrido windward-leeward',
          fr: 'Parcours windward-leeward',
          de: 'Windward-leeward Kurs',
          it: 'Percorso windward-leeward',
        })}
      </Text>
      <Svg viewBox="0 0 360 360" width="100%" height={320}>
        <Rect x={0} y={0} width={360} height={360} rx={14} fill="#0d2847" />
        <WindArrow x={180} y={20} length={42} />
        <Line x1={180} y1={76} x2={180} y2={308} stroke="rgba(232,244,248,0.20)" strokeWidth={1} strokeDasharray="6 6" />
        <Buoy cx={180} cy={76} label={tp('верхний', 'windward', 'gorny')} />
        <Buoy cx={132} cy={308} label="L" />
        <Buoy cx={228} cy={308} label="R" />
        <Line x1={132} y1={308} x2={228} y2={308} stroke={colors.warning} strokeWidth={1.4} strokeDasharray="5 4" opacity={0.7} />
        <Path d="M170 300 L120 248 L232 190 L132 135 L198 94 L180 80" fill="none" stroke={colors.accentCyan} strokeWidth={2} strokeDasharray="7 5" />
        <Path d="M186 80 L252 142 L140 216 L240 272 L194 306" fill="none" stroke={colors.success} strokeWidth={2} strokeDasharray="7 5" />
        <Boat x={174} y={268} rot={-34} color={colors.accentCyan} />
        <Boat x={180} y={185} rot={36} color={colors.accentCyan} />
        <Boat x={220} y={145} rot={146} color={colors.success} />
        <Boat x={186} y={248} rot={210} color={colors.success} />
        <SvgText x={56} y={170} fill={colors.accentCyan} fontSize={10} fontWeight="800" transform="rotate(-90 56 170)">UPWIND</SvgText>
        <SvgText x={304} y={220} fill={colors.success} fontSize={10} fontWeight="800" transform="rotate(90 304 220)">DOWNWIND</SvgText>
      </Svg>
    </View>
  );
}

export function RacingStrategyDiagram({ strategyId }: StrategyDiagramProps) {
  return (
    <View style={styles.strategyFrame}>
      <Svg viewBox="0 0 220 138" width="100%" height={138}>
        <Rect x={0} y={0} width={220} height={138} rx={10} fill="#0d2847" />
        <StrategySvg id={strategyId} />
      </Svg>
    </View>
  );
}

function StrategySvg({ id }: { id: string }) {
  switch (id) {
    case 'upwind':
      return <Upwind />;
    case 'downwind':
      return <Downwind />;
    case 'start':
      return <Start />;
    case 'mark-rounding':
      return <MarkRounding />;
    default:
      return <Upwind />;
  }
}

function G(props: {
  children: ReactNode;
  transform?: string;
  opacity?: number;
}) {
  return <SvgG {...props} />;
}

function WindArrow({ x, y, length = 28 }: { x: number; y: number; length?: number }) {
  const { tp } = useI18n();
  return (
    <G>
      <Line x1={x} y1={y} x2={x} y2={y + length} stroke={colors.windColor} strokeWidth={1.6} />
      <Polygon points={`${x - 4},${y + length - 7} ${x + 4},${y + length - 7} ${x},${y + length}`} fill={colors.windColor} />
      <SvgText x={x} y={y - 5} textAnchor="middle" fontSize={9} fontWeight="800" fill={colors.windColor}>
        {tp('ВЕТЕР', 'WIND', 'WIATR', {
          es: 'VIENTO',
          fr: 'VENT',
          de: 'WIND',
          it: 'VENTO',
        })}
      </SvgText>
    </G>
  );
}

function Buoy({ cx, cy, label }: { cx: number; cy: number; label: string }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={8} fill={colors.warning} stroke="#ffffff" strokeWidth={1.2} />
      <SvgText x={cx + 13} y={cy + 4} fill={colors.warning} fontSize={10} fontWeight="800">{label}</SvgText>
    </G>
  );
}

function Boat({ x, y, rot, color }: { x: number; y: number; rot: number; color: string }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${rot})`}>
      <Path d="M0,-10 L5,8 L0,11 L-5,8 Z" fill={color} stroke="#ffffff" strokeWidth={0.8} />
      <Path d="M0,-7 L8,1 L0,3 Z" fill="#ffffff" opacity={0.62} />
    </G>
  );
}

function Upwind() {
  const { tp } = useI18n();
  return (
    <G>
      <WindArrow x={110} y={12} />
      <Circle cx={110} cy={40} r={5} fill={colors.warning} stroke="#ffffff" strokeWidth={1} />
      <Path d="M110 122 L70 94 L150 66 L88 42 L110 40" fill="none" stroke={colors.accentCyan} strokeWidth={2} strokeDasharray="5 4" />
      <Boat x={110} y={106} rot={-38} color={colors.accentCyan} />
      <Boat x={112} y={72} rot={40} color={colors.accentCyan} />
      <SvgText x={58} y={112} fill={colors.textSecondary} fontSize={8}>45 deg</SvgText>
      <SvgText x={110} y={132} textAnchor="middle" fill={colors.textSecondary} fontSize={9}>
        {tp('лавировка к знаку', 'tack toward the mark', 'halsuj do znaku')}
      </SvgText>
    </G>
  );
}

function Downwind() {
  const { tp } = useI18n();
  return (
    <G>
      <WindArrow x={110} y={12} />
      <Line x1={110} y1={38} x2={110} y2={120} stroke={colors.danger} strokeWidth={1.2} strokeDasharray="4 4" opacity={0.65} />
      <Path d="M110 38 L158 66 L62 98 L110 120" fill="none" stroke={colors.success} strokeWidth={2} strokeDasharray="5 4" />
      <Boat x={135} y={55} rot={150} color={colors.success} />
      <Boat x={86} y={86} rot={210} color={colors.success} />
      <SvgText x={121} y={82} fill={colors.danger} fontSize={8}>dead run</SvgText>
      <SvgText x={110} y={132} textAnchor="middle" fill={colors.textSecondary} fontSize={9}>
        {tp('VMG лучше зигзагом', 'better VMG by angles', 'lepsze VMG katami')}
      </SvgText>
    </G>
  );
}

function Start() {
  const { tp } = useI18n();
  return (
    <G>
      <WindArrow x={110} y={10} length={22} />
      <Line x1={30} y1={82} x2={190} y2={82} stroke={colors.warning} strokeWidth={2.2} />
      <Circle cx={30} cy={82} r={5} fill={colors.warning} />
      <Circle cx={190} cy={82} r={5} fill={colors.warning} />
      <Boat x={60} y={108} rot={-24} color={colors.success} />
      <Boat x={96} y={110} rot={18} color={colors.sailColor} />
      <Boat x={132} y={106} rot={-16} color={colors.warning} />
      <Boat x={166} y={110} rot={20} color={colors.accentCyan} />
      <SvgText x={110} y={73} textAnchor="middle" fill={colors.warning} fontSize={9} fontWeight="800">
        {tp('СТАРТ', 'START', 'START')}
      </SvgText>
      <SvgText x={110} y={132} textAnchor="middle" fill={colors.textSecondary} fontSize={9}>
        {tp('чистый ветер и скорость', 'clear air and speed', 'czysty wiatr i predkosc')}
      </SvgText>
    </G>
  );
}

function MarkRounding() {
  const { tp } = useI18n();
  return (
    <G>
      <Circle cx={110} cy={62} r={9} fill={colors.warning} stroke="#ffffff" strokeWidth={1.2} />
      <Circle cx={110} cy={62} r={36} fill="none" stroke={colors.warning} strokeWidth={1} strokeDasharray="4 4" opacity={0.7} />
      <Path d="M55 116 Q94 98 104 72 Q112 44 148 36" fill="none" stroke={colors.success} strokeWidth={2.2} />
      <Path d="M62 118 Q102 116 130 86 Q150 62 172 54" fill="none" stroke={colors.danger} strokeWidth={1.5} strokeDasharray="5 4" />
      <Boat x={76} y={106} rot={-45} color={colors.success} />
      <Boat x={134} y={82} rot={-10} color={colors.success} />
      <SvgText x={110} y={132} textAnchor="middle" fill={colors.textSecondary} fontSize={9}>
        {tp('широкий вход, узкий выход', 'wide in, tight out', 'szeroko wejsc, ciasno wyjsc')}
      </SvgText>
    </G>
  );
}

const styles = StyleSheet.create({
  courseFrame: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(21, 37, 64, 0.70)',
    borderColor: colors.borderCyanFaint,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  courseTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  strategyFrame: {
    marginTop: spacing.md,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderColor: colors.borderCyanFaint,
    borderWidth: 1,
    backgroundColor: '#0d2847',
  },
});
