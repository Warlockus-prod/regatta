import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';
import { colors, spacing } from '../tokens';

interface ListRowProps {
  title: string;
  caption?: string;
  onPress: () => void;
  /** Hide bottom border (use for the last row in a group). */
  noBorder?: boolean;
  /**
   * Optional leading icon. Mirrors the iOS Settings pattern of a small
   * tinted glyph to the left of the row title. Tints to
   * `colors.textSecondary` unless `iconColor` overrides.
   */
  icon?: IconName;
  iconColor?: string;
}

/**
 * Compact navigation row. One title, optional caption, chevron-style ">"
 * indicator on the right. Lighter footprint than Card for secondary
 * tools and reference lists.
 */
export function ListRow({
  title,
  caption,
  onPress,
  noBorder = false,
  icon,
  iconColor,
}: ListRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !noBorder && styles.bordered,
        pressed && styles.pressed,
      ]}
    >
      {icon ? (
        <View style={styles.iconWrap}>
          <Icon name={icon} size={22} color={iconColor ?? colors.textSecondary} />
        </View>
      ) : null}
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
    minHeight: 44, // Apple HIG minimum tappable target
  },
  bordered: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderCyanFaint,
  },
  pressed: {
    backgroundColor: colors.bgCardHover,
  },
  iconWrap: {
    marginRight: spacing.md,
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
