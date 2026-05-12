import { StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import Svg, {
  Circle,
  Defs,
  G as SvgG,
  Line,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useI18n } from '../../i18n/context';
import { colors, radii, spacing } from '../tokens';
import { Text } from './Text';

interface LessonDiagramProps {
  lessonId: string;
  caption?: string;
}

export function LessonDiagram({ lessonId, caption }: LessonDiagramProps) {
  const body = renderForLesson(lessonId);
  if (!body) return null;
  return (
    <View style={styles.frame}>
      <Svg viewBox="0 0 200 140" width="100%" height={170}>
        <Rect x={0} y={0} width={200} height={140} fill={colors.bgCard} />
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

function WindDirectionDiagram() {
  const { tp } = useI18n();
  const cx = 100;
  const cy = 70;
  return (
    <G>
      <Circle cx={cx} cy={cy} r={52} fill="none" stroke={colors.borderCyanSoft} strokeWidth={1} />
      <Circle cx={cx} cy={cy} r={42} fill="none" stroke={colors.borderCyanFaint} strokeWidth={0.8} strokeDasharray="2 3" />

      <SvgText x={cx} y={14} textAnchor="middle" fontSize={9} fontWeight="700" fill={colors.textSecondary}>N</SvgText>
      <SvgText x={cx + 56} y={cy + 3} textAnchor="middle" fontSize={9} fontWeight="700" fill={colors.textSecondary}>E</SvgText>
      <SvgText x={cx} y={cy + 60} textAnchor="middle" fontSize={9} fontWeight="700" fill={colors.textSecondary}>S</SvgText>
      <SvgText x={cx - 56} y={cy + 3} textAnchor="middle" fontSize={9} fontWeight="700" fill={colors.textSecondary}>W</SvgText>

      <Line x1={cx} y1={cy - 50} x2={cx} y2={cy - 14} stroke={colors.windColor} strokeWidth={2.2} />
      <Polygon
        points={`${cx - 5},${cy - 18} ${cx + 5},${cy - 18} ${cx},${cy - 10}`}
        fill={colors.windColor}
      />
      <SvgText x={cx + 8} y={cy - 36} textAnchor="start" fontSize={9} fontWeight="800" fill={colors.windColor}>TWD</SvgText>

      <Boat x={cx} y={cy + 8} rot={155} color={colors.accentCyan} scale={1.2} />

      <Path
        d={`M ${cx - 22} ${cy + 26} A 24 24 0 0 1 ${cx + 22} ${cy + 26}`}
        fill="none"
        stroke={colors.warning}
        strokeWidth={1.2}
        strokeDasharray="3 3"
        opacity={0.85}
      />
      <SvgText x={cx} y={cy + 40} textAnchor="middle" fontSize={8} fontWeight="700" fill={colors.warning}>TWA</SvgText>

      <SvgText x={cx} y={132} textAnchor="middle" fontSize={9} fill={colors.textSecondary}>
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
  const sectors: Array<{ a0: number; a1: number; fill: string; label: string }> = [
    { a0: -45, a1: 45, fill: 'rgba(255, 68, 68, 0.22)', label: 'no-go' },
    { a0: 45, a1: 70, fill: 'rgba(0, 212, 255, 0.18)', label: 'beat' },
    { a0: 70, a1: 110, fill: 'rgba(68, 255, 136, 0.18)', label: 'reach' },
    { a0: 110, a1: 160, fill: 'rgba(0, 212, 255, 0.18)', label: 'broad' },
    { a0: 160, a1: 200, fill: 'rgba(255, 170, 0, 0.20)', label: 'run' },
    { a0: 200, a1: 250, fill: 'rgba(0, 212, 255, 0.18)', label: 'broad' },
    { a0: 250, a1: 290, fill: 'rgba(68, 255, 136, 0.18)', label: 'reach' },
    { a0: 290, a1: 315, fill: 'rgba(0, 212, 255, 0.18)', label: 'beat' },
  ];

  return (
    <G>
      {sectors.map((s, i) => (
        <Path key={i} d={sectorPath(cx, cy, r, s.a0, s.a1)} fill={s.fill} stroke={colors.borderCyanFaint} strokeWidth={0.6} />
      ))}
      <Circle cx={cx} cy={cy} r={r} fill="none" stroke={colors.borderCyanSoft} strokeWidth={0.8} />

      <Line x1={cx} y1={cy - r - 8} x2={cx} y2={cy - r + 4} stroke={colors.windColor} strokeWidth={1.8} />
      <Polygon
        points={`${cx - 4},${cy - r + 1} ${cx + 4},${cy - r + 1} ${cx},${cy - r + 6}`}
        fill={colors.windColor}
      />

      <Boat x={cx} y={cy} rot={70} color={colors.accentCyan} scale={1.1} />

      <SvgText x={cx} y={cy - r + 16} textAnchor="middle" fontSize={7} fontWeight="800" fill={colors.danger}>NO-GO</SvgText>
      <SvgText x={cx + 32} y={cy - 16} textAnchor="middle" fontSize={7} fontWeight="700" fill={colors.success}>REACH</SvgText>
      <SvgText x={cx} y={cy + r - 4} textAnchor="middle" fontSize={7} fontWeight="700" fill={colors.warning}>RUN</SvgText>
      <SvgText x={cx - 32} y={cy - 16} textAnchor="middle" fontSize={7} fontWeight="700" fill={colors.success}>REACH</SvgText>

      <SvgText x={cx} y={132} textAnchor="middle" fontSize={9} fill={colors.textSecondary}>
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
          <Stop offset="0" stopColor={colors.accentCyan} stopOpacity={0.55} />
          <Stop offset="1" stopColor={colors.sailColor} stopOpacity={0.22} />
        </LinearGradient>
      </Defs>

      <Path d="M 50 90 Q 105 35 165 70" fill="none" stroke="url(#sailGrad)" strokeWidth={6} />
      <Path d="M 50 90 Q 105 35 165 70" fill="none" stroke={colors.sailColor} strokeWidth={1.2} opacity={0.8} />

      <Path d="M 30 30 Q 80 28 130 36" fill="none" stroke={colors.windColor} strokeWidth={1.2} opacity={0.7} strokeDasharray="3 3" />
      <Path d="M 30 50 Q 80 48 130 56" fill="none" stroke={colors.windColor} strokeWidth={1.2} opacity={0.7} strokeDasharray="3 3" />
      <Path d="M 30 110 Q 80 116 130 116" fill="none" stroke={colors.windColor} strokeWidth={1.2} opacity={0.55} strokeDasharray="3 3" />

      <Polygon points="125,30 132,33 125,36" fill={colors.windColor} opacity={0.9} />
      <Polygon points="125,50 132,53 125,56" fill={colors.windColor} opacity={0.9} />
      <Polygon points="125,110 132,113 125,116" fill={colors.windColor} opacity={0.7} />

      <Line x1={108} y1={70} x2={108} y2={32} stroke={colors.success} strokeWidth={2.2} />
      <Polygon points={`${108 - 4},${36} ${108 + 4},${36} ${108},${28}`} fill={colors.success} />
      <SvgText x={114} y={48} textAnchor="start" fontSize={9} fontWeight="800" fill={colors.success}>LIFT</SvgText>

      <SvgText x={36} y={22} textAnchor="start" fontSize={9} fontWeight="800" fill={colors.windColor}>AWA</SvgText>
      <SvgText x={170} y={22} textAnchor="end" fontSize={8} fontWeight="700" fill={colors.windColor}>
        {tp('поток', 'flow', 'przeplyw', {
          es: 'flujo',
          fr: 'flux',
          de: 'Stroemung',
          it: 'flusso',
        })}
      </SvgText>

      <SvgText x={100} y={132} textAnchor="middle" fontSize={9} fill={colors.textSecondary}>
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
      <Polygon points="96,18 104,18 100,10" fill={colors.windColor} opacity={0.8} />
      <SvgText x={108} y={16} textAnchor="start" fontSize={8} fontWeight="800" fill={colors.windColor}>
        {tp('ветер', 'wind', 'wiatr', { es: 'viento', fr: 'vent', de: 'Wind', it: 'vento' })}
      </SvgText>

      <Path d="M 50 110 L 86 50 Q 100 30 114 50 L 150 110" fill="none" stroke={colors.success} strokeWidth={2} strokeDasharray="4 3" />

      <Boat x={56} y={102} rot={30} color={colors.accentCyan} scale={1.05} />
      <Boat x={100} y={42} rot={0} color={colors.warning} scale={1.05} />
      <Boat x={144} y={102} rot={-30} color={colors.success} scale={1.05} />

      <SvgText x={56} y={126} textAnchor="middle" fontSize={8} fontWeight="700" fill={colors.textSecondary}>
        {tp('левый', 'port', 'lewy', { es: 'babor', fr: 'babord', de: 'Backbord', it: 'babordo' })}
      </SvgText>
      <SvgText x={100} y={28} textAnchor="middle" fontSize={8} fontWeight="800" fill={colors.warning}>
        {tp('через нос', 'through bow', 'przez dziob', { es: 'por proa', fr: 'par etrave', de: 'durch Bug', it: 'per prua' })}
      </SvgText>
      <SvgText x={144} y={126} textAnchor="middle" fontSize={8} fontWeight="700" fill={colors.textSecondary}>
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
      <Polygon points="96,18 104,18 100,10" fill={colors.windColor} opacity={0.8} />
      <SvgText x={108} y={16} textAnchor="start" fontSize={8} fontWeight="800" fill={colors.windColor}>
        {tp('ветер', 'wind', 'wiatr', { es: 'viento', fr: 'vent', de: 'Wind', it: 'vento' })}
      </SvgText>

      <Path d="M 50 30 L 86 90 Q 100 110 114 90 L 150 30" fill="none" stroke={colors.warning} strokeWidth={2} strokeDasharray="4 3" />

      <Boat x={56} y={38} rot={155} color={colors.accentCyan} scale={1.05} />
      <Boat x={100} y={102} rot={180} color={colors.danger} scale={1.05} />
      <Boat x={144} y={38} rot={205} color={colors.success} scale={1.05} />

      <SvgText x={56} y={22} textAnchor="middle" fontSize={8} fontWeight="700" fill={colors.textSecondary}>
        {tp('бакштаг', 'broad', 'baksztag', { es: 'largo', fr: 'largue', de: 'Raumwind', it: 'lasco' })}
      </SvgText>
      <SvgText x={100} y={120} textAnchor="middle" fontSize={8} fontWeight="800" fill={colors.danger}>
        {tp('гик летит!', 'boom flies!', 'bom leci!', { es: 'boton vuela!', fr: 'bome vole!', de: 'Baum fliegt!', it: 'boma vola!' })}
      </SvgText>
      <SvgText x={144} y={22} textAnchor="middle" fontSize={8} fontWeight="700" fill={colors.textSecondary}>
        {tp('бакштаг', 'broad', 'baksztag', { es: 'largo', fr: 'largue', de: 'Raumwind', it: 'lasco' })}
      </SvgText>
    </G>
  );
}

function VmgBeatingDiagram() {
  const { tp } = useI18n();
  return (
    <G>
      <Line x1={100} y1={4} x2={100} y2={130} stroke={colors.windColor} strokeWidth={1} strokeDasharray="3 4" opacity={0.5} />
      <Polygon points="96,16 104,16 100,8" fill={colors.windColor} opacity={0.85} />
      <SvgText x={108} y={14} textAnchor="start" fontSize={8} fontWeight="800" fill={colors.windColor}>
        {tp('цель', 'goal', 'cel', { es: 'meta', fr: 'but', de: 'Ziel', it: 'meta' })}
      </SvgText>

      <Circle cx={100} cy={20} r={5} fill={colors.warning} stroke={colors.sailColor} strokeWidth={0.8} />

      <Path
        d="M 100 122 L 130 96 L 76 76 L 124 56 L 88 36 L 100 26"
        fill="none"
        stroke={colors.accentCyan}
        strokeWidth={2}
        strokeLinejoin="round"
      />

      <Boat x={130} y={96} rot={-45} color={colors.accentCyan} scale={0.85} />
      <Boat x={76} y={76} rot={45} color={colors.accentCyan} scale={0.85} />
      <Boat x={124} y={56} rot={-45} color={colors.accentCyan} scale={0.85} />

      <Line x1={104} y1={88} x2={104} y2={32} stroke={colors.success} strokeWidth={2} strokeDasharray="2 2" opacity={0.85} />
      <Polygon points="100,38 108,38 104,28" fill={colors.success} />
      <SvgText x={112} y={62} textAnchor="start" fontSize={9} fontWeight="800" fill={colors.success}>VMG</SvgText>

      <SvgText x={100} y={134} textAnchor="middle" fontSize={9} fill={colors.textSecondary}>
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
      <SvgText x={108} y={16} textAnchor="start" fontSize={8} fontWeight="800" fill={colors.windColor}>
        {tp('ветер', 'wind', 'wiatr', { es: 'viento', fr: 'vent', de: 'Wind', it: 'vento' })}
      </SvgText>

      <Boat x={150} y={80} rot={-50} color={colors.success} scale={1.25} />
      <Boat x={50} y={80} rot={50} color={colors.danger} scale={1.25} />

      <Path d="M 62 76 Q 100 60 138 76" fill="none" stroke={colors.warning} strokeWidth={1.3} strokeDasharray="4 3" />

      <SvgText x={150} y={108} textAnchor="middle" fontSize={8} fontWeight="800" fill={colors.success}>
        {tp('правый', 'starboard', 'prawy', { es: 'estribor', fr: 'tribord', de: 'Stb.', it: 'tribordo' })}
      </SvgText>
      <SvgText x={50} y={108} textAnchor="middle" fontSize={8} fontWeight="800" fill={colors.danger}>
        {tp('левый - уступает', 'port - gives way', 'lewy - ustepuje', {
          es: 'babor - cede',
          fr: 'babord - cede',
          de: 'BB - weicht',
          it: 'babordo - cede',
        })}
      </SvgText>

      <SvgText x={100} y={132} textAnchor="middle" fontSize={9} fill={colors.textSecondary}>
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
  return (
    <G>
      <Line x1={100} y1={4} x2={100} y2={28} stroke={colors.windColor} strokeWidth={1.2} />
      <Polygon points="96,22 104,22 100,30" fill={colors.windColor} />

      <Line x1={50} y1={108} x2={150} y2={108} stroke={colors.warning} strokeWidth={2} strokeDasharray="5 3" />
      <Circle cx={50} cy={108} r={4} fill={colors.warning} stroke={colors.sailColor} strokeWidth={0.6} />
      <Circle cx={150} cy={108} r={4} fill={colors.warning} stroke={colors.sailColor} strokeWidth={0.6} />
      <SvgText x={100} y={104} textAnchor="middle" fontSize={8} fontWeight="800" fill={colors.warning}>START</SvgText>

      <Circle cx={100} cy={36} r={6} fill={colors.warning} stroke={colors.sailColor} strokeWidth={0.8} />
      <SvgText x={100} y={28} textAnchor="middle" fontSize={8} fontWeight="800" fill={colors.warning}>
        {tp('верхний знак', 'windward mark', 'znak gorny', {
          es: 'boya barlovento',
          fr: 'bouee au vent',
          de: 'Luvtonne',
          it: 'boa sopravvento',
        })}
      </SvgText>

      <Path
        d="M 90 102 L 110 102 L 84 78 L 116 78 L 92 50 L 100 42"
        fill="none"
        stroke={colors.accentCyan}
        strokeWidth={1.6}
        strokeDasharray="3 3"
        strokeLinejoin="round"
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
      <SvgText x={132} y={132} textAnchor="end" fontSize={8} fontWeight="800" fill={colors.success}>FINISH</SvgText>
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
