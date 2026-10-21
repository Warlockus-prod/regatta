import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';
import { spacing } from '../tokens';
import { bySurface, useSurface, useSurfaceColors } from '../surface';

interface ListRowProps {
  title: string;
  caption?: string;
  onPress: () => void;
  noBorder?: boolean;
  /**
   * Optional leading icon. Mirrors the iOS Settings pattern of a small
   * tinted glyph to the left of the row title. Tints to the secondary text
   * colour unless `iconColor` overrides.
   */
  icon?: IconName;
  iconColor?: string;
  /** Short status pill before the chevron, e.g. "Internet required". */
  badge?: string;
}

/**
 * Compact navigation row. One title, optional caption, a chevron on the
 * right. Lighter footprint than Card for secondary tools and reference
 * lists.
 */
export function ListRow({
  title,
  caption,
  onPress,
  noBorder = false,
  icon,
  iconColor,
  badge,
}: ListRowProps) {
  const styles = themed[useSurface()];
  const c = useSurfaceColors();
  // With large text a badge beside the title squeezes both until words
  // break ("Assisten/ten", "erforderlic/h"): put it under the text instead.
  const stacked = useWindowDimensions().fontScale >= 1.3;
  const badgeView = badge ? (
    <View style={[styles.badge, stacked && styles.badgeStacked]}>
      <Text style={styles.badgeText} maxFontSizeMultiplier={1.6}>{badge}</Text>
    </View>
  ) : null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !noBorder && styles.bordered,
        pressed && styles.pressed,
      ]}
    >
      {icon ? (
        <View style={styles.iconWrap}>
          <Icon name={icon} size={22} color={iconColor ?? c.textSecondary} />
        </View>
      ) : null}
      <View style={styles.text}>
        <Text variant="subtitle" style={styles.title}>{title}</Text>
        {caption ? <Text variant="caption" style={styles.caption}>{caption}</Text> : null}
        {stacked ? badgeView : null}
      </View>
      {stacked ? null : badgeView}
      <Svg width={8} height={14} viewBox="0 0 8 14" style={styles.chevron} accessibilityElementsHidden importantForAccessibility="no">
        <Path d="M1.5 1.5 6.5 7l-5 5.5" stroke={c.textMuted} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

const themed = bySurface((c) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  bordered: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.borderCyanFaint,
  },
  pressed: {
    backgroundColor: c.bgCardHover,
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
    lineHeight: 22,
  },
  caption: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 20,
  },
  chevron: {
    marginLeft: spacing.md,
  },
  badge: {
    marginLeft: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: c.sand,
    maxWidth: 140,
  },
  badgeStacked: {
    marginLeft: 0,
    marginTop: spacing.sm,
    maxWidth: '100%',
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
}));
