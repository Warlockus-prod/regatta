import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import Svg, {
  Circle,
  Defs,
  G as SvgG,
  Line,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useI18n } from '../../i18n/context';
import { colors, radii, spacing } from '../tokens';
import { Text } from './Text';

const AnimatedG = Animated.createAnimatedComponent(SvgG);

interface LessonDiagramProps {
  lessonId: string;
  caption?: string;
}

/**
 * Standardised viewBox for every lesson diagram. 200 x 140 keeps the
 * 1.43 aspect ratio used in Sprint 5 so the screen layout (a 170 px
 * tall preview frame) does not need to change. Per-diagram tweaks live
 * inside this canvas only.
 */
const VIEWBOX_W = 200;
const VIEWBOX_H = 140;

export function LessonDiagram({ lessonId, caption }: LessonDiagramProps) {
  const body = renderForLesson(lessonId);
  if (!body) return null;
  return (
    <View style={styles.frame}>
      <Svg viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`} width="100%" height={170}>
        <Defs>
          <RadialGradient
            id="diagBg"
            cx="50%"
            cy="50%"
            r="65%"
            fx="50%"
            fy="40%"
          >
            <Stop offset="0" stopColor={colors.accentCyan} stopOpacity={0.10} />
            <Stop offset="0.7" stopColor={colors.bgCard} stopOpacity={0.85} />
            <Stop offset="1" stopColor={colors.bgPrimary} stopOpacity={1} />
          </RadialGradient>
        </Defs>
        <Rect
          x={0}
          y={0}
          width={VIEWBOX_W}
          height={VIEWBOX_H}
          fill="url(#diagBg)"
        />
        {body}
      </Svg>
      {caption ? (
        <Text variant="muted" style={styles.caption}>{caption}</Text>
      ) : null}
    </View>
  );
}

function renderForLesson(id: string): ReactNode | null {
  switch (id) {
    case 'wind-direction':
      return <WindDirectionDiagram />;
    case 'points-of-sail':
      return <PointsOfSailMiniDiagram />;
    case 'how-sail-works':
      return <SailLiftDiagram />;
    case 'tacking':
      return <TackingDiagram />;
    case 'jibing':
      return <JibingDiagram />;
    case 'vmg-beating':
      return <VmgBeatingDiagram />;
    case 'simple-rules':
      return <SimpleRulesDiagram />;
    case 'mini-race':
      return <MiniRaceDiagram />;
    default:
      return null;
  }
}

/**
 * 1500 ms opacity pulse used on rotating / "active" elements (compass
 * arrows, wind direction). Returns an Animated.Value oscillating
 * between 1.0 and `min` and back. Not animated when `min === 1`.
 */
function usePulse(min: number = 0.55): Animated.Value {
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (min >= 1) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: min,
          duration: 750,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(v, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, min]);
  return v;
}

function G(props: { children: ReactNode; transform?: string; opacity?: number }) {
  return <SvgG {...props} />;
}

function Boat({
  x,
  y,
  rot = 0,
  color = colors.sailColor,
  scale = 1,
}: {
  x: number;
  y: number;
  rot?: number;
  color?: string;
  scale?: number;
}) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      {/* Soft halo under the hull for depth. */}
      <Path
        d="M0,-10 L4,6 L0,9 L-4,6 Z"
        fill="none"
        stroke={colors.accentCyan}
        strokeOpacity={0.25}
        strokeWidth={2.4}
      />
      <Path
        d="M0,-10 L4,6 L0,9 L-4,6 Z"
        fill={color}
        stroke="#ffffff"
        strokeWidth={0.7}
        opacity={0.95}
      />
      <Line x1={0} y1={-7} x2={0} y2={4} stroke="#ffffff" strokeWidth={0.7} />
    </G>
  );
}

/**
 * Subtle drop-shadow approximation: render the same path with a wider
 * stroke at low opacity *underneath* the primary stroke. Cheap, works
 * everywhere react-native-svg renders, and reads as "depth" without
 * needing platform-specific filter elements.
 */
function ShadowedLine({
  d,
  stroke,
  strokeWidth,
  shadowColor = 'rgba(0, 0, 0, 0.45)',
  dashArray,
  opacity,
}: {
  d: string;
  stroke: string;
  strokeWidth: number;
  shadowColor?: string;
  dashArray?: string;
  opacity?: number;
}) {
  return (
    <>
      <Path
        d={d}
        fill="none"
        stroke={shadowColor}
        strokeWidth={strokeWidth + 1.4}
        strokeOpacity={0.55}
        strokeDasharray={dashArray}
      />
      <Path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        opacity={opacity}
      />
    </>
  );
}

function WindDirectionDiagram() {
  const { tp } = useI18n();
  const cx = 100;
  const cy = 70;
  const pulse = usePulse(0.55);
  return (
    <G>
      <Defs>
        <LinearGradient id="windArrowGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.windColor} stopOpacity={0.9} />
          <Stop offset="1" stopColor={colors.accentCyanDim} stopOpacity={0.7} />
        </LinearGradient>
      </Defs>

      <Circle cx={cx} cy={cy} r={52} fill="none" stroke={colors.borderCyanSoft} strokeWidth={1} />
      <Circle cx={cx} cy={cy} r={42} fill="none" stroke={colors.borderCyanFaint} strokeWidth={0.8} strokeDasharray="2 3" />

      <SvgText x={cx} y={14} textAnchor="middle" fontSize={8} fontWeight="700" fill={colors.textSecondary}>N</SvgText>
      <SvgText x={cx + 56} y={cy + 3} textAnchor="middle" fontSize={8} fontWeight="700" fill={colors.textSecondary}>E</SvgText>
      <SvgText x={cx} y={cy + 60} textAnchor="middle" fontSize={8} fontWeight="700" fill={colors.textSecondary}>S</SvgText>
      <SvgText x={cx - 56} y={cy + 3} textAnchor="middle" fontSize={8} fontWeight="700" fill={colors.textSecondary}>W</SvgText>

      <AnimatedG opacity={pulse}>
        <Line
          x1={cx}
          y1={cy - 50}
          x2={cx}
          y2={cy - 14}
          stroke="url(#windArrowGrad)"
          strokeWidth={2.4}
        />
        <Polygon
          points={`${cx - 5},${cy - 18} ${cx + 5},${cy - 18} ${cx},${cy - 10}`}
          fill={colors.windColor}
        />
      </AnimatedG>
      <SvgText x={cx + 8} y={cy - 36} textAnchor="start" fontSize={8} fontWeight="800" fill={colors.windColor}>TWD</SvgText>

      <Boat x={cx} y={cy + 8} rot={155} color={colors.accentCyan} scale={1.2} />

      <Path
        d={`M ${cx - 22} ${cy + 26} A 24 24 0 0 1 ${cx + 22} ${cy + 26}`}
        fill="none"
        stroke={colors.warning}
        strokeWidth={1.2}
        strokeDasharray="3 3"
        opacity={0.85}
      />
      <SvgText x={cx} y={cy + 40} textAnchor="middle" fontSize={7} fontWeight="700" fill={colors.warning}>TWA</SvgText>

      <SvgText x={cx} y={132} textAnchor="middle" fontSize={8} fill={colors.textSecondary}>
        {tp('ветер сверху, TWA - угол к ветру', 'wind from top, TWA = angle to wind', 'wiatr z gory, TWA - kat do wiatru', {
          es: 'viento desde arriba, TWA = angulo al viento',
          fr: 'vent du haut, TWA = angle au vent',
          de: 'Wind von oben, TWA = Winkel zum Wind',
          it: 'vento dall alto, TWA = angolo al vento',
        })}
      </SvgText>
    </G>
  );
}

function PointsOfSailMiniDiagram() {
  const { tp } = useI18n();
  const cx = 100;
  const cy = 72;
  const r = 50;
  const pulse = usePulse(0.6);
  const sectors: Array<{ a0: number; a1: number; fill: string; label: string }> = useMemo(
    () => [
      { a0: -45, a1: 45, fill: 'url(#noGoGrad)', label: 'no-go' },
      { a0: 45, a1: 70, fill: 'rgba(0, 212, 255, 0.18)', label: 'beat' },
      { a0: 70, a1: 110, fill: 'url(#reachGrad)', label: 'reach' },
      { a0: 110, a1: 160, fill: 'rgba(0, 212, 255, 0.18)', label: 'broad' },
      { a0: 160, a1: 200, fill: 'rgba(255, 170, 0, 0.20)', label: 'run' },
      { a0: 200, a1: 250, fill: 'rgba(0, 212, 255, 0.18)', label: 'broad' },
      { a0: 250, a1: 290, fill: 'url(#reachGrad)', label: 'reach' },
      { a0: 290, a1: 315, fill: 'rgba(0, 212, 255, 0.18)', label: 'beat' },
    ],
    [],
  );

  return (
    <G>
      <Defs>
        <RadialGradient id="noGoGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={colors.danger} stopOpacity={0.32} />
          <Stop offset="1" stopColor={colors.danger} stopOpacity={0.10} />
        </RadialGradient>
        <RadialGradient id="reachGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={colors.success} stopOpacity={0.28} />
          <Stop offset="1" stopColor={colors.success} stopOpacity={0.10} />
        </RadialGradient>
      </Defs>

      {sectors.map((s, i) => (
        <Path
          key={i}
          d={sectorPath(cx, cy, r, s.a0, s.a1)}
          fill={s.fill}
          stroke={colors.borderCyanFaint}
          strokeWidth={0.6}
        />
      ))}
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={colors.borderCyanSoft} strokeWidth={0.8} />

      <AnimatedG opacity={pulse}>
        <Line x1={cx} y1={cy - r - 8} x2={cx} y2={cy - r + 4} stroke={colors.windColor} strokeWidth={1.8} />
        <Polygon
          points={`${cx - 4},${cy - r + 1} ${cx + 4},${cy - r + 1} ${cx},${cy - r + 6}`}
          fill={colors.windColor}
        />
      </AnimatedG>

      <Boat x={cx} y={cy} rot={70} color={colors.accentCyan} scale={1.1} />

      <SvgText x={cx} y={cy - r + 16} textAnchor="middle" fontSize={6} fontWeight="800" fill={colors.danger}>NO-GO</SvgText>
      <SvgText x={cx + 32} y={cy - 16} textAnchor="middle" fontSize={6} fontWeight="700" fill={colors.success}>REACH</SvgText>
      <SvgText x={cx} y={cy + r - 4} textAnchor="middle" fontSize={6} fontWeight="700" fill={colors.warning}>RUN</SvgText>
      <SvgText x={cx - 32} y={cy - 16} textAnchor="middle" fontSize={6} fontWeight="700" fill={colors.success}>REACH</SvgText>

      <SvgText x={cx} y={132} textAnchor="middle" fontSize={8} fill={colors.textSecondary}>
        {tp('5 курсов вокруг ветра', '5 points of sail around the wind', '5 kursow wokol wiatru', {
          es: '5 rumbos alrededor del viento',
          fr: '5 allures autour du vent',
          de: '5 Kurse um den Wind',
          it: '5 andature intorno al vento',
        })}
      </SvgText>
    </G>
  );
}

function SailLiftDiagram() {
  const { tp } = useI18n();
  return (
    <G>
      <Defs>
        <LinearGradient id="sailGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={colors.accentCyan} stopOpacity={0.85} />
          <Stop offset="1" stopColor={colors.bgPrimary} stopOpacity={0.20} />
        </LinearGradient>
        <LinearGradient id="liftGrad" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={colors.success} stopOpacity={0.45} />
          <Stop offset="1" stopColor={colors.success} stopOpacity={1} />
        </LinearGradient>
      </Defs>

      {/* Sail body with shadow under for depth. */}
      <Path d="M 50 90 Q 105 35 165 70" fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={7} opacity={0.6} />
      <Path d="M 50 90 Q 105 35 165 70" fill="none" stroke="url(#sailGrad)" strokeWidth={6} />
      <Path d="M 50 90 Q 105 35 165 70" fill="none" stroke={colors.sailColor} strokeWidth={1} opacity={0.85} />

      {/* Flow lines, dashed cyan. */}
      <Path d="M 30 30 Q 80 28 130 36" fill="none" stroke={colors.windColor} strokeWidth={1.1} opacity={0.7} strokeDasharray="3 3" />
      <Path d="M 30 50 Q 80 48 130 56" fill="none" stroke={colors.windColor} strokeWidth={1.1} opacity={0.7} strokeDasharray="3 3" />
      <Path d="M 30 110 Q 80 116 130 116" fill="none" stroke={colors.windColor} strokeWidth={1.1} opacity={0.55} strokeDasharray="3 3" />

      <Polygon points="125,30 132,33 125,36" fill={colors.windColor} opacity={0.9} />
      <Polygon points="125,50 132,53 125,56" fill={colors.windColor} opacity={0.9} />
      <Polygon points="125,110 132,113 125,116" fill={colors.windColor} opacity={0.7} />

      {/* Lift arrow with gradient + shadow underline. */}
      <Line x1={108} y1={70} x2={108} y2={32} stroke="rgba(0,0,0,0.4)" strokeWidth={3.5} />
      <Line x1={108} y1={70} x2={108} y2={32} stroke="url(#liftGrad)" strokeWidth={2.4} />
      <Polygon points={`${108 - 4},${36} ${108 + 4},${36} ${108},${28}`} fill={colors.success} />
      <SvgText x={114} y={48} textAnchor="start" fontSize={8} fontWeight="800" fill={colors.success}>LIFT</SvgText>

      <SvgText x={36} y={22} textAnchor="start" fontSize={8} fontWeight="800" fill={colors.windColor}>AWA</SvgText>
      <SvgText x={170} y={22} textAnchor="end" fontSize={7} fontWeight="700" fill={colors.windColor}>
        {tp('поток', 'flow', 'przeplyw', {
          es: 'flujo',
          fr: 'flux',
          de: 'Stroemung',
          it: 'flusso',
        })}
      </SvgText>

      <SvgText x={100} y={132} textAnchor="middle" fontSize={8} fill={colors.textSecondary}>
        {tp('парус как крыло, ветер создает подъемную силу', 'sail as a wing, wind creates lift', 'zagiel jak skrzydlo, wiatr tworzy sile nosna', {
          es: 'vela como ala, el viento crea sustentacion',
          fr: 'voile comme une aile, le vent cree la portance',
          de: 'Segel als Fluegel, Wind erzeugt Auftrieb',
          it: 'vela come ala, vento crea portanza',
        })}
      </SvgText>
    </G>
  );
}

function TackingDiagram() {
  const { tp } = useI18n();
  return (
    <G>
      <Line x1={100} y1={6} x2={100} y2={120} stroke={colors.windColor} strokeWidth={1} strokeDasharray="3 4" opacity={0.6} />
      <Polygon points="96,18 104,18 100,10" fill={colors.windColor} opacity={0.85} />
      <SvgText x={108} y={16} textAnchor="start" fontSize={7} fontWeight="800" fill={colors.windColor}>
        {tp('ветер', 'wind', 'wiatr', { es: 'viento', fr: 'vent', de: 'Wind', it: 'vento' })}
      </SvgText>

      <ShadowedLine
        d="M 50 110 L 86 50 Q 100 30 114 50 L 150 110"
        stroke={colors.success}
        strokeWidth={2}
        dashArray="4 3"
      />

      <Boat x={56} y={102} rot={30} color={colors.accentCyan} scale={1.05} />
      <Boat x={100} y={42} rot={0} color={colors.warning} scale={1.05} />
      <Boat x={144} y={102} rot={-30} color={colors.success} scale={1.05} />

      <SvgText x={56} y={126} textAnchor="middle" fontSize={7} fontWeight="700" fill={colors.textSecondary}>
        {tp('левый', 'port', 'lewy', { es: 'babor', fr: 'babord', de: 'Backbord', it: 'babordo' })}
      </SvgText>
      <SvgText x={100} y={28} textAnchor="middle" fontSize={7} fontWeight="800" fill={colors.warning}>
        {tp('через нос', 'through bow', 'przez dziob', { es: 'por proa', fr: 'par etrave', de: 'durch Bug', it: 'per prua' })}
      </SvgText>
      <SvgText x={144} y={126} textAnchor="middle" fontSize={7} fontWeight="700" fill={colors.textSecondary}>
        {tp('правый', 'stbd', 'prawy', { es: 'estribor', fr: 'tribord', de: 'Stb.', it: 'tribordo' })}
      </SvgText>
    </G>
  );
}

function JibingDiagram() {
  const { tp } = useI18n();
  return (
    <G>
      <Line x1={100} y1={6} x2={100} y2={120} stroke={colors.windColor} strokeWidth={1} strokeDasharray="3 4" opacity={0.6} />
      <Polygon points="96,18 104,18 100,10" fill={colors.windColor} opacity={0.85} />
      <SvgText x={108} y={16} textAnchor="start" fontSize={7} fontWeight="800" fill={colors.windColor}>
        {tp('ветер', 'wind', 'wiatr', { es: 'viento', fr: 'vent', de: 'Wind', it: 'vento' })}
      </SvgText>

      <ShadowedLine
        d="M 50 30 L 86 90 Q 100 110 114 90 L 150 30"
        stroke={colors.warning}
        strokeWidth={2}
        dashArray="4 3"
      />

      <Boat x={56} y={38} rot={155} color={colors.accentCyan} scale={1.05} />
      <Boat x={100} y={102} rot={180} color={colors.danger} scale={1.05} />
      <Boat x={144} y={38} rot={205} color={colors.success} scale={1.05} />

      <SvgText x={56} y={22} textAnchor="middle" fontSize={7} fontWeight="700" fill={colors.textSecondary}>
        {tp('бакштаг', 'broad', 'baksztag', { es: 'largo', fr: 'largue', de: 'Raumwind', it: 'lasco' })}
      </SvgText>
      <SvgText x={100} y={120} textAnchor="middle" fontSize={7} fontWeight="800" fill={colors.danger}>
        {tp('гик летит!', 'boom flies!', 'bom leci!', { es: 'boton vuela!', fr: 'bome vole!', de: 'Baum fliegt!', it: 'boma vola!' })}
      </SvgText>
      <SvgText x={144} y={22} textAnchor="middle" fontSize={7} fontWeight="700" fill={colors.textSecondary}>
        {tp('бакштаг', 'broad', 'baksztag', { es: 'largo', fr: 'largue', de: 'Raumwind', it: 'lasco' })}
      </SvgText>
    </G>
  );
}

function VmgBeatingDiagram() {
  const { tp } = useI18n();
  const pulse = usePulse(0.65);
  return (
    <G>
      <Defs>
        <LinearGradient id="vmgArrowGrad" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={colors.success} stopOpacity={0.4} />
          <Stop offset="1" stopColor={colors.success} stopOpacity={1} />
        </LinearGradient>
      </Defs>

      <Line x1={100} y1={4} x2={100} y2={130} stroke={colors.windColor} strokeWidth={1} strokeDasharray="3 4" opacity={0.5} />
      <Polygon points="96,16 104,16 100,8" fill={colors.windColor} opacity={0.85} />
      <SvgText x={108} y={14} textAnchor="start" fontSize={7} fontWeight="800" fill={colors.windColor}>
        {tp('цель', 'goal', 'cel', { es: 'meta', fr: 'but', de: 'Ziel', it: 'meta' })}
      </SvgText>

      <Circle cx={100} cy={20} r={5} fill={colors.warning} stroke={colors.sailColor} strokeWidth={0.8} />

      <ShadowedLine
        d="M 100 122 L 130 96 L 76 76 L 124 56 L 88 36 L 100 26"
        stroke={colors.accentCyan}
        strokeWidth={2}
      />

      <Boat x={130} y={96} rot={-45} color={colors.accentCyan} scale={0.85} />
      <Boat x={76} y={76} rot={45} color={colors.accentCyan} scale={0.85} />
      <Boat x={124} y={56} rot={-45} color={colors.accentCyan} scale={0.85} />

      <AnimatedG opacity={pulse}>
        <Line x1={104} y1={88} x2={104} y2={32} stroke="rgba(0,0,0,0.4)" strokeWidth={3.4} />
        <Line x1={104} y1={88} x2={104} y2={32} stroke="url(#vmgArrowGrad)" strokeWidth={2.2} strokeDasharray="2 2" />
        <Polygon points="100,38 108,38 104,28" fill={colors.success} />
      </AnimatedG>
      <SvgText x={112} y={62} textAnchor="start" fontSize={8} fontWeight="800" fill={colors.success}>VMG</SvgText>

      <SvgText x={100} y={134} textAnchor="middle" fontSize={8} fill={colors.textSecondary}>
        {tp('галсами под 45°, VMG = выигрыш к цели', 'tacks at 45°, VMG = gain toward goal', 'halsy pod 45°, VMG = zysk do celu', {
          es: 'bordadas a 45°, VMG = ganancia al objetivo',
          fr: 'bordees a 45°, VMG = gain vers la cible',
          de: 'Schlaege unter 45°, VMG = Gewinn zum Ziel',
          it: 'bordi a 45°, VMG = guadagno verso meta',
        })}
      </SvgText>
    </G>
  );
}

function SimpleRulesDiagram() {
  const { tp } = useI18n();
  return (
    <G>
      <Line x1={100} y1={6} x2={100} y2={28} stroke={colors.windColor} strokeWidth={1.4} />
      <Polygon points="96,22 104,22 100,30" fill={colors.windColor} />
      <SvgText x={108} y={16} textAnchor="start" fontSize={7} fontWeight="800" fill={colors.windColor}>
        {tp('ветер', 'wind', 'wiatr', { es: 'viento', fr: 'vent', de: 'Wind', it: 'vento' })}
      </SvgText>

      <Boat x={150} y={80} rot={-50} color={colors.success} scale={1.25} />
      <Boat x={50} y={80} rot={50} color={colors.danger} scale={1.25} />

      <ShadowedLine
        d="M 62 76 Q 100 60 138 76"
        stroke={colors.warning}
        strokeWidth={1.3}
        dashArray="4 3"
      />

      <SvgText x={150} y={108} textAnchor="middle" fontSize={7} fontWeight="800" fill={colors.success}>
        {tp('правый', 'starboard', 'prawy', { es: 'estribor', fr: 'tribord', de: 'Stb.', it: 'tribordo' })}
      </SvgText>
      <SvgText x={50} y={108} textAnchor="middle" fontSize={7} fontWeight="800" fill={colors.danger}>
        {tp('левый - уступает', 'port - gives way', 'lewy - ustepuje', {
          es: 'babor - cede',
          fr: 'babord - cede',
          de: 'BB - weicht',
          it: 'babordo - cede',
        })}
      </SvgText>

      <SvgText x={100} y={132} textAnchor="middle" fontSize={8} fill={colors.textSecondary}>
        {tp('правый галс имеет приоритет', 'starboard tack has right of way', 'prawy hals ma pierwszenstwo', {
          es: 'estribor tiene preferencia',
          fr: 'tribord a la priorite',
          de: 'Steuerbord hat Vorfahrt',
          it: 'tribordo ha priorita',
        })}
      </SvgText>
    </G>
  );
}

function MiniRaceDiagram() {
  const { tp } = useI18n();
  const pulse = usePulse(0.7);
  return (
    <G>
      <Defs>
        <RadialGradient id="markGrad" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={colors.warning} stopOpacity={1} />
          <Stop offset="1" stopColor={colors.warning} stopOpacity={0.4} />
        </RadialGradient>
      </Defs>

      <Line x1={100} y1={4} x2={100} y2={28} stroke={colors.windColor} strokeWidth={1.2} />
      <Polygon points="96,22 104,22 100,30" fill={colors.windColor} />

      <Line x1={50} y1={108} x2={150} y2={108} stroke={colors.warning} strokeWidth={2} strokeDasharray="5 3" />
      <Circle cx={50} cy={108} r={4} fill={colors.warning} stroke={colors.sailColor} strokeWidth={0.6} />
      <Circle cx={150} cy={108} r={4} fill={colors.warning} stroke={colors.sailColor} strokeWidth={0.6} />
      <SvgText x={100} y={104} textAnchor="middle" fontSize={7} fontWeight="800" fill={colors.warning}>START</SvgText>

      <AnimatedG opacity={pulse}>
        <Circle cx={100} cy={36} r={6} fill="url(#markGrad)" stroke={colors.sailColor} strokeWidth={0.8} />
      </AnimatedG>
      <SvgText x={100} y={28} textAnchor="middle" fontSize={7} fontWeight="800" fill={colors.warning}>
        {tp('верхний знак', 'windward mark', 'znak gorny', {
          es: 'boya barlovento',
          fr: 'bouee au vent',
          de: 'Luvtonne',
          it: 'boa sopravvento',
        })}
      </SvgText>

      <ShadowedLine
        d="M 90 102 L 110 102 L 84 78 L 116 78 L 92 50 L 100 42"
        stroke={colors.accentCyan}
        strokeWidth={1.6}
        dashArray="3 3"
      />

      <Path
        d="M 100 42 L 130 88 L 70 88 Z"
        fill="none"
        stroke={colors.success}
        strokeWidth={1.4}
        strokeDasharray="2 3"
        opacity={0.6}
      />

      <Boat x={90} y={102} rot={-30} color={colors.accentCyan} scale={0.9} />

      <Rect x={138} y={120} width={10} height={6} fill={colors.success} />
      <Rect x={148} y={120} width={10} height={6} fill={colors.sailColor} />
      <SvgText x={132} y={132} textAnchor="end" fontSize={7} fontWeight="800" fill={colors.success}>FINISH</SvgText>
    </G>
  );
}

function sectorPath(cx: number, cy: number, r: number, a0Deg: number, a1Deg: number): string {
  const a0 = ((a0Deg - 90) * Math.PI) / 180;
  const a1 = ((a1Deg - 90) * Math.PI) / 180;
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const large = a1Deg - a0Deg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: 'rgba(11, 30, 56, 0.55)',
    borderColor: colors.borderCyanFaint,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    overflow: 'hidden',
  },
  caption: {
    textAlign: 'center',
    fontSize: 10,
    marginTop: spacing.xs,
  },
});
