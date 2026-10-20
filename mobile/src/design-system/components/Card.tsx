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
import { darkShadow, radii, shadow, spacing } from '../tokens';
import { bySurface, useSurface, type Surface } from '../surface';

export type CardAccent = 'cyan' | 'success' | 'warning';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  /**
   * Per-card tinted variant (8% background, 30% border). Pressed state
   * lifts both. Omit for the plain raised card.
   */
  accent?: CardAccent;
  style?: StyleProp<ViewStyle>;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
}

/** Accent RGB per surface: blue / teal / amber on paper, neon on dark. */
const ACCENT_RGB: Record<Surface, Record<CardAccent, string>> = {
  light: { cyan: '0, 110, 166', success: '0, 109, 112', warning: '138, 97, 0' },
  dark: { cyan: '0, 212, 255', success: '68, 255, 136', warning: '255, 170, 0' },
};

function tintedStyle(surface: Surface, accent: CardAccent, pressed: boolean): ViewStyle {
  const rgb = ACCENT_RGB[surface][accent];
  return {
    backgroundColor: `rgba(${rgb}, ${pressed ? 0.14 : 0.08})`,
    borderColor: `rgba(${rgb}, ${pressed ? 0.5 : 0.3})`,
    borderWidth: 1,
  };
}

/**
 * Raised surface: white card with a soft shadow on paper, a bordered navy
 * card on the dark surface.
 */
export function Card({
  children,
  onPress,
  accent,
  style,
  accessibilityRole,
  accessibilityLabel,
  accessibilityState,
}: CardProps) {
  const surface = useSurface();
  const styles = themed[surface];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={accessibilityState}
        style={({ pressed }) => [
          styles.card,
          accent ? tintedStyle(surface, accent, pressed) : pressed && styles.pressed,
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
      style={[styles.card, accent ? tintedStyle(surface, accent, false) : null, style]}
    >
      {children}
    </View>
  );
}

const themed = bySurface((c, surface) => StyleSheet.create({
  card: surface === 'light'
    ? {
      backgroundColor: c.bgCard,
      borderRadius: radii.card,
      padding: spacing.lg,
      ...shadow.card,
    }
    : {
      backgroundColor: c.bgCard,
      borderColor: c.borderCyanFaint,
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing.lg,
      ...darkShadow.card,
      shadowOpacity: 0,
      elevation: 0,
    },
  pressed: {
    backgroundColor: c.bgCardHover,
    borderColor: c.borderCyanSoft,
  },
}));
