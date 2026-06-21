import { Stack, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../../src/i18n/context';
import { Card, Screen, Text } from '../../src/design-system/components';
import { quickRefreshLessons } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { colors, radii, spacing } from '../../src/design-system/tokens';

/** Total minutes across the quick-refresh set. Mirrors web QUICK_REFRESH_TOTAL_MINUTES. */
const QUICK_REFRESH_TOTAL_MINUTES = quickRefreshLessons.reduce(
  (sum, l) => sum + l.estMinutes,
  0,
);

/**
 * Quick refresh. 6 short tips for experienced sailors with a regatta
 * tomorrow. Each tip links to its practice route (simulator / courses /
 * checklist / rules / racing / game), mirroring the web, so a refresher
 * is one tap from practice. A footer link drops into the full Bootcamp.
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

  const badge = tp(
    'Быстрое освежение',
    'Quick refresh',
    'Szybkie odswiezenie',
    {
      es: 'Repaso rapido',
      fr: 'Revision rapide',
      de: 'Schnelle Auffrischung',
      it: 'Ripasso rapido',
    },
  );

  const heading = tp(
    `${QUICK_REFRESH_TOTAL_MINUTES} минут перед стартом`,
    `${QUICK_REFRESH_TOTAL_MINUTES} min before start`,
    `${QUICK_REFRESH_TOTAL_MINUTES} minut przed startem`,
    {
      es: `${QUICK_REFRESH_TOTAL_MINUTES} min antes de la salida`,
      fr: `${QUICK_REFRESH_TOTAL_MINUTES} min avant le depart`,
      de: `${QUICK_REFRESH_TOTAL_MINUTES} Min vor dem Start`,
      it: `${QUICK_REFRESH_TOTAL_MINUTES} min prima della partenza`,
    },
  );

  const summary = tp(
    'Для тех у кого опыт уже есть и регата - завтра. 6 ключевых тем без воды.',
    'For experienced sailors with a regatta tomorrow. 6 key topics, no filler.',
    'Dla doswiadczonych zeglarzy, ktorzy maja regate jutro. 6 kluczowych tematow, bez ogolnikow.',
    {
      es: 'Para regatistas con experiencia y regata manana. 6 temas clave, sin relleno.',
      fr: 'Pour les regatiers experimentes avec une regate demain. 6 sujets cles, sans remplissage.',
      de: 'Fur erfahrene Segler mit Regatta morgen. 6 Kernthemen, ohne Fullstoff.',
      it: 'Per regatanti esperti con una regata domani. 6 temi chiave, senza riempitivi.',
    },
  );

  const minLabel = tp('мин', 'min', 'min', {
    es: 'min',
    fr: 'min',
    de: 'Min',
    it: 'min',
  });

  const footerLead = tp(
    'Если хочешь полный маршрут на 45+ минут -',
    'If you want the full 45+ min path -',
    'Jesli chcesz pelna sciezke na 45+ minut -',
    {
      es: 'Si quieres la ruta completa de 45+ min -',
      fr: 'Si tu veux le parcours complet de 45+ min -',
      de: 'Wenn du den vollen Pfad mit 45+ Min willst -',
      it: 'Se vuoi il percorso completo da 45+ min -',
    },
  );

  return (
    <Screen>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{`⚡ ${badge}`}</Text>
          </View>
          <Text variant="title" style={styles.heading}>{heading}</Text>
          <Text variant="caption" style={styles.summary}>{summary}</Text>
        </View>

        {quickRefreshLessons.map((lesson, i) => {
          const title = legacyPick(lesson, 'title', lang);
          const tip = legacyPick(lesson, 'tip', lang);
          return (
            <Pressable
              key={lesson.id}
              onPress={() => router.push(lesson.route as never)}
              accessibilityRole="button"
              accessibilityLabel={`${title}. ${lesson.estMinutes} ${minLabel}. ${tip}`}
            >
              <Card style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.index}>{`#${i + 1}`}</Text>
                  <Text style={styles.emoji}>{lesson.emoji}</Text>
                  <View style={styles.text}>
                    <View style={styles.titleRow}>
                      <Text variant="subtitle" style={styles.title}>{title}</Text>
                      <View style={styles.minPill}>
                        <Text style={styles.minPillText}>{`${lesson.estMinutes} ${minLabel}`}</Text>
                      </View>
                    </View>
                    <Text variant="caption" style={styles.tip}>{tip}</Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => router.push('/bootcamp' as never)}
          accessibilityRole="link"
          accessibilityLabel={`${footerLead} Bootcamp`}
        >
          <Card style={styles.footer}>
            <Text variant="caption" style={styles.footerText}>
              {`${footerLead} `}
              <Text style={styles.footerLink}>Bootcamp</Text>
            </Text>
          </Card>
        </Pressable>
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
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSuccess,
    borderWidth: 1,
    borderColor: colors.borderSuccess,
    marginBottom: spacing.sm,
  },
  badgeText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  heading: {
    fontSize: 26,
    marginBottom: spacing.xs,
  },
  summary: {
    lineHeight: 20,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  index: {
    color: colors.textMuted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    marginRight: spacing.sm,
    marginTop: 6,
    minWidth: 20,
  },
  emoji: {
    fontSize: 28,
    marginRight: spacing.md,
    marginTop: 2,
  },
  text: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  title: {
    marginRight: spacing.sm,
  },
  minPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceSuccess,
  },
  minPillText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '600',
  },
  tip: {
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  footer: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  footerText: {
    textAlign: 'center',
  },
  footerLink: {
    color: colors.accentCyan,
    fontWeight: '600',
  },
});
