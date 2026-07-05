import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { motion, radii } from '../tokens';
import type { ThemeColors } from '../tokens';
import { useThemedStyles } from '../theme';

interface PulsePillProps {
  /** Visible label text, rendered uppercase via styling, not transform. */
  label: string;
  /**
   * Disables the opacity loop. Useful in tests or for static badges that
   * should keep visual parity without animating.
   */
  staticDot?: boolean;
  /**
   * Override the spoken label. Defaults to "<label>, live indicator" so
   * the pulsing dot is communicated to screen readers.
   */
  accessibilityLabel?: string;
}

/**
 * Cyan pill with a pulsing dot and short label. Brand "this surface is
 * placeholder / live / coming-soon" tag. Used by `PlaceholderScreen` and
 * any screen that needs a small attention-getter without dominating the
 * hierarchy.
 */
export function PulsePill({
  label,
  staticDot = false,
  accessibilityLabel,
}: PulsePillProps) {
  const styles = useThemedStyles(makeStyles);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (staticDot) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: motion.pulse,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: motion.pulse,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, staticDot]);

  return (
    <View
      style={styles.pill}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? `${label}, live indicator`}
    >
      <Animated.View
        style={[styles.pillDot, { opacity }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    pill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: radii.pill,
      backgroundColor: c.surfaceCyanFaint,
      borderColor: c.borderCyanSoft,
      borderWidth: 1,
    },
    pillDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: c.accentCyan,
    },
    pillLabel: {
      fontSize: 12,
      fontWeight: '500',
      color: c.accentCyan,
      letterSpacing: 0.3,
    },
  });
