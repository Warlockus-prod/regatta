import { useEffect, useRef } from 'react';
import { Animated, Easing, type StyleProp, StyleSheet, type ViewStyle } from 'react-native';
import { colors } from '../tokens';

interface SkeletonProps {
  width: number | `${number}%`;
  height: number;
  /** Corner radius. Default 6 (matches `radii.sm`). */
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Loading shimmer block. Looped opacity 0.4 -> 0.7 -> 0.4 over 1500ms,
 * mirrors the Animated pattern used by `PulsePill`. Use as a content
 * placeholder while a Tier-2 surface (gallery, leaderboard) hydrates.
 */
export function Skeleton({ width, height, radius = 6, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityLabel="Loading"
      accessibilityRole="image"
      style={[
        styles.base,
        { width: width as number, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.bgCard,
  },
});
