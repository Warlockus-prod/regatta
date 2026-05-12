import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../../src/i18n/context';
import { Card, Screen, Text } from '../../src/design-system/components';
import { quickRefreshLessons } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { spacing } from '../../src/design-system/tokens';

/**
 * Quick refresh. 6 short tips (30 sec each) for experienced sailors.
 * Non-tappable Cards because each tip is a single-line refresher; the
 * deeper "open the practice route" affordance lives on Bootcamp lesson
 * detail, not here.
 */
export default function Quick() {
  const { tp, lang } = useI18n();

  const headerTitle = tp(
    'Быстрый разогрев',
    'Quick refresh',
    'Szybkie powtorzenie',
    {
      es: 'Repaso rapido',
      fr: 'Revision rapide',
      de: 'Schnelle Auffrischung',
      it: 'Ripasso rapido',
    },
  );

  const summary = tp(
    `${quickRefreshLessons.length} быстрых тиков для опытных`,
    `${quickRefreshLessons.length} quick tips for experienced sailors`,
    `${quickRefreshLessons.length} szybkich wskazowek`,
    {
      es: `${quickRefreshLessons.length} consejos rapidos`,
      fr: `${quickRefreshLessons.length} astuces rapides`,
      de: `${quickRefreshLessons.length} schnelle Tipps`,
      it: `${quickRefreshLessons.length} consigli rapidi`,
    },
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <Text variant="caption">{summary}</Text>
        </View>

        {quickRefreshLessons.map((lesson) => {
          const title = legacyPick(lesson, 'title', lang);
          const tip = legacyPick(lesson, 'tip', lang);
          return (
            <Card
              key={lesson.id}
              style={styles.card}
              accessibilityRole="text"
              accessibilityLabel={`${title}. ${tip}`}
            >
              <View style={styles.row}>
                <Text style={styles.emoji}>{lesson.emoji}</Text>
                <View style={styles.text}>
                  <Text variant="subtitle">{title}</Text>
                  <Text variant="caption" style={styles.tip}>{tip}</Text>
                </View>
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
  intro: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  emoji: {
    fontSize: 28,
    marginRight: spacing.md,
    marginTop: 2,
  },
  text: {
    flex: 1,
  },
  tip: {
    marginTop: spacing.xs,
    lineHeight: 18,
  },
});
