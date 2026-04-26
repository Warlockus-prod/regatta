import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Card } from './Card';
import { Screen } from './Screen';
import { Text } from './Text';
import { spacing } from '../tokens';

interface PlaceholderScreenProps {
  title: string;
  note: string;
}

/**
 * Minimal screen that shows a title and a "coming soon" note. Used for
 * routes whose real content lands later in the roadmap (after ADR-0003
 * content sync, or on a later phase). Keeps navigation working without
 * blocking on content.
 */
export function PlaceholderScreen({ title, note }: PlaceholderScreenProps) {
  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <View style={styles.center}>
        <Card>
          <Text variant="subtitle">{title}</Text>
          <Text variant="caption" style={styles.note}>{note}</Text>
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    padding: spacing.lg,
  },
  note: {
    marginTop: spacing.sm,
  },
});
