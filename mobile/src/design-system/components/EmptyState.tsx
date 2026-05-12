import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { colors, spacing } from '../tokens';

interface EmptyStateCta {
  label: string;
  onPress: () => void;
}

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  /** Brand glyph rendered above the title. Default `compass`. */
  icon?: IconName;
  /** Optional ghost CTA below the subtitle. */
  cta?: EmptyStateCta;
  style?: StyleProp<ViewStyle>;
}

/**
 * Centered "nothing here yet" panel. Brand glyph (32pt cyan) on top, a
 * subtitle-variant title, optional caption-variant subtitle, and an
 * optional secondary CTA button. Used by Glossary search-no-hits and
 * any future Tier-2 surface that hydrates to zero items.
 */
export function EmptyState({
  title,
  subtitle,
  icon = 'compass',
  cta,
  style,
}: EmptyStateProps) {
  return (
    <View style={[styles.wrap, style]} accessible>
      <Icon name={icon} size={32} color={colors.accentCyan} style={styles.icon} />
      <Text variant="subtitle" style={styles.title}>{title}</Text>
      {subtitle ? (
        <Text variant="caption" style={styles.subtitle}>{subtitle}</Text>
      ) : null}
      {cta ? (
        <View style={styles.ctaRow}>
          <Button variant="ghost" onPress={cta.onPress}>{cta.label}</Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  icon: {
    marginBottom: spacing.md,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  ctaRow: {
    marginTop: spacing.md,
  },
});
