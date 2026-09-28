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
      pl: 'Layline (linia dojścia)',
      es: 'Layline',
      fr: 'Layline',
      de: 'Layline',
      it: 'Layline',
    },
    description: {
      ru: 'Оптимальный курс, при котором яхта может достичь знака одним галсом без дополнительных поворотов. Если перейти лейлайн, пройдёшь лишнее расстояние и потеряешь время.',
      en: 'Optimal course allowing the boat to reach the mark on one tack without extra turns. Overstanding the layline costs extra distance and time.',
      pl: 'Optymalny kurs, którym jacht dotrze do znaku na jednym halsie, bez dodatkowych zwrotów. Przekroczenie layline oznacza dodatkowy dystans i stratę czasu.',
      es: 'Rumbo óptimo con el que el barco llega a la baliza en un solo bordo, sin virajes extra. Pasarse de la layline supone recorrer más distancia y perder tiempo.',
      fr: "Route optimale qui permet au voilier d'atteindre la bouée en un seul bord, sans virement supplémentaire. Dépasser la layline, c'est de la distance en plus et du temps perdu.",
      de: 'Optimaler Kurs, auf dem das Boot die Bahnmarke mit einem Schlag ohne zusätzliche Wenden erreicht. Wer die Layline überschießt, segelt zusätzliche Strecke und verliert Zeit.',
      it: 'Rotta ottimale che permette alla barca di raggiungere la boa con un solo bordo, senza virate in più. Superare la layline significa percorrere più strada e perdere tempo.',
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
      pl: 'Rzut prędkości jachtu na kierunek do celu. Nawet jeśli baksztag jest szybszy od fordewindu, VMG pokazuje, jak naprawdę zbliżasz się do znaku zawietrznego.',
      es: 'Proyección de la velocidad del barco sobre la dirección hacia el objetivo. Aunque el largo sea más rápido que la popa, el VMG muestra cuánto te acercas realmente a la baliza de sotavento.',
      fr: "Projection de la vitesse du voilier sur la direction de l'objectif. Même si le grand largue est plus rapide que le vent arrière, le VMG montre à quelle vitesse tu te rapproches vraiment de la bouée sous le vent.",
      de: 'Projektion der Bootsgeschwindigkeit auf die Richtung zum Ziel. Auch wenn raumer Wind schneller ist als vor dem Wind, zeigt VMG, wie schnell du dich der Leetonne wirklich näherst.',
      it: "Proiezione della velocità della barca sulla direzione dell'obiettivo. Anche se al lasco si va più veloci che in poppa piena, il VMG mostra quanto ti avvicini davvero alla boa di poppa.",
    },
  },
  {
    id: 'clear-air',
    title: {
      ru: 'Чистый ветер',
      en: 'Clear Air',
      pl: 'Czysty wiatr',
      es: 'Aire limpio',
      fr: 'Vent propre',
      de: 'Freier Wind',
      it: 'Aria libera',
    },
    description: {
      ru: 'Чистый, ненарушенный воздушный поток. Яхта в ветровой тени другой получает турбулентный и ослабленный ветер, теряя скорость.',
      en: "Clean, undisturbed wind flow. A boat in another boat's wind shadow gets turbulent and weakened wind, losing speed.",
      pl: 'Czysty, niezaburzony przepływ powietrza. Jacht w cieniu wiatrowym innego jachtu dostaje turbulentny, osłabiony wiatr i traci prędkość.',
      es: 'Flujo de aire limpio, sin perturbar. Un barco en la sombra de viento de otro recibe viento turbulento y más débil, y pierde velocidad.',
      fr: "Flux d'air propre, non perturbé. Un voilier dans le dévent d'un autre reçoit un vent turbulent et affaibli, et perd de la vitesse.",
      de: 'Sauberer, ungestörter Wind. Ein Boot im Windschatten eines anderen bekommt verwirbelten, schwächeren Wind und verliert Fahrt.',
      it: "Flusso d'aria pulito e indisturbato. Una barca nell'ombra di vento di un'altra riceve vento turbolento e più debole, e perde velocità.",
    },
  },
  {
    id: 'wind-shadow',
    title: {
      ru: 'Ветровая тень',
      en: 'Wind Shadow',
      pl: 'Cień wiatrowy',
      es: 'Sombra de viento',
      fr: 'Dévent',
      de: 'Windschatten',
      it: 'Ombra di vento',
    },
    description: {
      ru: 'Зона за яхтой (по ветру), где воздушный поток ослаблен и турбулентен. Может распространяться на 3-7 корпусов позади.',
      en: 'Zone behind a boat (downwind) where airflow is weakened and turbulent. Can extend 3-7 boat-lengths behind.',
      pl: 'Strefa za jachtem (po stronie zawietrznej), w której przepływ powietrza jest osłabiony i turbulentny. Może sięgać 3-7 długości kadłuba za jachtem.',
      es: 'Zona detrás de un barco (a sotavento) donde el flujo de aire es más débil y turbulento. Puede extenderse 3-7 esloras hacia atrás.',
      fr: "Zone derrière un voilier (sous le vent) où le flux d'air est affaibli et turbulent. Elle peut s'étendre sur 3-7 longueurs de coque en arrière.",
      de: 'Bereich hinter einem Boot (in Lee), in dem der Wind schwächer und verwirbelt ist. Er kann 3-7 Bootslängen nach hinten reichen.',
      it: "Zona dietro la barca (sottovento) dove il flusso d'aria è indebolito e turbolento. Può estendersi per 3-7 lunghezze di scafo.",
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
    'Taktyka regatowa',
    {
      es: 'Táctica de regata',
      fr: 'Tactique de régate',
      de: 'Regattataktik',
      it: 'Tattica di regata',
    },
  );

  const rulesLabel = tp('Правила преимущества', 'Right of way', 'Prawo drogi', {
    es: 'Derecho de paso',
    fr: 'Priorité',
    de: 'Wegerecht',
    it: 'Diritto di rotta',
  });

  const strategiesLabel = tp('Стратегии', 'Strategies', 'Strategie', {
    es: 'Estrategias',
    fr: 'Stratégies',
    de: 'Strategien',
    it: 'Strategie',
  });

  const conceptsLabel = tp('Ключевые понятия', 'Key concepts', 'Kluczowe pojęcia', {
    es: 'Conceptos clave',
    fr: 'Notions clés',
    de: 'Schlüsselbegriffe',
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
              fr: `Priorité ${rule.priority}`,
              de: `Priorität ${rule.priority}`,
              it: `Priorità ${rule.priority}`,
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
