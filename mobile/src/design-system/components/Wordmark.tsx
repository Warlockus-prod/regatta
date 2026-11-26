import { type StyleProp, type TextStyle } from 'react-native';
import { UI_TERMS } from '../../../../src/lib/product/catalog';
import { Text } from './Text';
import { colors } from '../tokens';

export type WordmarkSize = 'xl' | 'm' | 's';

interface WordmarkProps {
  size?: WordmarkSize;
  style?: StyleProp<TextStyle>;
}

const SIZE_PRESETS: Record<WordmarkSize, { fontSize: number; lineHeight: number }> = {
  xl: { fontSize: 28, lineHeight: 36 },
  m: { fontSize: 20, lineHeight: 28 },
  s: { fontSize: 16, lineHeight: 24 },
};

/**
 * Brand wordmark: "Week to Regatta" as one line in one size and one weight.
 * Owner 2026-11-04: no word of the name is set larger than the others.
 */
export function Wordmark({ size = 'm', style }: WordmarkProps) {
  return (
    <Text style={[{ color: colors.textPrimary, fontWeight: '700', letterSpacing: 0 }, SIZE_PRESETS[size], style]}>
      {UI_TERMS.brand.en}
    </Text>
  );
}
