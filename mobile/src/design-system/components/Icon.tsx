import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../tokens';

/**
 * Brand icon registry. Each name maps to one of the SVGs hand-drawn by
 * the Designer in `mobile/assets/icons/*.svg` and inlined here as
 * react-native-svg primitives so we don't pull in `react-native-svg-transformer`.
 *
 * Sprint 4 set (5):
 *   - `cap`     graduation cap  (Bootcamp / lesson surfaces)
 *   - `bolt`    lightning bolt  (Quick refresh)
 *   - `book`    open book       (Rules / regulations)
 *   - `compass` compass + N-needle (Courses / navigation)
 *   - `sail`    side-view sloop (anatomy / brand mark)
 *
 * Sprint 6 set (19 more):
 *   Reference: `parts`, `onboard`, `glossary`, `polar`, `tactics`
 *   Tools:     `simulator`, `multiplayer`, `leaderboard`
 *   More:      `gallery`, `gear`
 *   Lessons:   `wind`, `sail-trim`, `tack`, `jibe`, `vmg`, `flag`
 *   States:    `check`, `warning`, `info`
 *
 * Usage:
 *   <Icon name="cap" size={36} color={colors.accentCyan} />
 *
 * Unknown names log a warning and render a neutral fallback glyph
 * (a thin question-mark) instead of crashing - we never want a missing
 * icon to take down a screen.
 */
export type IconName =
  | 'cap'
  | 'bolt'
  | 'book'
  | 'compass'
  | 'sail'
  | 'parts'
  | 'onboard'
  | 'glossary'
  | 'polar'
  | 'tactics'
  | 'simulator'
  | 'multiplayer'
  | 'leaderboard'
  | 'gallery'
  | 'gear'
  | 'wind'
  | 'sail-trim'
  | 'tack'
  | 'jibe'
  | 'vmg'
  | 'flag'
  | 'check'
  | 'warning'
  | 'info'
  | 'menu'
  | 'home';

