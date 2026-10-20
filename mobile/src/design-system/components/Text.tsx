import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native';
import { bySurface, useSurface } from '../surface';

/**
 * Themed Text. Default variant is `body`. `eyebrow` is the small uppercase
 * label above a heading ("NEXT LESSON · 2 OF 8"); the caller passes the
 * text in normal case, the style uppercases it.
 */
export type TextVariant = 'title' | 'subtitle' | 'body' | 'caption' | 'muted' | 'accent' | 'eyebrow';

interface TextProps extends RNTextProps {
  variant?: TextVariant;
}

const variantStyles = bySurface((c) => StyleSheet.create({
  title: {
    color: c.textPrimary,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  subtitle: {
    color: c.textPrimary,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
  },
  body: {
    color: c.textPrimary,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
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
  eyebrow: {
    color: c.eyebrow,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
}));

export function Text({ variant = 'body', style, ...rest }: TextProps) {
  const surface = useSurface();
  return <RNText {...rest} style={[variantStyles[surface][variant], style]} />;
}
