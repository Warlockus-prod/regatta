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
import { colors, radii, spacing } from '../tokens';

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

const ACCENT_RGB: Record<CardAccent, string> = {
  cyan: '0, 212, 255',
  success: '68, 255, 136',
  warning: '255, 170, 0',
};

function tintedStyle(accent: CardAccent, pressed: boolean): ViewStyle {
  const rgb = ACCENT_RGB[accent];
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
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={accessibilityState}
        style={({ pressed }) => [
          styles.card,
          accent ? tintedStyle(accent, pressed) : pressed && styles.pressed,
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
      style={[styles.card, accent ? tintedStyle(accent, false) : null, style]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderColor: colors.borderCyanFaint,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  pressed: {
    backgroundColor: colors.bgCardHover,
    borderColor: colors.borderCyanSoft,
  },
});
