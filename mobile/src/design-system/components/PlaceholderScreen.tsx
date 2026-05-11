import { Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View } from 'react-native';
import { Screen } from './Screen';
import { Text } from './Text';
import { colors, radii, spacing } from '../tokens';

interface PlaceholderScreenProps {
  /** Stack header title and the screen H1. */
  title: string;
  /** Body copy below the H1. */
  note: string;
  /**
   * Pill badge text above the title. Pass a phase tag like "Phase 3"
   * for sharper signal; falls back to "Coming soon".
   */
  badge?: string;
  /**
   * Optional preview-list items rendered below the note as a bulleted
   * list. Useful for hinting at what the screen will become.
   */
  highlights?: string[];
}

/**
 * Stand-in for routes that ship later in the roadmap. Mirrors the web
 * hero pattern: pulse-pill at the top, big tracking-tight H1 with a
 * cyan accent dot, body paragraph, optional highlights list. Keeps
 * navigation and brand identity present even before the real screen
 * lands.
 */
export function PlaceholderScreen({
  title,
  note,
  badge = 'Coming soon',
  highlights,
}: PlaceholderScreenProps) {
  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <PulsePill label={badge} />
        <Text style={styles.title}>
          {title}
          <Text style={styles.titleAccent}>.</Text>
        </Text>
        <Text variant="caption" style={styles.note}>{note}</Text>
        {highlights && highlights.length > 0 ? (
          <View style={styles.highlights}>
            {highlights.map((line) => (
              <View key={line} style={styles.highlightRow}>
                <View style={styles.highlightDot} />
                <Text variant="caption" style={styles.highlightText}>{line}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function PulsePill({ label }: { label: string }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={styles.pill}>
      <Animated.View style={[styles.pillDot, { opacity }]} />
      <Text style={styles.pillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0, 212, 255, 0.10)',
    borderColor: 'rgba(0, 212, 255, 0.25)',
    borderWidth: 1,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentCyan,
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.accentCyan,
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 42,
    color: colors.textPrimary,
  },
  titleAccent: {
    color: colors.accentCyan,
  },
  note: {
    fontSize: 15,
    lineHeight: 22,
  },
  highlights: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  highlightDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accentCyan,
    marginTop: 8,
  },
  highlightText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
