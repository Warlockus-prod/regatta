import { Stack, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../../src/i18n/context';
import { Card, Screen, Text } from '../../src/design-system/components';
import { quickRefreshLessons } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { spacing } from '../../src/design-system/tokens';

/**
 * Quick refresh. 6 short tips (30 sec each) for experienced sailors. Each tip
 * links to its practice route (simulator / courses / checklist / rules /
 * racing / game), mirroring the web, so a refresher is one tap from practice.
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
            <Pressable
              key={lesson.id}
              onPress={() => router.push(lesson.route as never)}
              accessibilityRole="button"
              accessibilityLabel={`${title}. ${tip}`}
            >
              <Card style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.emoji}>{lesson.emoji}</Text>
                  <View style={styles.text}>
                    <Text variant="subtitle">{title}</Text>
                    <Text variant="caption" style={styles.tip}>{tip}</Text>
                  </View>
                </View>
              </Card>
            </Pressable>
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
