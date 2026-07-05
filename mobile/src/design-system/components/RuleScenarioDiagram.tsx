import { StyleSheet, View } from 'react-native';
import type { ReactNode } from 'react';
import Svg, {
  Circle,
  G as SvgG,
  Line,
  Path,
  Polygon,
  Text as SvgText,
} from 'react-native-svg';
import { useI18n } from '../../i18n/context';
import type { RuleScenario } from '../../data/types';
import { radii, spacing } from '../tokens';
import type { ThemeColors } from '../tokens';
import { useColors, useThemedStyles } from '../theme';
import { Text } from './Text';

interface RuleScenarioDiagramProps {
  scenario: RuleScenario;
  caption?: string;
}

export function RuleScenarioDiagram({
  scenario,
  caption,
}: RuleScenarioDiagramProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.frame}>
      <Svg viewBox="0 0 200 140" width="100%" height={184}>
        <Circle cx={100} cy={70} r={66} fill="#0d2847" opacity={0.95} />
        <ScenarioSvg id={scenario.svg} />
      </Svg>
      {caption ? (
        <Text variant="muted" style={styles.caption}>{caption}</Text>
      ) : null}
    </View>
  );
}

function ScenarioSvg({ id }: { id: RuleScenario['svg'] }) {
  switch (id) {
    case 'port-vs-starboard':
      return <PortVsStarboard />;
    case 'windward-leeward':
      return <WindwardLeeward />;
    case 'overtaking':
      return <Overtaking />;
    case 'mark-room':
      return <MarkRoom />;
    case 'crossing':
      return <Crossing />;
    case 'start-line':
      return <StartLine />;
    case 'collision-avoid':
      return <CollisionAvoid />;
    case 'penalty':
      return <Penalty />;
    default:
      return null;
  }
}

function Boat({
  x,
  y,
  rot = 0,
  color,
  label,
}: {
  x: number;
  y: number;
  rot?: number;
  color?: string;
  label?: string;
}) {
  const c = useColors();
  const boatColor = color ?? c.sailColor;
  return (
    <G transform={`translate(${x} ${y}) rotate(${rot})`}>
      <Path
        d="M0,-12 L5,7 L0,10 L-5,7 Z"
        fill={boatColor}
        stroke="#ffffff"
        strokeWidth={0.8}
        opacity={0.95}
      />
      <Path d="M0,-8 L7,1 L0,3 Z" fill="#ffffff" opacity={0.65} />
      {label ? (
        <SvgText
          x={0}
          y={22}
          textAnchor="middle"
          fontSize={8}
          fontWeight="700"
          fill={boatColor}
        >
          {label}
        </SvgText>
      ) : null}
    </G>
  );
}

function G(props: {
  children: ReactNode;
  transform?: string;
  opacity?: number;
}) {
  return <SvgG {...props} />;
}

function WindArrow({ x, y, length = 36 }: { x: number; y: number; length?: number }) {
  const { tp } = useI18n();
  const c = useColors();
  return (
    <G>
      <Line
        x1={x}
        y1={y}
        x2={x}
        y2={y + length}
        stroke={c.windColor}
        strokeWidth={1.6}
      />
      <Polygon
        points={`${x - 4},${y + length - 7} ${x + 4},${y + length - 7} ${x},${y + length}`}
        fill={c.windColor}
      />
      <SvgText
        x={x}
        y={y - 5}
        textAnchor="middle"
        fontSize={9}
        fontWeight="700"
        fill={c.windColor}
      >
        {tp('ветер', 'wind', 'wiatr', {
          es: 'viento',
          fr: 'vent',
          de: 'Wind',
          it: 'vento',
        })}
      </SvgText>
    </G>
  );
}

function PortVsStarboard() {
  const { tp } = useI18n();
  const c = useColors();
  return (
    <G>
      <WindArrow x={100} y={10} length={28} />
      <Boat
        x={140}
        y={86}
        rot={-45}
        color={c.success}
        label={tp('правый', 'stbd', 'prawy', {
          es: 'est',
          fr: 'tri',
          de: 'stb',
          it: 'dr',
        })}
      />
      <Boat
        x={60}
        y={86}
        rot={45}
        color={c.danger}
        label={tp('левый', 'port', 'lewy', {
          es: 'bab',
          fr: 'bab',
          de: 'bb',
          it: 'sin',
        })}
      />
      <Path d="M76 78 Q100 58 124 78" fill="none" stroke={c.warning} strokeWidth={1.4} strokeDasharray="4 3" />
      <SvgText x={100} y={124} textAnchor="middle" fontSize={9} fill={c.textSecondary}>
        {tp('левый уступает', 'port gives way', 'lewy ustepuje', {
          es: 'babor cede',
          fr: 'babord cede',
          de: 'Backbord weicht',
          it: 'sinistra cede',
        })}
      </SvgText>
    </G>
  );
}

