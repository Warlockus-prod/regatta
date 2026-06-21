import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../../src/i18n/context';
import {
  Card,
  RacingCourseDiagram,
  RacingStrategyDiagram,
  Screen,
  Text,
} from '../../src/design-system/components';
import { racingRules, racingStrategies } from '../../src/data';
import { legacyPick, pickLocalized } from '../../src/i18n/languages';
import { colors, spacing } from '../../src/design-system/tokens';

/**
 * Racing tactics. Two sections:
 *   1. Right-of-way rules, sorted by priority (lower number wins).
 *   2. Strategies (upwind / downwind / start / mark-rounding) with
 *      bullet-style tips.
 *
 * Mobile keeps the web tactical diagrams as native SVG so the screen
 * teaches race geometry, not just rule text.
 */
export default function Racing() {
  const { tp, lang } = useI18n();

  const headerTitle = tp(
    'Тактика гонок',
    'Racing tactics',
    'Taktyka wyscigow',
    {
      es: 'Tactica de regata',
      fr: 'Tactique de regate',
      de: 'Regatta-Taktik',
      it: 'Tattica di regata',
    },
  );

  const rulesLabel = tp('Правила преимущества', 'Right of way', 'Pierwszenstwo', {
    es: 'Derecho de paso',
    fr: 'Priorite',
    de: 'Vorfahrt',
    it: 'Diritto di precedenza',
  });

  const strategiesLabel = tp('Стратегии', 'Strategies', 'Strategie', {
    es: 'Estrategias',
    fr: 'Strategies',
    de: 'Strategien',
    it: 'Strategie',
  });

  const sortedRules = [...racingRules].sort((a, b) => a.priority - b.priority);

  return (
    <Screen>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <RacingCourseDiagram />

        <Text variant="muted" style={styles.sectionLabel}>
          {rulesLabel.toUpperCase()}
        </Text>
        {sortedRules.map((rule) => {
          const title = legacyPick(rule, 'title', lang);
          const description = legacyPick(rule, 'description', lang);
          const priorityLabel = tp(
            `Приоритет ${rule.priority}`,
            `Priority ${rule.priority}`,
            `Priorytet ${rule.priority}`,
            {
              es: `Prioridad ${rule.priority}`,
              fr: `Priorite ${rule.priority}`,
              de: `Prioritaet ${rule.priority}`,
              it: `Priorita ${rule.priority}`,
            },
          );
          return (
            <Card
              key={rule.id}
              style={styles.card}
              accessibilityRole="text"
              accessibilityLabel={`${priorityLabel}. ${title}. ${description}`}
            >
              <View style={styles.ruleHeader}>
                <View style={styles.priorityBadge}>
                  <Text
                    variant="muted"
                    allowFontScaling={false}
                    style={styles.priorityText}
                  >
                    {rule.priority}
                  </Text>
                </View>
                <Text variant="subtitle" style={styles.ruleTitle}>{title}</Text>
              </View>
              <Text variant="body" style={styles.ruleDesc}>{description}</Text>
            </Card>
          );
        })}

        <Text variant="muted" style={[styles.sectionLabel, styles.sectionLabelGap]}>
          {strategiesLabel.toUpperCase()}
        </Text>
        {racingStrategies.map((strategy) => {
          const title = legacyPick(strategy, 'title', lang);
          const description = legacyPick(strategy, 'description', lang);
          return (
            <Card key={strategy.id} style={styles.card}>
              <Text variant="subtitle">{title}</Text>
              <Text variant="body" style={styles.stratDesc}>{description}</Text>
              <RacingStrategyDiagram strategyId={strategy.id} />
              <View style={styles.tips}>
                {strategy.tips.map((tip, i) => (
                  <View key={i} style={styles.tipRow}>
                    <Text variant="muted" style={styles.bullet}>-</Text>
                    <Text variant="body" style={styles.tipText}>
                      {pickLocalized(lang, tip)}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xxl,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sectionLabelGap: {
    marginTop: spacing.lg,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    borderColor: 'rgba(0, 212, 255, 0.40)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  priorityText: {
    color: colors.accentCyan,
    fontWeight: '700',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  ruleTitle: {
    flex: 1,
  },
  ruleDesc: {
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  stratDesc: {
    marginTop: spacing.xs + 2,
    lineHeight: 22,
  },
  tips: {
    marginTop: spacing.md,
    gap: spacing.xs + 2,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bullet: {
    width: 12,
    fontWeight: '700',
    fontSize: 16,
    marginTop: 1,
  },
  tipText: {
    flex: 1,
    lineHeight: 22,
  },
});
