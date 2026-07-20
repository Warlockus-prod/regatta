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
// Simulators hub - two-tier learning path plus the 3D boat view, mirroring
// the website tiers exactly (owner feedback, TestFlight 1.5.0: the native
// Basics/Trainer looked nothing like the web). Step 1 "Basics" embeds the web
// /simulator (V1), Step 2 "Trainer" embeds the web /simulator-v3 - both via
// SimWebView, like the 3D boat. The native screens stay as offline fallbacks
// (/simulator-basics and /simulator), offered by SimWebView's failure card.
// ============================================================================

type LocalizedText = { ru: string; en: string; pl: string; es: string; fr: string; de: string; it: string };

interface SimEntry {
  route: '/simulator-v1' | '/simulator-v3' | '/simulator2';
  icon: IconName;
  badge?: LocalizedText;
  accent?: CardAccent;
  title: LocalizedText;
  desc: LocalizedText;
}

const PRIMARY_ENTRIES: SimEntry[] = [
  {
    route: '/simulator-v1',
    icon: 'compass',
    accent: 'cyan',
    badge: {
      ru: 'ШАГ 1',
      en: 'STEP 1',
      pl: 'KROK 1',
      es: 'PASO 1',
      fr: 'ETAPE 1',
      de: 'SCHRITT 1',
      it: 'PASSO 1',
    },
    title: {
      ru: 'Основы',
      en: 'Basics',
      pl: 'Podstawy',
      es: 'Basicos',
      fr: 'Bases',
      de: 'Grundlagen',
      it: 'Basi',
    },
    desc: {
      ru: 'Ветер, повороты и угол к ветру. Начни здесь.',
      en: 'Wind, turns and the angle to the wind. Start here.',
      pl: 'Wiatr, zwroty i kat do wiatru. Zacznij tutaj.',
      es: 'Viento, viradas y el angulo al viento. Empieza aqui.',
      fr: 'Vent, virements et angle au vent. Commence ici.',
      de: 'Wind, Wenden und der Winkel zum Wind. Starte hier.',
      it: 'Vento, virate e angolo al vento. Inizia qui.',
    },
  },
  {
    route: '/simulator-v3',
    icon: 'simulator',
    accent: 'success',
    badge: {
      ru: 'ШАГ 2',
      en: 'STEP 2',
      pl: 'KROK 2',
      es: 'PASO 2',
      fr: 'ETAPE 2',
      de: 'SCHRITT 2',
      it: 'PASSO 2',
    },
    title: {
      ru: 'Тренажёр',
      en: 'Trainer',
      pl: 'Trener',
      es: 'Entrenador',
      fr: 'Entraineur',
      de: 'Trainer',
      it: 'Trainer',
    },
    desc: {
      ru: 'Реальная физика, трим, упражнения и миссии - как на сайте. Офлайн есть упрощённая версия.',
      en: 'Real physics, sail trim, drills and missions - same as the website. A simpler offline version exists.',
      pl: 'Prawdziwa fizyka, trym, cwiczenia i misje - jak na stronie. Offline jest wersja uproszczona.',
      es: 'Fisica real, trimado, ejercicios y misiones - como en la web. Sin conexion hay una version simple.',
      fr: 'Physique reelle, reglage, exercices et missions - comme sur le site. Hors ligne, version simplifiee.',
      de: 'Echte Physik, Trimm, Uebungen und Missionen - wie auf der Website. Offline gibt es eine einfache Version.',
      it: 'Fisica reale, regolazione, esercizi e missioni - come sul sito. Offline esiste una versione semplice.',
    },
  },
];

const SECONDARY_ENTRY: SimEntry = {
  route: '/simulator2',
  icon: 'sail',
  title: {
    ru: 'Лодка 3D',
    en: '3D Boat',
    pl: 'Lodka 3D',
    es: 'Barco 3D',
    fr: 'Bateau 3D',
    de: 'Boot 3D',
    it: 'Barca 3D',
  },
  desc: {
    ru: 'Орбита 360 и паруса вживую. Нужен интернет.',
    en: 'Orbit the boat, live sails. Needs internet.',
    pl: 'Orbita 360 i zagle na zywo. Wymaga internetu.',
    es: 'Orbita 360 y velas en vivo. Requiere internet.',
    fr: 'Orbite 360 et voiles en direct. Internet requis.',
    de: 'Orbit 360 und Segel live. Internet noetig.',
    it: 'Orbita 360 e vele dal vivo. Serve internet.',
  },
};

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

  const renderCard = (e: SimEntry, small: boolean) => {
    const accentColor = e.accent ? ACCENT_COLOR[e.accent] : colors.textSecondary;
    return (
      <Card
        key={e.route}
        accent={e.accent}
        onPress={() => router.push(e.route)}
        style={small ? styles.cardSmall : styles.card}
        accessibilityRole="button"
        accessibilityLabel={pick(e.title, lang)}
      >
        <View style={styles.row}>
          <Icon name={e.icon} size={small ? 22 : 28} color={accentColor} />
          <View style={styles.textCol}>
            <View style={styles.titleRow}>
              <Text
                variant="subtitle"
                style={[styles.title, small && styles.titleSmall]}
              >
                {pick(e.title, lang)}
              </Text>
              {e.badge ? (
                <View style={[styles.badge, { borderColor: accentColor }]}>
                  <Text style={[styles.badgeText, { color: accentColor }]}>
                    {pick(e.badge, lang)}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text variant="muted" style={styles.desc}>
              {pick(e.desc, lang)}
            </Text>
          </View>
          <Text style={[styles.arrow, { color: accentColor }]}>→</Text>
        </View>
      </Card>
    );
  };

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
            'Два шага обучения и 3D-вид лодки.',
            'Two learning steps plus a 3D boat view.',
            'Dwa kroki nauki i widok lodki w 3D.',
            {
              es: 'Dos pasos de aprendizaje y una vista 3D del barco.',
              fr: 'Deux etapes d apprentissage et une vue 3D du bateau.',
              de: 'Zwei Lernschritte und eine 3D-Ansicht des Boots.',
              it: 'Due passi di apprendimento e una vista 3D della barca.',
            },
          )}
        </Text>

        {PRIMARY_ENTRIES.map((e) => renderCard(e, false))}

        {renderCard(SECONDARY_ENTRY, true)}
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
  cardSmall: {
    padding: 12,
    opacity: 0.92,
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
  titleSmall: {
    fontSize: 15,
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
