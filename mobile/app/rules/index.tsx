import { Stack, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../../src/i18n/context';
import { Card, Screen, Text } from '../../src/design-system/components';
import { ruleScenarios } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { colors, spacing } from '../../src/design-system/tokens';

/**
 * Rules of the road index. Lists 8 collision scenarios, each with an
 * RRS or COLREGS source tag. Tap a card to go to `/rules/[id]` which
 * renders the scenario as a reveal-style Q/A.
 */
export default function Rules() {
  const { tp, lang } = useI18n();
  const router = useRouter();

  const headerTitle = tp('Правила', 'Rules of the road', 'Zasady', {
    es: 'Reglas',
    fr: 'Regles',
    de: 'Regeln',
    it: 'Regole',
  });

  const summary = tp(
    `${ruleScenarios.length} сценариев расхождения`,
    `${ruleScenarios.length} collision scenarios`,
    `${ruleScenarios.length} scenariuszy rozejscia`,
    {
      es: `${ruleScenarios.length} escenarios de colision`,
      fr: `${ruleScenarios.length} scenarios de collision`,
      de: `${ruleScenarios.length} Kollisions-Szenarien`,
      it: `${ruleScenarios.length} scenari di collisione`,
    },
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <Text variant="caption">{summary}</Text>
        </View>

        {ruleScenarios.map((scenario) => {
          const title = legacyPick(scenario, 'title', lang);
          const scene = legacyPick(scenario, 'scene', lang);
          return (
            <Card
              key={scenario.id}
              onPress={() => router.push(`/rules/${scenario.id}`)}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.icon}>{scenario.icon}</Text>
                <View style={styles.cardText}>
                  <Text variant="subtitle">{title}</Text>
                  <Text variant="muted" style={styles.source}>
                    {scenario.source === 'colregs' ? 'COLREGS' : 'RRS'}
                  </Text>
                </View>
              </View>
              <Text variant="caption" style={styles.scene}>{scene}</Text>
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
  intro: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 28,
    marginRight: spacing.md,
    marginTop: 2,
  },
  cardText: {
    flex: 1,
  },
  source: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.textSecondary,
  },
  scene: {
    marginTop: spacing.sm,
    lineHeight: 18,
  },
});
