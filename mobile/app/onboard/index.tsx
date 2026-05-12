import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../../src/i18n/context';
import { Card, Screen, Text } from '../../src/design-system/components';
import { onboardSections } from '../../src/data';
import { legacyPick, legacyPickArray } from '../../src/i18n/languages';
import { colors, spacing } from '../../src/design-system/tokens';

/**
 * On board: shipboard culture, commands, and etiquette across 8
 * sections. Single-screen scrolling list (no detail page) since each
 * section is short.
 */
export default function Onboard() {
  const { tp, lang } = useI18n();

  const headerTitle = tp('На борту', 'On board', 'Na pokladzie', {
    es: 'A bordo',
    fr: 'A bord',
    de: 'An Bord',
    it: 'A bordo',
  });

  const warningLabel = tp(
    'Предупреждение',
    'Warning',
    'Uwaga',
    {
      es: 'Advertencia',
      fr: 'Attention',
      de: 'Warnung',
      it: 'Attenzione',
    },
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {onboardSections.map((section) => {
          const title = legacyPick(section, 'title', lang);
          const items = legacyPickArray(section, 'items', lang);
          const warning = legacyPick(section, 'warning', lang);
          return (
            <Card key={section.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.icon}>{section.icon}</Text>
                <Text variant="subtitle" style={styles.title}>{title}</Text>
              </View>
              <View style={styles.items}>
                {items.map((item, i) => (
                  <View key={i} style={styles.item}>
                    <Text variant="muted" style={styles.bullet}>-</Text>
                    <Text variant="body" style={styles.itemText}>{item}</Text>
                  </View>
                ))}
              </View>
              {warning ? (
                <View style={styles.warning}>
                  <Text variant="muted" style={styles.warningLabel}>
                    {warningLabel.toUpperCase()}
                  </Text>
                  <Text variant="body" style={styles.warningText}>{warning}</Text>
                </View>
              ) : null}
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 22,
    marginRight: spacing.sm,
  },
  title: {
    flex: 1,
  },
  items: {
    marginTop: spacing.md,
    gap: spacing.xs + 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    width: 12,
    fontWeight: '700',
    fontSize: 16,
    marginTop: 1,
  },
  itemText: {
    flex: 1,
    lineHeight: 22,
  },
  warning: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 170, 0, 0.10)',
    borderColor: 'rgba(255, 170, 0, 0.30)',
    borderWidth: 1,
  },
  warningLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.warning,
    marginBottom: spacing.xs,
  },
  warningText: {
    color: colors.textPrimary,
  },
});
