import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Screen } from './Screen';
import { Text } from './Text';
import { PulsePill } from './PulsePill';
import { spacing } from '../tokens';
import type { ThemeColors } from '../tokens';
import { useThemedStyles } from '../theme';

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
  const styles = useThemedStyles(makeStyles);
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

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xxl,
      gap: spacing.lg,
    },
    title: {
      fontSize: 36,
      fontWeight: '700',
      letterSpacing: -0.5,
      lineHeight: 42,
      color: c.textPrimary,
    },
    titleAccent: {
      color: c.accentCyan,
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
      backgroundColor: c.accentCyan,
      marginTop: 8,
    },
    highlightText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
    },
  });
