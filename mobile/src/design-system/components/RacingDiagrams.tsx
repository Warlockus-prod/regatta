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
        <Buoy
          cx={180}
          cy={76}
          label={tp('верхний', 'windward', 'gorny', {
            es: 'barlovento',
            fr: 'au vent',
            de: 'Luv',
            it: 'sopravento',
          })}
        />
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

interface ConceptDiagramProps {
  conceptId: string;
}

/**
 * Small native SVG diagrams for the "Key Concepts" cards: layline, VMG,
 * clear air, wind shadow. Mirrors the web `/racing` SVG sub-components so
 * the concept text is backed by the same race geometry on both clients.
 */
export function RacingConceptDiagram({ conceptId }: ConceptDiagramProps) {
  return (
    <View style={styles.conceptFrame}>
      <Svg viewBox="0 0 220 132" width="100%" height={132}>
        <Rect x={0} y={0} width={220} height={132} rx={10} fill="#0d2847" />
        <ConceptSvg id={conceptId} />
      </Svg>
    </View>
  );
}

function ConceptSvg({ id }: { id: string }) {
  switch (id) {
    case 'layline':
      return <Layline />;
    case 'vmg':
      return <Vmg />;
    case 'clear-air':
      return <ClearAir />;
    case 'wind-shadow':
      return <WindShadow />;
    default:
      return <Layline />;
  }
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
        {tp('лавировка к знаку', 'tack toward the mark', 'halsuj do znaku', {
          es: 'voltejea hacia la baliza',
          fr: 'tirez des bords vers la marque',
          de: 'kreuze zur Marke',
          it: 'bordeggia verso la boa',
        })}
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
        {tp('VMG лучше зигзагом', 'better VMG by angles', 'lepsze VMG katami', {
          es: 'mejor VMG en angulos',
          fr: 'meilleur VMG en zig-zag',
          de: 'besseres VMG ueber Winkel',
          it: 'miglior VMG con angoli',
        })}
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
        {tp('СТАРТ', 'START', 'START', {
          es: 'SALIDA',
          fr: 'DEPART',
          de: 'START',
          it: 'PARTENZA',
        })}
      </SvgText>
      <SvgText x={110} y={132} textAnchor="middle" fill={colors.textSecondary} fontSize={9}>
        {tp('чистый ветер и скорость', 'clear air and speed', 'czysty wiatr i predkosc', {
          es: 'aire limpio y velocidad',
          fr: 'air clair et vitesse',
          de: 'freier Wind und Speed',
          it: 'aria pulita e velocita',
        })}
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
        {tp('широкий вход, узкий выход', 'wide in, tight out', 'szeroko wejsc, ciasno wyjsc', {
          es: 'entrada amplia, salida ajustada',
          fr: 'entree large, sortie serree',
          de: 'weit hinein, eng heraus',
          it: 'entrata larga, uscita stretta',
        })}
      </SvgText>
    </G>
  );
}

function Layline() {
  return (
    <G>
      {/* Mark */}
      <Circle cx={110} cy={26} r={6} fill={colors.warning} stroke="#ffffff" strokeWidth={1.2} />
      {/* Left + right laylines */}
      <Line x1={110} y1={26} x2={36} y2={116} stroke={colors.danger} strokeWidth={1.6} strokeDasharray="5 4" />
      <Line x1={110} y1={26} x2={184} y2={116} stroke={colors.danger} strokeWidth={1.6} strokeDasharray="5 4" />
      {/* Boat on layline */}
      <Boat x={74} y={74} rot={-40} color={colors.accentCyan} />
      <SvgText x={22} y={110} fill={colors.danger} fontSize={9} fontWeight="700">Layline</SvgText>
      <SvgText x={158} y={110} fill={colors.danger} fontSize={9} fontWeight="700">Layline</SvgText>
    </G>
  );
}

function Vmg() {
  return (
    <G>
      {/* Wind from top */}
      <WindArrow x={110} y={10} length={22} />
      {/* Target axis toward leeward mark */}
      <Line x1={110} y1={36} x2={110} y2={120} stroke={colors.textSecondary} strokeWidth={0.8} strokeDasharray="3 3" opacity={0.4} />
      {/* Boat speed vector (diagonal) */}
      <Line x1={110} y1={58} x2={172} y2={112} stroke={colors.accentCyan} strokeWidth={2} />
      <SvgText x={150} y={88} fill={colors.accentCyan} fontSize={9} fontWeight="700">V boat</SvgText>
      {/* VMG component (vertical projection) */}
      <Line x1={110} y1={58} x2={110} y2={112} stroke={colors.success} strokeWidth={2.6} />
      <SvgText x={60} y={92} fill={colors.success} fontSize={9} fontWeight="800">VMG</SvgText>
      {/* Projection */}
      <Line x1={110} y1={112} x2={172} y2={112} stroke={colors.textSecondary} strokeWidth={0.8} strokeDasharray="3 3" opacity={0.45} />
    </G>
  );
}

