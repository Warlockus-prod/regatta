import { Stack, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../src/i18n/context';
import {
  Card,
  type CardAccent,
  ListRow,
  Screen,
  Text,
} from '../src/design-system/components';
import { colors, spacing } from '../src/design-system/tokens';

const ACCENT_COLOR: Record<CardAccent, string> = {
  cyan: colors.accentCyan,
  success: colors.success,
  warning: colors.warning,
};

/**
 * Home v2. Mirrors the web home (`src/app/page.tsx`):
 *  - Brand wordmark stack header (mobile-only, web uses a top nav strip)
 *  - "Where to start" - three primary tinted Cards (Bootcamp / Quick / Rules)
 *    with per-card accent (cyan / green / orange) matching the web signature
 *  - Reference / Tools / More - secondary ListRows for visual hierarchy
 *
 * The per-card tinted background is the deliberate brand signature (web
 * uses 8% bg + 30% border on each entry card). Mobile inherits that.
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

  const ctaStart = tp('Начать', 'Start', 'Start', {
    es: 'Iniciar',
    fr: 'Commencer',
    de: 'Starten',
    it: 'Inizia',
  });

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.brandLead}>Week to</Text>
          <Text style={styles.brand}>Regatta</Text>
          <Text variant="caption" style={styles.tagline}>{tagline}</Text>
        </View>

        <Text variant="muted" style={styles.sectionLabel}>
          {startSection.toUpperCase()}
        </Text>

        <EntryCard
          accent="cyan"
          emoji="🎓"
          title="Bootcamp"
          subtitle={tp('С нуля', 'Start from zero', 'Od zera', {
            es: 'Desde cero',
            fr: 'Depuis zero',
            de: 'Von null',
            it: 'Da zero',
          })}
          description={tp(
            '8 уроков по основам парусного спорта - примерно 50 минут от ветра до правил.',
            '8 fundamentals lessons - around 50 min from wind to rules.',
            '8 lekcji podstaw - okolo 50 min od wiatru do zasad.',
            {
              es: '8 lecciones basicas - unos 50 min, del viento a las reglas.',
              fr: '8 lecons fondamentales - environ 50 min, du vent aux regles.',
              de: '8 Grundlagen-Lektionen - rund 50 min, vom Wind bis zu den Regeln.',
              it: '8 lezioni di base - circa 50 min, dal vento alle regole.',
            },
          )}
          ctaLabel={ctaStart}
          onPress={() => router.push('/bootcamp')}
        />

        <EntryCard
          accent="success"
          emoji="⚡"
          title={tp('Быстрый разогрев', 'Quick refresh', 'Szybkie powtorzenie', {
            es: 'Repaso rapido',
            fr: 'Revision rapide',
            de: 'Schnelle Auffrischung',
            it: 'Ripasso rapido',
          })}
          subtitle={tp('Для опытных', 'For experienced', 'Dla doswiadczonych', {
            es: 'Para experimentados',
            fr: 'Pour confirmes',
            de: 'Fuer Erfahrene',
            it: 'Per esperti',
          })}
          description={tp(
            '6 коротких уроков для тех, кто уже ходил под парусом - быстро освежить ключевое.',
            '6 short lessons for sailors who already know the ropes - refresh the essentials.',
            '6 krotkich lekcji dla tych, ktorzy juz zeglowali - odswiez kluczowe.',
            {
              es: '6 lecciones cortas para quien ya ha navegado - lo esencial al dia.',
              fr: '6 lecons courtes pour ceux qui ont deja navigue - rafraichir les bases.',
              de: '6 kurze Lektionen fuer wer schon gesegelt ist - Wesentliches auffrischen.',
              it: '6 lezioni brevi per chi ha gia navigato - rinfrescare lessenziale.',
            },
          )}
          ctaLabel={ctaStart}
          onPress={() => router.push('/quick')}
        />

        <EntryCard
          accent="warning"
          emoji="📖"
          title={tp('Правила', 'Rules of the road', 'Zasady', {
            es: 'Reglas',
            fr: 'Regles',
            de: 'Regeln',
            it: 'Regole',
          })}
          subtitle={tp('RRS + COLREGS', 'RRS + COLREGS', 'RRS + COLREGS', {
            es: 'RRS + COLREGS',
            fr: 'RRS + COLREGS',
            de: 'RRS + COLREGS',
            it: 'RRS + COLREGS',
          })}
          description={tp(
            '8 сценариев расхождения с другими судами - кто кому уступает и почему.',
            '8 collision scenarios - who gives way and why.',
            '8 scenariuszy rozejscia - kto ustepuje i dlaczego.',
            {
              es: '8 escenarios de colision - quien cede paso y por que.',
              fr: '8 scenarios de collision - qui cede le passage et pourquoi.',
              de: '8 Kollisions-Szenarien - wer ausweicht und warum.',
              it: '8 scenari di collisione - chi cede e perche.',
            },
          )}
          ctaLabel={ctaStart}
          onPress={() => router.push('/rules')}
        />

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

interface EntryCardProps {
  accent: CardAccent;
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
  ctaLabel: string;
  onPress: () => void;
}

function EntryCard({
  accent,
  emoji,
  title,
  subtitle,
  description,
  ctaLabel,
  onPress,
}: EntryCardProps) {
  const accentColor = ACCENT_COLOR[accent];
  return (
    <Card accent={accent} onPress={onPress} style={styles.entryCard}>
      <Text style={styles.entryEmoji}>{emoji}</Text>
      <View>
        <Text variant="subtitle" style={styles.entryTitle}>{title}</Text>
        <Text variant="muted" style={styles.entrySubtitle}>{subtitle}</Text>
      </View>
      <Text variant="caption" style={styles.entryDescription}>
        {description}
      </Text>
      <View style={styles.entryCta}>
        <Text style={[styles.entryCtaLabel, { color: accentColor }]}>
          {ctaLabel}
        </Text>
        <Text style={[styles.entryCtaArrow, { color: accentColor }]}>→</Text>
      </View>
    </Card>
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
  brandLead: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 0.4,
    marginBottom: 2,
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
  entryCard: {
    marginBottom: spacing.md,
    marginHorizontal: spacing.lg,
    gap: spacing.md,
  },
  entryEmoji: {
    fontSize: 32,
    lineHeight: 38,
  },
  entryTitle: {
    fontSize: 18,
    marginBottom: 2,
  },
  entrySubtitle: {
    fontSize: 12,
  },
  entryDescription: {
    fontSize: 13,
    lineHeight: 19,
  },
  entryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  entryCtaLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  entryCtaArrow: {
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    backgroundColor: colors.bgCard,
    borderColor: 'rgba(0, 212, 255, 0.10)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
});
