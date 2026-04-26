import { Stack, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../src/i18n/context';
import { Card, ListRow, Screen, Text } from '../src/design-system/components';
import { colors, spacing } from '../src/design-system/tokens';

/**
 * Home v1. Layout mirrors the web home:
 *  - Brand + tagline header (no native header chrome)
 *  - "Where to start" - three primary Cards (Bootcamp / Quick / Rules)
 *  - "Reference" - secondary ListRows (Anatomy / Onboard / Glossary / Courses / Racing)
 *  - "Tools" - Simulator / Multiplayer / Leaderboard
 *  - "More" - Gallery / Settings
 *
 * Card vs ListRow: primary CTAs use the heavier Card; secondary navigation
 * uses ListRow for visual hierarchy.
 *
 * All routes link to PlaceholderScreen until ADR-0003 lands content sync,
 * Phase 2 lands the simulator, Phase 3 lands the online layer, and Phase 4
 * lands multiplayer.
 */
export default function Home() {
  const { tp } = useI18n();
  const router = useRouter();

  const tagline = tp(
    'Учебник парусного спорта',
    'Sailing tutor',
    'Trener zeglarstwa',
    {
      es: 'Tutor de vela',
      fr: 'Tuteur de voile',
      de: 'Segel-Tutor',
      it: 'Tutor di vela',
    },
  );

  const startSection = tp('С чего начать', 'Where to start', 'Od czego zaczac', {
    es: 'Donde empezar',
    fr: 'Par ou commencer',
    de: 'Wo anfangen',
    it: 'Da dove iniziare',
  });
  const refSection = tp('Справочник', 'Reference', 'Spis', {
    es: 'Referencia',
    fr: 'Reference',
    de: 'Referenz',
    it: 'Riferimento',
  });
  const toolsSection = tp('Инструменты', 'Tools', 'Narzedzia', {
    es: 'Herramientas',
    fr: 'Outils',
    de: 'Werkzeuge',
    it: 'Strumenti',
  });
  const moreSection = tp('Ещё', 'More', 'Wiecej', {
    es: 'Mas',
    fr: 'Plus',
    de: 'Mehr',
    it: 'Altro',
  });

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.brand}>Regatta</Text>
          <Text variant="caption" style={styles.tagline}>{tagline}</Text>
        </View>

        <Text variant="muted" style={styles.sectionLabel}>
          {startSection.toUpperCase()}
        </Text>

        <Card onPress={() => router.push('/bootcamp')} style={styles.card}>
          <Text variant="subtitle">Bootcamp</Text>
          <Text variant="caption" style={styles.cardDesc}>
            {tp(
              '8 уроков по основам',
              '8 fundamentals lessons',
              '8 lekcji podstaw',
              {
                es: '8 lecciones basicas',
                fr: '8 lecons fondamentales',
                de: '8 Grundlagen-Lektionen',
                it: '8 lezioni di base',
              },
            )}
          </Text>
        </Card>

        <Card onPress={() => router.push('/quick')} style={styles.card}>
          <Text variant="subtitle">
            {tp('Быстрый разогрев', 'Quick refresh', 'Szybkie powtorzenie', {
              es: 'Repaso rapido',
              fr: 'Revision rapide',
              de: 'Schnelle Auffrischung',
              it: 'Ripasso rapido',
            })}
          </Text>
          <Text variant="caption" style={styles.cardDesc}>
            {tp(
              '6 уроков для опытных',
              '6 lessons for experienced sailors',
              '6 lekcji dla doswiadczonych',
              {
                es: '6 lecciones para experimentados',
                fr: '6 lecons pour confirmes',
                de: '6 Lektionen fuer Erfahrene',
                it: '6 lezioni per esperti',
              },
            )}
          </Text>
        </Card>

        <Card onPress={() => router.push('/rules')} style={styles.card}>
          <Text variant="subtitle">
            {tp('Правила', 'Rules of the road', 'Zasady', {
              es: 'Reglas',
              fr: 'Regles',
              de: 'Regeln',
              it: 'Regole',
            })}
          </Text>
          <Text variant="caption" style={styles.cardDesc}>
            {tp(
              '8 сценариев расхождения',
              '8 collision scenarios',
              '8 scenariuszy rozejscia',
              {
                es: '8 escenarios de colision',
                fr: '8 scenarios de collision',
                de: '8 Kollisions-Szenarien',
                it: '8 scenari di collisione',
              },
            )}
          </Text>
        </Card>

        <Text variant="muted" style={[styles.sectionLabel, styles.sectionLabelGap]}>
          {refSection.toUpperCase()}
        </Text>
        <View style={styles.list}>
          <ListRow
            title={tp('Анатомия яхты', 'Yacht anatomy', 'Anatomia jachtu', {
              es: 'Anatomia del yate',
              fr: 'Anatomie du yacht',
              de: 'Yacht-Anatomie',
              it: 'Anatomia dello yacht',
            })}
            onPress={() => router.push('/anatomy')}
          />
          <ListRow
            title={tp('На борту', 'On board', 'Na pokladzie', {
              es: 'A bordo',
              fr: 'A bord',
              de: 'An Bord',
              it: 'A bordo',
            })}
            onPress={() => router.push('/onboard')}
          />
          <ListRow
            title={tp('Глоссарий', 'Glossary', 'Glosariusz', {
              es: 'Glosario',
              fr: 'Glossaire',
              de: 'Glossar',
              it: 'Glossario',
            })}
            onPress={() => router.push('/glossary')}
          />
          <ListRow
            title={tp('Курсы относительно ветра', 'Points of sail', 'Kursy', {
              es: 'Rumbos',
              fr: 'Allures',
              de: 'Kurse zum Wind',
              it: 'Andature',
            })}
            onPress={() => router.push('/courses')}
          />
          <ListRow
            title={tp('Тактика гонок', 'Racing tactics', 'Taktyka wyscigow', {
              es: 'Tactica de regata',
              fr: 'Tactique de regate',
              de: 'Regatta-Taktik',
              it: 'Tattica di regata',
            })}
            onPress={() => router.push('/racing')}
            noBorder
          />
        </View>

        <Text variant="muted" style={[styles.sectionLabel, styles.sectionLabelGap]}>
          {toolsSection.toUpperCase()}
        </Text>
        <View style={styles.list}>
          <ListRow
            title={tp('Симулятор', 'Simulator', 'Symulator', {
              es: 'Simulador',
              fr: 'Simulateur',
              de: 'Simulator',
              it: 'Simulatore',
            })}
            onPress={() => router.push('/simulator')}
          />
          <ListRow
            title={tp('Мультиплеер', 'Multiplayer', 'Multiplayer', {
              es: 'Multijugador',
              fr: 'Multijoueur',
              de: 'Mehrspieler',
              it: 'Multigiocatore',
            })}
            onPress={() => router.push('/multiplayer')}
          />
          <ListRow
            title={tp('Таблица лидеров', 'Leaderboard', 'Tabela liderow', {
              es: 'Clasificacion',
              fr: 'Classement',
              de: 'Bestenliste',
              it: 'Classifica',
            })}
            onPress={() => router.push('/leaderboard')}
            noBorder
          />
        </View>

        <Text variant="muted" style={[styles.sectionLabel, styles.sectionLabelGap]}>
          {moreSection.toUpperCase()}
        </Text>
        <View style={styles.list}>
          <ListRow
            title={tp('Галерея', 'Gallery', 'Galeria', {
              es: 'Galeria',
              fr: 'Galerie',
              de: 'Galerie',
              it: 'Galleria',
            })}
            onPress={() => router.push('/gallery')}
          />
          <ListRow
            title={tp('Настройки', 'Settings', 'Ustawienia', {
              es: 'Ajustes',
              fr: 'Reglages',
              de: 'Einstellungen',
              it: 'Impostazioni',
            })}
            onPress={() => router.push('/settings')}
            noBorder
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  brand: {
    color: colors.accentCyan,
    fontSize: 40,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tagline: {
    marginTop: spacing.xs,
    textAlign: 'center',
    fontSize: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  sectionLabelGap: {
    marginTop: spacing.xl,
  },
  card: {
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
  },
  cardDesc: {
    marginTop: spacing.xs,
  },
  list: {
    backgroundColor: colors.bgCard,
    borderColor: 'rgba(0, 212, 255, 0.10)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
});
