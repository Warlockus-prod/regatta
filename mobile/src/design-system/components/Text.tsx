import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native';
import type { ThemeColors } from '../tokens';
import { useThemedStyles } from '../theme';

export type TextVariant = 'title' | 'subtitle' | 'body' | 'caption' | 'muted' | 'accent';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
}

const makeVariantStyles = (c: ThemeColors) =>
  StyleSheet.create({
    title: {
      color: c.textPrimary,
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: 0.3,
    },
    subtitle: {
      color: c.textPrimary,
      fontSize: 18,
      fontWeight: '600',
    },
    body: {
      color: c.textPrimary,
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 22,
    },
    caption: {
      color: c.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    muted: {
      color: c.textMuted,
      fontSize: 13,
    },
    accent: {
      color: c.accentCyan,
      fontSize: 16,
      fontWeight: '600',
    },
  });

/**
 * Brand-aware Text. Default variant is `body`. Pass `style` to override
 * specific properties; the variant style is applied first.
 */
export function Text({ variant = 'body', style, ...rest }: TextProps) {
  const variantStyles = useThemedStyles(makeVariantStyles);
  return <RNText {...rest} style={[variantStyles[variant], style]} />;
}
