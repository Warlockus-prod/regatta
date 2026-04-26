import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, spacing } from '../tokens';

interface ListRowProps {
  title: string;
  caption?: string;
  onPress: () => void;
  /** Hide bottom border (use for the last row in a group). */
  noBorder?: boolean;
}

/**
 * Compact navigation row. One title, optional caption, chevron-style ">"
 * indicator on the right. Lighter footprint than Card for secondary
 * tools and reference lists.
 */
export function ListRow({ title, caption, onPress, noBorder = false }: ListRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !noBorder && styles.bordered,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.text}>
        <Text variant="subtitle" style={styles.title}>{title}</Text>
        {caption ? <Text variant="caption" style={styles.caption}>{caption}</Text> : null}
      </View>
      <Text variant="muted" style={styles.chevron}>{'>'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  bordered: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 212, 255, 0.10)',
  },
  pressed: {
    backgroundColor: colors.bgCardHover,
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: 16,
  },
  caption: {
    marginTop: 2,
  },
  chevron: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: spacing.sm,
    color: colors.textMuted,
  },
});