function WindwardLeeward() {
  const { tp } = useI18n();
  const c = useColors();
  return (
    <G>
      <WindArrow x={100} y={10} length={24} />
      <Boat
        x={130}
        y={55}
        rot={-70}
        color={c.danger}
        label={tp('наветр.', 'windward', 'naw.', {
          es: 'barlov.',
          fr: 'au vent',
          de: 'Luv',
          it: 'soprav.',
        })}
      />
      <Boat
        x={70}
        y={95}
        rot={-70}
        color={c.success}
        label={tp('подветр.', 'leeward', 'zaw.', {
          es: 'sotav.',
          fr: 'sous le vent',
          de: 'Lee',
          it: 'sottov.',
        })}
      />
      <Line x1={95} y1={74} x2={55} y2={91} stroke={c.textMuted} strokeWidth={0.8} strokeDasharray="3 3" />
      <SvgText x={100} y={124} textAnchor="middle" fontSize={9} fill={c.textSecondary}>
        {tp('подветренная имеет право', 'leeward has right', 'zawietrzny ma prawo', {
          es: 'sotavento tiene preferencia',
          fr: 'sous le vent a priorite',
          de: 'Lee hat Vorrang',
          it: 'sottovento ha precedenza',
        })}
      </SvgText>
    </G>
  );
}

function Overtaking() {
  const { tp } = useI18n();
  const c = useColors();
  return (
    <G>
      <WindArrow x={32} y={12} length={20} />
      <Boat
        x={120}
        y={50}
        rot={0}
        color={c.success}
        label={tp('впереди', 'ahead', 'przod', {
          es: 'delante',
          fr: 'devant',
          de: 'voraus',
          it: 'davanti',
        })}
      />
      <Boat
        x={100}
        y={100}
        rot={0}
        color={c.danger}
        label={tp('сзади', 'astern', 'tyl', {
          es: 'detras',
          fr: 'arriere',
          de: 'achtern',
          it: 'dietro',
        })}
      />
      <Path d="M104 92 L112 72 L118 60" fill="none" stroke={c.warning} strokeWidth={1.5} strokeDasharray="4 3" />
      <SvgText x={100} y={128} textAnchor="middle" fontSize={9} fill={c.textSecondary}>
        {tp('обгоняющий уступает', 'overtaker keeps clear', 'wyprzedzajacy ustepuje', {
          es: 'el que adelanta cede',
          fr: 'le poursuivant degage',
          de: 'Ueberholer haelt frei',
          it: 'chi sorpassa cede',
        })}
      </SvgText>
    </G>
  );
}

function MarkRoom() {
  const { tp } = useI18n();
  const c = useColors();
  return (
    <G>
      <Circle cx={100} cy={50} r={8} fill={c.warning} stroke="#ffffff" strokeWidth={1.4} />
      <Circle cx={100} cy={50} r={35} fill="none" stroke={c.warning} strokeWidth={0.9} strokeDasharray="3 3" opacity={0.7} />
      <Boat
        x={80}
        y={90}
        rot={-45}
        color={c.success}
        label={tp('внутр.', 'inside', 'wewn.', {
          es: 'interior',
          fr: 'interieur',
          de: 'innen',
          it: 'interno',
        })}
      />
      <Boat
        x={50}
        y={100}
        rot={-45}
        color={c.danger}
        label={tp('внеш.', 'outside', 'zewn.', {
          es: 'exterior',
          fr: 'exterieur',
          de: 'aussen',
          it: 'esterno',
        })}
      />
      <Path d="M72 82 Q98 54 132 67" fill="none" stroke={c.success} strokeWidth={1.4} />
      <SvgText x={100} y={128} textAnchor="middle" fontSize={9} fill={c.textSecondary}>
        {tp('место у знака', 'room at the mark', 'miejsce przy znaku', {
          es: 'espacio en la baliza',
          fr: 'place a la marque',
          de: 'Raum an der Marke',
          it: 'spazio alla boa',
        })}
      </SvgText>
    </G>
  );
}