function ClearAir() {
  const { tp } = useI18n();
  return (
    <G>
      {/* Wind arrows from top */}
      <Line x1={50} y1={10} x2={50} y2={26} stroke={colors.windColor} strokeWidth={1.2} opacity={0.55} />
      <Polygon points="46,21 54,21 50,27" fill={colors.windColor} opacity={0.55} />
      <Line x1={95} y1={10} x2={95} y2={26} stroke={colors.windColor} strokeWidth={1.2} opacity={0.55} />
      <Polygon points="91,21 99,21 95,27" fill={colors.windColor} opacity={0.55} />
      <Line x1={140} y1={10} x2={140} y2={26} stroke={colors.windColor} strokeWidth={1.2} opacity={0.55} />
      <Polygon points="136,21 144,21 140,27" fill={colors.windColor} opacity={0.55} />
      {/* Wind shadow cone behind leading boat */}
      <Path d="M86 56 L66 124 L130 124 Z" fill={colors.danger} opacity={0.1} />
      <Path d="M86 56 L66 124" stroke={colors.danger} strokeWidth={0.8} strokeDasharray="3 3" opacity={0.35} />
      <Path d="M86 56 L130 124" stroke={colors.danger} strokeWidth={0.8} strokeDasharray="3 3" opacity={0.35} />
      {/* Leading boat in clean air */}
      <Boat x={86} y={52} rot={-30} color={colors.success} />
      <SvgText x={100} y={50} fill={colors.success} fontSize={9} fontWeight="700">
        {tp('чистый ветер', 'clean air', 'czysty wiatr', {
          es: 'aire limpio',
          fr: 'air libre',
          de: 'freier Wind',
          it: 'aria libera',
        })}
      </SvgText>
      {/* Trailing boat in shadow */}
      <Boat x={106} y={102} rot={-30} color={colors.danger} />
      <SvgText x={98} y={122} textAnchor="middle" fill={colors.danger} fontSize={8} opacity={0.85}>
        {tp('тень', 'shadow', 'cien', {
          es: 'sombra',
          fr: 'ombre',
          de: 'Schatten',
          it: 'ombra',
        })}
      </SvgText>
    </G>
  );
}

function WindShadow() {
  const { tp } = useI18n();
  return (
    <G>
      {/* Clean wind arrows from top */}
      {[40, 75, 110, 145, 180].map((x) => (
        <G key={x}>
          <Line x1={x} y1={8} x2={x} y2={22} stroke={colors.windColor} strokeWidth={1} opacity={0.45} />
          <Polygon points={`${x - 3.5},${17} ${x + 3.5},${17} ${x},${23}`} fill={colors.windColor} opacity={0.45} />
        </G>
      ))}
      {/* Boat creating the shadow */}
      <Boat x={110} y={50} rot={-18} color={colors.sailColor} />
      {/* Shadow zone */}
      <Path d="M110 56 L62 126 L158 126 Z" fill={colors.textMuted} opacity={0.16} />
      <Path d="M110 56 L62 126" stroke={colors.textMuted} strokeWidth={0.8} strokeDasharray="3 3" opacity={0.45} />
      <Path d="M110 56 L158 126" stroke={colors.textMuted} strokeWidth={0.8} strokeDasharray="3 3" opacity={0.45} />
      {/* Disturbed wind inside shadow */}
      {[92, 110, 128].map((x) => (
        <Line key={x} x1={x} y1={82} x2={x} y2={92} stroke={colors.textMuted} strokeWidth={0.8} strokeDasharray="1 3" opacity={0.5} />
      ))}
      <SvgText x={110} y={120} textAnchor="middle" fill={colors.textMuted} fontSize={9} fontWeight="700">
        {tp('ветровая тень', 'wind shadow', 'cien wiatru', {
          es: 'sombra de viento',
          fr: 'ombre de vent',
          de: 'Windschatten',
          it: 'ombra di vento',
        })}
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
  conceptFrame: {
    marginTop: spacing.md,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderColor: colors.borderCyanFaint,
    borderWidth: 1,
    backgroundColor: '#0d2847',
  },
});
