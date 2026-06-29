import { Stack, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Card,
  Icon,
  Screen,
  Text,
  type CardAccent,
  type IconName,
} from '../../src/design-system/components';
import { useI18n } from '../../src/i18n/context';
import { colors } from '../../src/design-system/tokens';
import type { Lang } from '../../src/i18n/languages';

// ============================================================================
// Simulators hub - one entry point for all three simulators, mirroring the
// web V1 / V2 / V3 switcher. V1 is the native Skia trainer; V2 (3D) and V3 run
// the web modules in a WebView for byte-identical parity with the website.
// ============================================================================

type LocalizedText = { ru: string; en: string; pl: string; es: string; fr: string; de: string; it: string };

interface SimEntry {
  route: '/simulator' | '/simulator2' | '/simulator-v3';
  icon: IconName;
  badge: string;
  accent?: CardAccent;
  title: LocalizedText;
  desc: LocalizedText;
}

const ENTRIES: SimEntry[] = [
  {
    route: '/simulator2',
    icon: 'sail',
    badge: '3D',
    accent: 'cyan',
    title: {
      ru: '3D Симулятор',
      en: '3D Simulator',
      pl: 'Symulator 3D',
      es: 'Simulador 3D',
      fr: 'Simulateur 3D',
      de: '3D-Simulator',
      it: 'Simulatore 3D',
    },
    desc: {
      ru: 'Лодка и паруса в 3D. Орбита 360, трим парусов вживую.',
      en: 'Boat and sails in 3D. Orbit 360, live sail trim.',
      pl: 'Lodka i zagle w 3D. Orbita 360, trym zagli na zywo.',
      es: 'Barco y velas en 3D. Orbita 360, trimado en vivo.',
      fr: 'Bateau et voiles en 3D. Orbite 360, reglage en direct.',
      de: 'Boot und Segel in 3D. Orbit 360, Live-Trimm.',
      it: 'Barca e vele in 3D. Orbita 360, regolazione dal vivo.',
    },
  },
  {
    route: '/simulator',
    icon: 'simulator',
    badge: 'V1',
    title: {
      ru: 'Симулятор',
      en: 'Simulator',
      pl: 'Symulator',
      es: 'Simulador',
      fr: 'Simulateur',
      de: 'Simulator',
      it: 'Simulatore',
    },
    desc: {
      ru: 'Классический тренажёр трима и гонок.',
      en: 'Classic trim and racing trainer.',
      pl: 'Klasyczny trener trymu i wyscigow.',
      es: 'Entrenador clasico de trimado y regatas.',
      fr: 'Entraineur classique de reglage et de course.',
      de: 'Klassischer Trimm- und Renntrainer.',
      it: 'Allenatore classico di regolazione e regate.',
    },
  },
  {
    route: '/simulator-v3',
    icon: 'vmg',
    badge: 'V3',
    accent: 'success',
    title: {
      ru: 'Симулятор V3',
      en: 'Simulator V3',
      pl: 'Symulator V3',
      es: 'Simulador V3',
      fr: 'Simulateur V3',
      de: 'Simulator V3',
      it: 'Simulatore V3',
    },
    desc: {
      ru: 'Новый движок физики. Бета.',
      en: 'New physics engine. Beta.',
      pl: 'Nowy silnik fizyki. Beta.',
      es: 'Nuevo motor de fisica. Beta.',
      fr: 'Nouveau moteur physique. Beta.',
      de: 'Neue Physik-Engine. Beta.',
      it: 'Nuovo motore fisico. Beta.',
    },
  },
];

const ACCENT_COLOR: Record<CardAccent, string> = {
  cyan: colors.accentCyan,
  success: colors.success,
  warning: colors.warning,
};

function pick(text: LocalizedText, lang: Lang): string {
  return text[lang] ?? text.en;
}

export default function SimulatorsHub() {
  const { lang, tp } = useI18n();
  const router = useRouter();

  return (
    <Screen noBottomInset>
      <Stack.Screen
        options={{
          title: tp('Симуляторы', 'Simulators', 'Symulatory', {
            es: 'Simuladores',
            fr: 'Simulateurs',
            de: 'Simulatoren',
            it: 'Simulatori',
          }),
        }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="muted" style={styles.intro}>
          {tp(
            'Три версии тренажёра. Попробуйте каждую.',
            'Three versions of the trainer. Try each one.',
            'Trzy wersje trenera. Wyprobuj kazda.',
            {
              es: 'Tres versiones del entrenador. Prueba cada una.',
              fr: 'Trois versions de l\'entraineur. Essayez chacune.',
              de: 'Drei Versionen des Trainers. Probiere jede aus.',
              it: 'Tre versioni dell\'allenatore. Prova ognuna.',
            },
          )}
        </Text>

        {ENTRIES.map((e) => {
          const accentColor = e.accent ? ACCENT_COLOR[e.accent] : colors.textSecondary;
          return (
            <Card
              key={e.route}
              accent={e.accent}
              onPress={() => router.push(e.route)}
              style={styles.card}
              accessibilityRole="button"
              accessibilityLabel={pick(e.title, lang)}
            >
              <View style={styles.row}>
                <Icon name={e.icon} size={28} color={accentColor} />
                <View style={styles.textCol}>
                  <View style={styles.titleRow}>
                    <Text variant="subtitle" style={styles.title}>
                      {pick(e.title, lang)}
                    </Text>
                    <View style={[styles.badge, { borderColor: accentColor }]}>
                      <Text style={[styles.badgeText, { color: accentColor }]}>
                        {e.badge}
                      </Text>
                    </View>
                  </View>
                  <Text variant="muted" style={styles.desc}>
                    {pick(e.desc, lang)}
                  </Text>
                </View>
                <Text style={[styles.arrow, { color: accentColor }]}>→</Text>
              </View>
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  intro: {
    marginBottom: 4,
  },
  card: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  textCol: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flexShrink: 1,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  desc: {
    lineHeight: 19,
  },
  arrow: {
    fontSize: 20,
    fontWeight: '600',
  },
});