function Crossing() {
  const { tp } = useI18n();
  const c = useColors();
  return (
    <G>
      <WindArrow x={100} y={10} length={22} />
      <Boat
        x={45}
        y={92}
        rot={45}
        color={c.success}
        label={tp('я', 'me', 'ja', {
          es: 'yo',
          fr: 'moi',
          de: 'ich',
          it: 'io',
        })}
      />
      <Boat
        x={155}
        y={92}
        rot={-45}
        color={c.danger}
        label={tp('он', 'opp', 'rywal', {
          es: 'rival',
          fr: 'adv',
          de: 'Gegner',
          it: 'avv',
        })}
      />
      <Line x1={57} y1={84} x2={143} y2={84} stroke={c.textMuted} strokeWidth={0.8} strokeDasharray="3 3" />
      <SvgText x={100} y={66} textAnchor="middle" fontSize={16} fontWeight="800" fill={c.warning}>?</SvgText>
      <SvgText x={100} y={128} textAnchor="middle" fontSize={9} fill={c.textSecondary}>
        {tp('избегай контакта', 'avoid contact', 'unikaj kontaktu', {
          es: 'evita el contacto',
          fr: 'evitez le contact',
          de: 'Kontakt vermeiden',
          it: 'evita il contatto',
        })}
      </SvgText>
    </G>
  );
}

function StartLine() {
  const { tp } = useI18n();
  const c = useColors();
  return (
    <G>
      <WindArrow x={100} y={8} length={20} />
      <Line x1={22} y1={62} x2={178} y2={62} stroke={c.warning} strokeWidth={2.2} strokeDasharray="5 3" />
      <Circle cx={22} cy={62} r={5} fill={c.warning} />
      <Circle cx={178} cy={62} r={5} fill={c.warning} />
      <Boat x={55} y={102} rot={-28} color={c.success} />
      <Boat x={88} y={106} rot={24} color={c.sailColor} />
      <Boat x={122} y={102} rot={-15} color={c.warning} />
      <Boat x={155} y={106} rot={22} color={c.accentCyan} />
      <SvgText x={100} y={51} textAnchor="middle" fontSize={9} fontWeight="800" fill={c.warning}>
        {tp('СТАРТ', 'START', 'START', {
          es: 'SALIDA',
          fr: 'DEPART',
          de: 'START',
          it: 'PARTENZA',
        })}
      </SvgText>
      <SvgText x={100} y={128} textAnchor="middle" fontSize={9} fill={c.textSecondary}>
        {tp('разгон и чистый ветер', 'speed and clear air', 'predkosc i czysty wiatr', {
          es: 'velocidad y aire limpio',
          fr: 'vitesse et air clair',
          de: 'Tempo und freier Wind',
          it: 'velocita e aria pulita',
        })}
      </SvgText>
    </G>
  );
}

function CollisionAvoid() {
  const { tp } = useI18n();
  const c = useColors();
  return (
    <G>
      <Boat x={70} y={72} rot={45} color={c.danger} />
      <Boat x={130} y={72} rot={-45} color={c.danger} />
      <Circle cx={100} cy={70} r={12} fill="rgba(255, 68, 68, 0.18)" stroke={c.danger} strokeWidth={1.2} />
      <SvgText x={100} y={74} textAnchor="middle" fontSize={13} fontWeight="800" fill={c.danger}>!</SvgText>
      <SvgText x={100} y={118} textAnchor="middle" fontSize={9} fill={c.warning}>
        {tp('безопасность важнее правоты', 'safety beats being right', 'bezpieczenstwo ponad racja', {
          es: 'la seguridad supera la razon',
          fr: 'la securite prime sur le droit',
          de: 'Sicherheit vor Recht',
          it: 'sicurezza prima della ragione',
        })}
      </SvgText>
    </G>
  );
}

function Penalty() {
  const { tp } = useI18n();
  const c = useColors();
  return (
    <G>
      <WindArrow x={32} y={12} length={20} />
      <Path d="M100 30 A30 30 0 1 1 100 90 A30 30 0 1 1 100 30" fill="none" stroke={c.warning} strokeWidth={1.5} strokeDasharray="4 3" />
      <Boat x={100} y={30} rot={0} color={c.danger} label="1" />
      <Boat x={130} y={60} rot={90} color={c.sailColor} label="2" />
      <Boat x={100} y={90} rot={180} color={c.sailColor} label="3" />
      <Boat x={70} y={60} rot={-90} color={c.success} label="4" />
      <SvgText x={100} y={128} textAnchor="middle" fontSize={9} fill={c.textSecondary}>
        {tp('штрафной оборот', 'penalty turn', 'obrot karny', {
          es: 'giro de penalizacion',
          fr: 'tour de penalite',
          de: 'Strafdrehung',
          it: 'giro di penalita',
        })}
      </SvgText>
    </G>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    frame: {
      backgroundColor: 'rgba(11, 30, 56, 0.55)',
      borderColor: c.borderCyanFaint,
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
