import { Stack, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../../src/i18n/context';
import {
  Button,
  Card,
  RuleScenarioDiagram,
  Screen,
  Text,
} from '../../src/design-system/components';
import { ruleScenarios } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { colors, spacing } from '../../src/design-system/tokens';

/**
 * Rule scenario detail. Reveal-style: scene + question are shown up
 * front; the answer / why / inPractice sections appear after the user
 * taps "Show answer". Mirrors the web behavior.
 *
 * The detail view includes a compact SVG situation diagram so users can
 * understand right-of-way before reading the answer.
 */
export default function RuleScenarioDetail() {
  const params = useLocalSearchParams<{ id: string }>();
  const { tp, lang } = useI18n();
  const [revealed, setRevealed] = useState(false);

  const scenario = ruleScenarios.find((s) => s.id === params.id);

  const fallbackTitle = tp('Сценарий', 'Scenario', 'Scenariusz', {
    es: 'Escenario',
    fr: 'Scenario',
    de: 'Szenario',
    it: 'Scenario',
  });

  if (!scenario) {
    return (
      <Screen>
        <Stack.Screen options={{ title: fallbackTitle }} />
        <View style={styles.empty}>
          <Text variant="muted">
            {tp(
              'Сценарий не найден',
              'Scenario not found',
              'Scenariusz nie znaleziono',
              {
                es: 'Escenario no encontrado',
                fr: 'Scenario introuvable',
                de: 'Szenario nicht gefunden',
                it: 'Scenario non trovato',
              },
            )}
          </Text>
        </View>
      </Screen>
    );
  }

  const title = legacyPick(scenario, 'title', lang);
  const scene = legacyPick(scenario, 'scene', lang);
  const question = legacyPick(scenario, 'question', lang);
  const answer = legacyPick(scenario, 'answer', lang);
  const why = legacyPick(scenario, 'why', lang);
  const inPractice = legacyPick(scenario, 'inPractice', lang);

  const sceneLabel = tp('Сцена', 'Scene', 'Scena', {
    es: 'Escena',
    fr: 'Scene',
    de: 'Szene',
    it: 'Scena',
  });
  const questionLabel = tp('Вопрос', 'Question', 'Pytanie', {
    es: 'Pregunta',
    fr: 'Question',
    de: 'Frage',
    it: 'Domanda',
  });
  const answerLabel = tp('Ответ', 'Answer', 'Odpowiedz', {
    es: 'Respuesta',
    fr: 'Reponse',
    de: 'Antwort',
    it: 'Risposta',
  });
  const whyLabel = tp('Почему', 'Why', 'Dlaczego', {
    es: 'Por que',
    fr: 'Pourquoi',
    de: 'Warum',
    it: 'Perche',
  });
  const practiceLabel = tp('На практике', 'In practice', 'W praktyce', {
    es: 'En la practica',
    fr: 'En pratique',
    de: 'In der Praxis',
    it: 'In pratica',
  });
  const revealLabel = tp(
    'Показать ответ',
    'Show answer',
    'Pokaz odpowiedz',
    {
      es: 'Mostrar respuesta',
      fr: 'Voir la reponse',
      de: 'Antwort anzeigen',
      it: 'Mostra risposta',
    },
  );
  const diagramCaption = tp(
    'Схема, не в масштабе',
    'Schematic, not to scale',
    'Schemat, nie w skali',
    {
      es: 'Esquema, no a escala',
      fr: 'Schema, pas a lechelle',
      de: 'Schema, nicht massstabsgetreu',
      it: 'Schema, non in scala',
    },
  );

  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.icon}>{scenario.icon}</Text>
          <Text variant="title" style={styles.titleText}>{title}</Text>
          <View style={styles.tags}>
            <Text variant="muted" style={styles.tag}>
              {scenario.source === 'colregs' ? 'COLREGS' : 'RRS'}
            </Text>
          </View>
        </View>

        <View style={styles.diagramWrap}>
          <RuleScenarioDiagram scenario={scenario} caption={diagramCaption} />
        </View>

        <Section label={sceneLabel}>
          <Text variant="body" style={styles.body}>{scene}</Text>
        </Section>

        <Section label={questionLabel}>
          <Text variant="body" style={styles.body}>{question}</Text>
        </Section>

        {revealed ? (
          <>
            <Section label={answerLabel} accent>
              <Text variant="body" style={styles.body}>{answer}</Text>
            </Section>
            <Section label={whyLabel}>
              <Text variant="body" style={styles.body}>{why}</Text>
            </Section>
            <Section label={practiceLabel}>
              <Text variant="body" style={styles.body}>{inPractice}</Text>
            </Section>
          </>
        ) : (
          <View style={styles.cta}>
            <Button onPress={() => setRevealed(true)} variant="primary">
              {revealLabel}
            </Button>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function Section({
  label,
  accent,
  children,
}: {
  label: string;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <Card style={[styles.section, accent ? styles.sectionAccent : null]}>
      <Text variant="muted" style={styles.sectionLabel}>{label.toUpperCase()}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xxl,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  icon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  titleText: {
    textAlign: 'center',
  },
  tags: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  tag: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.textSecondary,
    backgroundColor: colors.bgSecondary,
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  diagramWrap: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  sectionAccent: {
    borderColor: colors.accentCyan,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  sectionBody: {},
  body: {
    lineHeight: 22,
  },
  cta: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
});
