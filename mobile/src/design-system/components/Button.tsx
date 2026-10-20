import { type ReactNode } from 'react';
import {
  type AccessibilityState,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { radii, spacing } from '../tokens';
import { bySurface, useSurface } from '../surface';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  children: ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  /** `large` is the one main action of a screen (52 pt tall). */
  size?: 'default' | 'large';
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
}

/**
 * Brand button. Three variants:
 *  - `primary`: solid action colour, white text (dark text on the dark
 *    surface). The screen's main action.
 *  - `secondary`: raised surface, action-coloured text and a hairline border.
 *  - `ghost`: transparent, action-coloured text. Inline / footer actions.
 */
export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'default',
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
}: ButtonProps) {
  const styles = themed[useSurface()];
  const mergedState: AccessibilityState = {
    ...accessibilityState,
    disabled: disabled || accessibilityState?.disabled,
  };
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={mergedState}
      style={({ pressed }) => [
        styles.base,
        size === 'large' && styles.large,
        styles[`${variant}Container`],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.label, size === 'large' && styles.largeLabel, styles[`${variant}Label`]]}>{children}</Text>
    </Pressable>
  );
}

const themed = bySurface((c, surface) => StyleSheet.create({
  base: {
    borderRadius: surface === 'light' ? radii.control : radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl - 4,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: {
    minHeight: 52,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  largeLabel: {
    fontSize: 17,
  },
  primaryContainer: {
    backgroundColor: c.accentCyan,
  },
  primaryLabel: {
    color: surface === 'light' ? '#ffffff' : c.bgPrimary,
  },
  secondaryContainer: {
    backgroundColor: c.surfaceRaised,
    borderWidth: surface === 'light' ? StyleSheet.hairlineWidth : 1,
    borderColor: surface === 'light' ? 'rgba(18, 50, 71, 0.18)' : c.borderCyanSoft,
  },
  secondaryLabel: {
    color: c.accentCyan,
  },
  ghostContainer: {
    backgroundColor: 'transparent',
  },
  ghostLabel: {
    color: c.accentCyan,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.4,
  },
}));
