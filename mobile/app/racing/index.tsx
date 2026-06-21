import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../../src/i18n/context';
import {
  Card,
  RacingConceptDiagram,
  RacingCourseDiagram,
  RacingStrategyDiagram,
  Screen,
  Text,
} from '../../src/design-system/components';
import { racingRules, racingStrategies } from '../../src/data';
import { legacyPick, pickLocalized, type Lang } from '../../src/i18n/languages';
import { colors, spacing } from '../../src/design-system/tokens';

/**
 * "Key Concepts" cards. Mirrors the keyConcepts array defined inline on the
 * web `/racing` page (src/app/racing/page.tsx). Each concept has a short
 * explainer and a small native SVG diagram. All 7 languages.
 */
interface KeyConcept {
  id: string;
  title: Record<Lang, string>;
  description: Record<Lang, string>;
}

const keyConcepts: KeyConcept[] = [
  {
    id: 'layline',
    title: {
      ru: 'Лейлайн',
      en: 'Layline',
      pl: 'Layline (linia dojscia)',
      es: 'Layline',
      fr: 'Layline',
      de: 'Layline',
      it: 'Layline',
    },
    description: {
      ru: 'Оптимальный курс, при котором яхта может достичь знака одним галсом без дополнительных поворотов. Пересечение лейлайна означает лишние повороты.',
      en: 'Optimal course allowing the boat to reach the mark on one tack without extra turns. Crossing the layline means extra tacks.',
      pl: 'Optymalny kurs, przy ktorym jacht moze osiagnac znak jednym halsem bez dodatkowych zwrotow. Przekroczenie layline oznacza zbedne zwroty.',
      es: 'Rumbo optimo que permite al barco alcanzar la boya en una sola amura sin virajes extra. Pasar la layline significa virajes innecesarios.',
      fr: "Cap optimal permettant au voilier d'atteindre la bouee sur une seule amure sans virements supplementaires. Depasser la layline implique des virements en trop.",
      de: 'Optimaler Kurs, auf dem das Boot die Tonne in einem Schlag ohne zusaetzliche Wenden erreicht. Das Ueberschreiten der Layline bedeutet unnoetige Wenden.',
      it: 'Rotta ottimale che permette alla barca di raggiungere la boa in una sola mure senza virate aggiuntive. Superare la layline significa virate in piu.',
    },
  },
  {
    id: 'vmg',
    title: {
      ru: 'VMG (Velocity Made Good)',
      en: 'VMG (Velocity Made Good)',
      pl: 'VMG (Velocity Made Good)',
      es: 'VMG (Velocity Made Good)',
      fr: 'VMG (Velocity Made Good)',
      de: 'VMG (Velocity Made Good)',
      it: 'VMG (Velocity Made Good)',
    },
    description: {
      ru: 'Проекция скорости яхты на направление к цели. Даже если бакштаг быстрее фордевинда, VMG показывает реальное приближение к нижнему знаку.',
      en: 'The projection of boat speed onto the direction toward the target. Even if a broad reach is faster than a dead run, VMG shows the real rate of approach to the leeward mark.',
      pl: 'Projekcja predkosci jachtu na kierunek do celu. Nawet jesli baksztag jest szybszy od fordewindu, VMG pokazuje rzeczywiste zblizanie do znaku zawietrznego.',
      es: 'Proyeccion de la velocidad del barco sobre la direccion hacia el objetivo. Aunque el largo sea mas rapido que la popa pura, el VMG muestra el acercamiento real a la boya de sotavento.',
      fr: 'Projection de la vitesse du voilier sur la direction de la cible. Meme si le grand largue est plus rapide que le vent arriere, le VMG montre le rapprochement reel vers la bouee sous le vent.',
      de: 'Projektion der Bootsgeschwindigkeit auf die Richtung zum Ziel. Selbst wenn Raumwind schneller ist als vor dem Wind, zeigt VMG die echte Annaeherung an die Leetonne.',
      it: "Proiezione della velocita della barca sulla direzione verso l'obiettivo. Anche se il lasco e piu veloce del fil di ruota, il VMG mostra l'avvicinamento reale alla boa sottovento.",
    },
  },
  {
    id: 'clear-air',
    title: {
      ru: 'Свободная вода',
      en: 'Clear Air',
      pl: 'Czyste powietrze',
      es: 'Aire limpio',
      fr: 'Air libre',
      de: 'Freier Wind',
      it: 'Aria libera',
    },
    description: {
      ru: 'Чистый, ненарушенный воздушный поток. Яхта в ветровой тени другой получает турбулентный и ослабленный ветер, теряя скорость.',
      en: "Clean, undisturbed wind flow. A boat in another boat's wind shadow gets turbulent and weakened wind, losing speed.",
      pl: 'Czysty, niezaklocony przeplyw powietrza. Jacht w cieniu wiatru innego otrzymuje turbulentny i oslabiony wiatr, tracac predkosc.',
      es: 'Flujo de aire limpio y no perturbado. Un barco en la sombra de viento de otro recibe viento turbulento y debilitado, perdiendo velocidad.',
      fr: "Flux d'air propre et non perturbe. Un voilier dans l'ombre de vent d'un autre recoit un vent turbulent et affaibli, perdant de la vitesse.",
      de: 'Sauberer, ungestoerter Windfluss. Ein Boot im Windschatten eines anderen bekommt turbulenten und abgeschwaechten Wind und verliert Geschwindigkeit.',
      it: "Flusso di vento pulito e non disturbato. Una barca nell'ombra di vento di un'altra riceve vento turbolento e indebolito, perdendo velocita.",
    },
  },
  {
    id: 'wind-shadow',
    title: {
      ru: 'Ветровая тень',
      en: 'Wind Shadow',
      pl: 'Cien wiatru',
      es: 'Sombra de viento',
      fr: 'Ombre de vent',
      de: 'Windschatten',
      it: 'Ombra di vento',
    },
    description: {
      ru: 'Зона за яхтой (по ветру), где воздушный поток ослаблен и турбулентен. Может распространяться на 3-7 корпусов позади.',
      en: 'Zone behind a boat (downwind) where airflow is weakened and turbulent. Can extend 3-7 boat-lengths behind.',
      pl: 'Strefa za jachtem (z wiatrem), gdzie przeplyw powietrza jest oslabiony i turbulentny. Moze sie rozciagac 3-7 dlugosci kadluba za jachtem.',
      es: 'Zona detras de un barco (sotavento) donde el flujo de aire esta debilitado y es turbulento. Puede extenderse 3-7 esloras hacia atras.',
      fr: "Zone derriere un voilier (sous le vent) ou le flux d'air est affaibli et turbulent. Peut s'etendre sur 3-7 longueurs de coque en arriere.",
      de: 'Bereich hinter einem Boot (in Lee), in dem der Luftstrom abgeschwaecht und turbulent ist. Kann sich 3-7 Bootslaengen nach hinten erstrecken.',
      it: "Zona dietro la barca (sottovento) dove il flusso d'aria e indebolito e turbolento. Puo estendersi per 3-7 lunghezze di scafo dietro.",
    },
  },
];

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

  const conceptsLabel = tp('Ключевые понятия', 'Key concepts', 'Kluczowe pojecia', {
    es: 'Conceptos clave',
    fr: 'Notions cles',
    de: 'Schluesselbegriffe',
    it: 'Concetti chiave',
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

        <Text variant="muted" style={[styles.sectionLabel, styles.sectionLabelGap]}>
          {conceptsLabel.toUpperCase()}
        </Text>
        {keyConcepts.map((concept) => {
          const title = concept.title[lang] ?? concept.title.en;
          const description = concept.description[lang] ?? concept.description.en;
          return (
            <Card
              key={concept.id}
              style={styles.card}
              accessibilityRole="text"
              accessibilityLabel={`${title}. ${description}`}
            >
              <Text variant="subtitle">{title}</Text>
              <Text variant="body" style={styles.conceptDesc}>{description}</Text>
              <RacingConceptDiagram conceptId={concept.id} />
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
  conceptDesc: {
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
