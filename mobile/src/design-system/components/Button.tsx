import { type ReactNode } from 'react';
import {
  type AccessibilityState,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { colors, radii, spacing } from '../tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  children: ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
}

/**
 * Brand button. Three variants:
 *  - `primary`: solid cyan, dark text. CTA.
 *  - `secondary`: dark card, cyan text + thin cyan border. Default.
 *  - `ghost`: transparent, cyan text. For inline / footer actions.
 */
export function Button({
  children,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
}: ButtonProps) {
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
        styles[`${variant}Container`],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.label, styles[`${variant}Label`]]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: 44, // Apple HIG minimum tappable target
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  primaryContainer: {
    backgroundColor: colors.accentCyan,
  },
  primaryLabel: {
    color: colors.bgPrimary,
  },
  secondaryContainer: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderCyanSoft,
  },
  secondaryLabel: {
    color: colors.accentCyan,
  },
  ghostContainer: {
    backgroundColor: 'transparent',
  },
  ghostLabel: {
    color: colors.accentCyan,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.4,
  },
});
