import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../tokens';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Dark-ocean card. Mirrors `.card` from `src/app/globals.css` (bg, border,
 * radius, hover/press feedback). Pass `onPress` for an interactive card,
 * omit it for a static surface.
 */
export function Card({ children, onPress, style }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          pressed && styles.pressed,
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderColor: 'rgba(0, 212, 255, 0.10)',
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  pressed: {
    backgroundColor: colors.bgCardHover,
    borderColor: 'rgba(0, 212, 255, 0.25)',
  },
});
