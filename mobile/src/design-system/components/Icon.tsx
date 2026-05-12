import { type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../tokens';

/**
 * Brand icon registry. Each name maps to one of the SVGs hand-drawn by
 * the Designer in `mobile/assets/icons/*.svg` and inlined here as
 * react-native-svg primitives so we don't pull in `react-native-svg-transformer`.
 *
 * Available names:
 *   - `cap`     graduation cap  (Bootcamp / lesson surfaces)
 *   - `bolt`    lightning bolt  (Quick refresh)
 *   - `book`    open book       (Rules / regulations)
 *   - `compass` compass + N-needle (Courses / navigation)
 *   - `sail`    side-view sloop (anatomy / brand mark)
 *
 * Usage:
 *   <Icon name="cap" size={36} color={colors.accentCyan} />
 *
 * Unknown names log a warning and render a neutral fallback glyph
 * (a thin question-mark) instead of crashing - we never want a missing
 * icon to take down a screen.
 */
export type IconName = 'cap' | 'bolt' | 'book' | 'compass' | 'sail';

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

const REGISTRY: Record<IconName, (props: { color: string }) => React.ReactElement> = {
  cap: CapPaths,
  bolt: BoltPaths,
  book: BookPaths,
  compass: CompassPaths,
  sail: SailPaths,
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
