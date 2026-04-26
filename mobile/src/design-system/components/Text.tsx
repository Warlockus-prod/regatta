import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native';
import { colors } from '../tokens';

export type TextVariant = 'title' | 'subtitle' | 'body' | 'caption' | 'muted' | 'accent';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
}

const variantStyles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  body: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  },
  caption: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  muted: {
    color: colors.textMuted,
    fontSize: 13,
  },
  accent: {
    color: colors.accentCyan,
    fontSize: 16,
    fontWeight: '600',
  },
});

/**
 * Brand-aware Text. Default variant is `body`. Pass `style` to override
 * specific properties; the variant style is applied first.
 */
export function Text({ variant = 'body', style, ...rest }: TextProps) {
  return <RNText {...rest} style={[variantStyles[variant], style]} />;
}
