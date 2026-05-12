import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from './Text';
import { colors } from '../tokens';

export type WordmarkSize = 'xl' | 'm' | 's';

interface WordmarkProps {
  size?: WordmarkSize;
  style?: StyleProp<ViewStyle>;
}

interface SizePreset {
  lead: number;
  brand: number;
  letterSpacing: number;
}

const SIZE_PRESETS: Record<WordmarkSize, SizePreset> = {
  xl: { lead: 18, brand: 40, letterSpacing: 0.5 },
  m: { lead: 12, brand: 24, letterSpacing: 0.4 },
  s: { lead: 10, brand: 18, letterSpacing: 0.3 },
};

/**
 * Brand wordmark. The xl variant (Home hero) is a vertical stack of two
 * Text nodes - "Week to" 18pt secondary above "Regatta" 40pt cyan - so
 * the existing home.test.tsx assertions `getByText('Week to')` +
 * `getByText('Regatta')` keep matching as separate elements.
 *
 * The m and s variants render inline as a single Text "Week to Regatta"
 * with the "Regatta" portion nested in a cyan child Text. This keeps
 * the settings.test.tsx assertion `getByText('Week to Regatta')`
 * passing while still letting the cyan accent show through at smaller
 * sizes.
 */
export function Wordmark({ size = 'xl', style }: WordmarkProps) {
  const preset = SIZE_PRESETS[size];

  if (size === 'xl') {
    return (
      <View style={[styles.stack, style]}>
        <Text
          style={[
            styles.lead,
            {
              fontSize: preset.lead,
              letterSpacing: preset.letterSpacing - 0.1,
              marginBottom: 2,
            },
          ]}
        >
          Week to
        </Text>
        <Text
          style={[
            styles.brand,
            { fontSize: preset.brand, letterSpacing: preset.letterSpacing },
          ]}
        >
          Regatta
        </Text>
      </View>
    );
  }

  return (
    <Text
      style={[
        styles.lead,
        {
          fontSize: preset.lead,
          letterSpacing: preset.letterSpacing - 0.1,
        },
        style as never,
      ]}
    >
      {'Week to '}
      <Text
        style={[
          styles.brand,
          { fontSize: preset.brand, letterSpacing: preset.letterSpacing },
        ]}
      >
        Regatta
      </Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  stack: {
    alignItems: 'center',
  },
  lead: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  brand: {
    color: colors.accentCyan,
    fontWeight: '700',
  },
});
