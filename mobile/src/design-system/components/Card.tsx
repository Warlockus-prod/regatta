import { type ReactNode } from 'react';
import {
  type AccessibilityRole,
  type AccessibilityState,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { radii, spacing } from '../tokens';
import type { ThemeColors } from '../tokens';
import { useTheme, useThemedStyles, type Scheme } from '../theme';

export type CardAccent = 'cyan' | 'success' | 'warning';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  /**
   * Per-card tinted variant. Mirrors web home where each primary entry
   * card gets its own accent (8% bg, 30% border). Pressed state lifts
   * both. Omit for the default dark-card style.
   */
  accent?: CardAccent;
  style?: StyleProp<ViewStyle>;
  /** A11y forwarded to the inner Pressable / View. */
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
}

// Accent tint bases per scheme. Light uses the muted light-theme accents so an
// 8% tint on a white card still reads on-brand instead of neon.
const ACCENT_RGB: Record<Scheme, Record<CardAccent, string>> = {
  dark: {
    cyan: '0, 212, 255',
    success: '68, 255, 136',
    warning: '255, 170, 0',
  },
  light: {
    cyan: '0, 150, 199',
    success: '31, 157, 87',
    warning: '183, 121, 31',
  },
};

function tintedStyle(accent: CardAccent, pressed: boolean, scheme: Scheme): ViewStyle {
  const rgb = ACCENT_RGB[scheme][accent];
  return {
    backgroundColor: `rgba(${rgb}, ${pressed ? 0.14 : 0.08})`,
    borderColor: `rgba(${rgb}, ${pressed ? 0.5 : 0.3})`,
  };
}

export function Card({
  children,
  onPress,
  accent,
  style,
  accessibilityRole,
  accessibilityLabel,
  accessibilityState,
}: CardProps) {
  const styles = useThemedStyles(makeStyles);
  const { scheme } = useTheme();
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={accessibilityState}
        style={({ pressed }) => [
          styles.card,
          accent ? tintedStyle(accent, pressed, scheme) : pressed && styles.pressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      style={[styles.card, accent ? tintedStyle(accent, false, scheme) : null, style]}
    >
      {children}
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.bgCard,
      borderColor: c.borderCyanFaint,
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing.lg,
    },
    pressed: {
      backgroundColor: c.bgCardHover,
      borderColor: c.borderCyanSoft,
    },
  });