interface IconProps {
  name: IconName | string;
  /** Square edge length in pt. Default 24. */
  size?: number;
  /** Stroke / fill colour. Default `colors.textPrimary`. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

const STROKE = {
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  fill: 'none',
} as const;

function CapPaths({ color }: { color: string }) {
  return (
    <>
      <Path d="M2 9 L12 4 L22 9 L12 14 Z" stroke={color} {...STROKE} />
      <Path
        d="M6 11 L6 16 C6 17.1 8.7 18.5 12 18.5 C15.3 18.5 18 17.1 18 16 L18 11"
        stroke={color}
        {...STROKE}
      />
      <Path d="M22 9 L22 14" stroke={color} {...STROKE} />
      <Circle cx={22} cy={15.2} r={0.6} fill={color} />
    </>
  );
}

function BoltPaths({ color }: { color: string }) {
  return (
    <Path
      d="M13.5 2 L4.5 13.2 L11 13.2 L10.5 22 L19.5 10.8 L13 10.8 Z"
      stroke={color}
      {...STROKE}
    />
  );
}

function BookPaths({ color }: { color: string }) {
  return (
    <>
      <Path
        d="M3 5 C3 4.4 3.4 4 4 4 L11 4 C11.6 4 12 4.4 12 5 L12 20 L4 20 C3.4 20 3 19.6 3 19 Z"
        stroke={color}
        {...STROKE}
      />
      <Path
        d="M21 5 C21 4.4 20.6 4 20 4 L13 4 C12.4 4 12 4.4 12 5 L12 20 L20 20 C20.6 20 21 19.6 21 19 Z"
        stroke={color}
        {...STROKE}
      />
      <Path d="M6 8 L9 8" stroke={color} {...STROKE} />
      <Path d="M6 11 L9 11" stroke={color} {...STROKE} />
      <Path d="M15 8 L18 8" stroke={color} {...STROKE} />
      <Path d="M15 11 L18 11" stroke={color} {...STROKE} />
    </>
  );
}

function CompassPaths({ color }: { color: string }) {
  return (
    <>
      <Circle cx={12} cy={12} r={9} stroke={color} {...STROKE} />
      <Path
        d="M12 5.5 L13.6 11 L12 18.5 L10.4 11 Z"
        fill={color}
        opacity={0.18}
      />
      <Path
        d="M12 5.5 L13.6 11 L12 18.5 L10.4 11 Z"
        stroke={color}
        {...STROKE}
      />
      <Circle cx={12} cy={12} r={0.9} fill={color} />
      <Path d="M12 2.5 L12 4" stroke={color} {...STROKE} />
      <Path d="M12 20 L12 21.5" stroke={color} {...STROKE} />
      <Path d="M2.5 12 L4 12" stroke={color} {...STROKE} />
      <Path d="M20 12 L21.5 12" stroke={color} {...STROKE} />
    </>
  );
}

function SailPaths({ color }: { color: string }) {
  return (
    <>
      <Path d="M12 3 L12 14" stroke={color} {...STROKE} />
      <Path
        d="M12 4.5 C9.5 7 8 10 7.5 14 L12 14 Z"
        fill={color}
        opacity={0.22}
      />
      <Path
        d="M12 4.5 C9.5 7 8 10 7.5 14 L12 14 Z"
        stroke={color}
        {...STROKE}
      />
      <Path
        d="M12 6 C13.6 7.6 14.6 10 14.8 14 L12 14 Z"
        fill={color}
        opacity={0.10}
      />
      <Path
        d="M12 6 C13.6 7.6 14.6 10 14.8 14 L12 14 Z"
        stroke={color}
        {...STROKE}
      />
      <Path
        d="M4 16 C7 18 10 18.5 12 18.5 C14 18.5 17 18 20 16 L18.5 19.5 C18.2 20.2 17.5 20.5 16.7 20.5 L7.3 20.5 C6.5 20.5 5.8 20.2 5.5 19.5 Z"
        stroke={color}
        {...STROKE}
      />
    </>
  );
}

function PartsPaths({ color }: { color: string }) {
  return (
    <>
      <Path d="M3 17 C7 18.5 10 19 12 19 C14 19 17 18.5 21 17" stroke={color} {...STROKE} />
      <Path d="M5 17 L8 13 L16 13 L19 17 Z" stroke={color} {...STROKE} />
      <Path d="M12 13 L12 4" stroke={color} {...STROKE} />
      <Path d="M12 5 L7 12" stroke={color} {...STROKE} />
      <Path d="M12 7 L15.5 12" stroke={color} {...STROKE} />
      <Circle cx={18} cy={6.5} r={1} fill={color} opacity={0.55} />
      <Path d="M18 6.5 L20.5 4" stroke={color} {...STROKE} />
    </>
  );
}

function OnboardPaths({ color }: { color: string }) {
  return (
    <>
      <Path
        d="M6 5 L6 21 C6 21.55 6.45 22 7 22 L17 22 C17.55 22 18 21.55 18 21 L18 5"
        stroke={color}
        {...STROKE}
      />
      <Path d="M9 4 L15 4 L15 6 L9 6 Z" stroke={color} {...STROKE} />
      <Path d="M9 5 L6 5" stroke={color} {...STROKE} />
      <Path d="M15 5 L18 5" stroke={color} {...STROKE} />
      <Path d="M9 11 L15 11" stroke={color} {...STROKE} />
      <Path d="M9 14 L15 14" stroke={color} {...STROKE} />
      <Path d="M9 17 L13 17" stroke={color} {...STROKE} />
    </>
  );
}

function GlossaryPaths({ color }: { color: string }) {
  return (
    <>
      <Path d="M3.5 16 L6 7 L8.5 16" stroke={color} {...STROKE} />
      <Path d="M4.5 13 L7.5 13" stroke={color} {...STROKE} />
      <Path d="M10 12 L14 12" stroke={color} {...STROKE} />
      <Path d="M13 10.5 L14.5 12 L13 13.5" stroke={color} {...STROKE} />
      <Path d="M16 7 L20 7 L16 16 L20 16" stroke={color} {...STROKE} />
    </>
  );
}

function PolarPaths({ color }: { color: string }) {
  return (
    <>
      <Circle cx={12} cy={12} r={9} stroke={color} {...STROKE} />
      <Circle cx={12} cy={12} r={5.2} stroke={color} opacity={0.55} {...STROKE} />
      <Path d="M12 3 L12 21" stroke={color} {...STROKE} />
      <Path d="M3 12 L21 12" stroke={color} {...STROKE} />
      <Path d="M12 12 L18.4 5.6" stroke={color} {...STROKE} />
      <Circle cx={12} cy={12} r={0.9} fill={color} />
    </>
  );
}

function TacticsPaths({ color }: { color: string }) {
  return (
    <>
      <Circle cx={12} cy={4} r={1.4} fill={color} opacity={0.55} />
      <Circle cx={12} cy={4} r={1.4} stroke={color} {...STROKE} />
      <Path d="M5 20 L9 14 L8 11 L12 6.5" stroke={color} {...STROKE} />
      <Path d="M19 20 L15 14 L16 11 L12 6.5" stroke={color} {...STROKE} />
      <Path d="M9 14 L15 14" stroke={color} opacity={0.55} {...STROKE} />
    </>
  );
}

function SimulatorPaths({ color }: { color: string }) {
  return (
    <>
      <Rect x={3} y={3} width={18} height={18} rx={2} stroke={color} {...STROKE} />
      <Path d="M8 18 L12 6 L16 18 Z" stroke={color} {...STROKE} />
      <Path d="M8 18 L16 18" stroke={color} {...STROKE} />
      <Circle cx={12} cy={14} r={0.8} fill={color} />
    </>
  );
}

function MultiplayerPaths({ color }: { color: string }) {
  return (
    <>
      <Circle cx={9} cy={8} r={3} stroke={color} {...STROKE} />
      <Path d="M3.5 19 C3.5 15.7 6 14 9 14 C12 14 14.5 15.7 14.5 19" stroke={color} {...STROKE} />
      <Circle cx={16.5} cy={9} r={2.4} stroke={color} {...STROKE} />
      <Path d="M14 14.5 C16.4 14.5 20.5 15.6 20.5 18.5" stroke={color} {...STROKE} />
    </>
  );
}

function LeaderboardPaths({ color }: { color: string }) {
  return (
    <>
      <Path
        d="M8 4 L16 4 L16 9 C16 11.5 14.2 13.5 12 13.5 C9.8 13.5 8 11.5 8 9 Z"
        stroke={color}
        {...STROKE}
      />
      <Path d="M8 6 L5.5 6 C5 6 4.5 6.5 4.5 7 L4.5 8 C4.5 9.7 6 11 8 11" stroke={color} {...STROKE} />
      <Path
        d="M16 6 L18.5 6 C19 6 19.5 6.5 19.5 7 L19.5 8 C19.5 9.7 18 11 16 11"
        stroke={color}
        {...STROKE}
      />
      <Path d="M12 13.5 L12 16" stroke={color} {...STROKE} />
      <Path d="M9 16 L15 16 L15 18 L9 18 Z" stroke={color} {...STROKE} />
      <Path d="M7 20 L17 20" stroke={color} {...STROKE} />
    </>
  );
}

function GalleryPaths({ color }: { color: string }) {
  return (
    <>
      <Rect x={3} y={5} width={18} height={14} rx={2} stroke={color} {...STROKE} />
      <Circle cx={8.5} cy={10} r={1.6} fill={color} opacity={0.55} />
      <Circle cx={8.5} cy={10} r={1.6} stroke={color} {...STROKE} />
      <Path d="M3.5 17 L9 12 L13 16 L16 13.5 L20.5 17" stroke={color} {...STROKE} />
    </>
  );
}

function GearPaths({ color }: { color: string }) {
  return (
    <>
      <Circle cx={12} cy={12} r={3} stroke={color} {...STROKE} />
      <Path d="M12 2.5 L12 5" stroke={color} {...STROKE} />
      <Path d="M12 19 L12 21.5" stroke={color} {...STROKE} />
      <Path d="M2.5 12 L5 12" stroke={color} {...STROKE} />
      <Path d="M19 12 L21.5 12" stroke={color} {...STROKE} />
      <Path d="M5.3 5.3 L7 7" stroke={color} {...STROKE} />
      <Path d="M17 17 L18.7 18.7" stroke={color} {...STROKE} />
      <Path d="M5.3 18.7 L7 17" stroke={color} {...STROKE} />
      <Path d="M17 7 L18.7 5.3" stroke={color} {...STROKE} />
    </>
  );
}

function WindPaths({ color }: { color: string }) {
  return (
    <>
      <Path
        d="M3 7 L13 7 C14.7 7 16 5.7 16 4.2 C16 2.9 14.9 2 13.7 2 C12.5 2 11.5 2.9 11.5 4"
        stroke={color}
        {...STROKE}
      />
      <Path
        d="M3 12 L17 12 C18.7 12 20 13.3 20 14.8 C20 16.1 18.9 17 17.7 17 C16.5 17 15.5 16.1 15.5 15"
        stroke={color}
        {...STROKE}
      />
      <Path d="M3 17 L11 17" stroke={color} {...STROKE} />
    </>
  );
}

function SailTrimPaths({ color }: { color: string }) {
  return (
    <>
      <Path d="M12 3 L12 18" stroke={color} {...STROKE} />
      <Path
        d="M12 4.5 C8.5 7.5 7 12 6.8 18 L12 18 Z"
        fill={color}
        opacity={0.18}
      />
      <Path
        d="M12 4.5 C8.5 7.5 7 12 6.8 18 L12 18 Z"
        stroke={color}
        {...STROKE}
      />
      <Path d="M16 9 L20 9" stroke={color} {...STROKE} />
      <Path d="M18.5 6.5 L21 9 L18.5 11.5" stroke={color} {...STROKE} />
    </>
  );
}

function TackPaths({ color }: { color: string }) {
  return (
    <>
      <Circle cx={12} cy={3.5} r={1} fill={color} opacity={0.6} />
      <Path d="M12 5 L12 8" stroke={color} strokeDasharray="1.5,1.5" {...STROKE} />
      <Path d="M5 21 C7 17 9.5 14 11.5 11.5" stroke={color} {...STROKE} />
      <Path d="M19 21 C17 17 14.5 14 12.5 11.5" stroke={color} {...STROKE} />
      <Path d="M9 14.5 L11.5 11.5 L14.5 13.5" stroke={color} {...STROKE} />
    </>
  );
}

function JibePaths({ color }: { color: string }) {
  return (
    <>
      <Circle cx={12} cy={20.5} r={1} fill={color} opacity={0.6} />
      <Path d="M12 19 L12 16" stroke={color} strokeDasharray="1.5,1.5" {...STROKE} />
      <Path d="M5 3 C7 7 9.5 10 11.5 12.5" stroke={color} {...STROKE} />
      <Path d="M19 3 C17 7 14.5 10 12.5 12.5" stroke={color} {...STROKE} />
      <Path d="M9 9.5 L11.5 12.5 L14.5 10.5" stroke={color} {...STROKE} />
    </>
  );
}

function VmgPaths({ color }: { color: string }) {
  return (
    <>
      <Circle cx={13} cy={11} r={8} stroke={color} {...STROKE} />
      <Circle cx={13} cy={11} r={4.5} stroke={color} opacity={0.55} {...STROKE} />
      <Circle cx={13} cy={11} r={1.5} fill={color} opacity={0.4} />
      <Path d="M3 21 L11.5 12.5" stroke={color} {...STROKE} />
      <Path d="M3 17.5 L3 21 L6.5 21" stroke={color} {...STROKE} />
    </>
  );
}

function FlagPaths({ color }: { color: string }) {
  return (
    <>
      <Path d="M5 3 L5 21" stroke={color} {...STROKE} />
      <Path
        d="M5 4 L18 4 C18 4 16.5 6 16.5 7.5 C16.5 9 18 11 18 11 L5 11"
        stroke={color}
        {...STROKE}
      />
      <Path d="M9 4 L9 7.5" stroke={color} opacity={0.55} {...STROKE} />
      <Path d="M14 4 L14 7.5" stroke={color} opacity={0.55} {...STROKE} />
      <Path d="M5 7.5 L18 7.5" stroke={color} opacity={0.45} {...STROKE} />
    </>
  );
}

function CheckPaths({ color }: { color: string }) {
  return (
    <>
      <Circle cx={12} cy={12} r={9} stroke={color} {...STROKE} />
      <Path d="M7.5 12.5 L10.8 15.8 L16.8 9" stroke={color} {...STROKE} />
    </>
  );
}

function WarningPaths({ color }: { color: string }) {
  return (
    <>
      <Path d="M12 3 L22 20.5 L2 20.5 Z" stroke={color} {...STROKE} />
      <Path d="M12 9 L12 14" stroke={color} {...STROKE} />
      <Circle cx={12} cy={17.5} r={0.9} fill={color} />
    </>
  );
}

function InfoPaths({ color }: { color: string }) {
  return (
    <>
      <Circle cx={12} cy={12} r={9} stroke={color} {...STROKE} />
      <Circle cx={12} cy={7.5} r={0.9} fill={color} />
      <Path d="M12 11 L12 17" stroke={color} {...STROKE} />
    </>
  );
}

function MenuPaths({ color }: { color: string }) {
  return (
    <>
      <Path d="M4 7 L20 7" stroke={color} {...STROKE} />
      <Path d="M4 12 L20 12" stroke={color} {...STROKE} />
      <Path d="M4 17 L20 17" stroke={color} {...STROKE} />
    </>
  );
}

function HomePaths({ color }: { color: string }) {
  return (
    <>
      <Path d="M4 11 L12 4 L20 11" stroke={color} {...STROKE} />
      <Path d="M6 10 L6 20 L18 20 L18 10" stroke={color} {...STROKE} />
      <Path d="M10 20 L10 14 L14 14 L14 20" stroke={color} {...STROKE} />
    </>
  );
}

const REGISTRY: Record<IconName, (props: { color: string }) => React.ReactElement> = {
  cap: CapPaths,
  bolt: BoltPaths,
  book: BookPaths,
  compass: CompassPaths,
  sail: SailPaths,
  parts: PartsPaths,
  onboard: OnboardPaths,
  glossary: GlossaryPaths,
  polar: PolarPaths,
  tactics: TacticsPaths,
  simulator: SimulatorPaths,
  multiplayer: MultiplayerPaths,
  leaderboard: LeaderboardPaths,
  gallery: GalleryPaths,
  gear: GearPaths,
  wind: WindPaths,
  'sail-trim': SailTrimPaths,
  tack: TackPaths,
  jibe: JibePaths,
  vmg: VmgPaths,
  flag: FlagPaths,
  check: CheckPaths,
  warning: WarningPaths,
  info: InfoPaths,
  menu: MenuPaths,
  home: HomePaths,
};

const FALLBACK_EMOJI: Record<string, string> = {
  cap: '🎓',
  bolt: '⚡',
  book: '📖',
  compass: '🧭',
  sail: '⛵',
};

export function Icon({ name, size = 24, color, style }: IconProps) {
  const tint = color ?? colors.textPrimary;
  const Renderer = REGISTRY[name as IconName];

  if (!Renderer) {
    const glyph = FALLBACK_EMOJI[name] ?? '?';
    return (
      <View
        style={[
          styles.fallbackWrap,
          { width: size, height: size },
          style,
        ]}
      >
        <Text style={{ fontSize: size * 0.8, lineHeight: size, color: tint }}>
          {glyph}
        </Text>
      </View>
    );
  }

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Renderer color={tint} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
