import { useEffect } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../../src/i18n/context';
import {
  Button,
  Card,
  LessonDiagram,
  Screen,
  Text,
} from '../../src/design-system/components';
import { bootcampLessons } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { useBootcampProgress } from '../../src/persistence/bootcamp';
import { getLessonDay } from '../../src/bootcamp/days';
import {
  buildSimulatorDrillRoute,
  getDrillForLesson,
} from '../../src/bootcamp/lesson-drill-map';
import { colors, spacing } from '../../src/design-system/tokens';

/**
 * Bootcamp lesson detail. Resolves the lesson by id from the synced
 * bootcamp bundle, renders emoji + title + summary + a "focus this
 * time" card, and a primary CTA to open the practice route attached
 * to the lesson (e.g. `/simulator`, `/courses`).
 *
 * Pressing "Open" marks the lesson as completed in AsyncStorage so the
 * Bootcamp index reflects the user's progress on next visit.
 */
export default function BootcampLesson() {
  const params = useLocalSearchParams<{ id: string }>();
  const { tp, lang } = useI18n();
  const router = useRouter();
  const { markCompleted, markLastViewed } = useBootcampProgress();

  const lesson = bootcampLessons.find((l) => l.id === params.id);

  useEffect(() => {
    if (lesson) markLastViewed(lesson.id);
  }, [lesson, markLastViewed]);

  const fallbackTitle = tp('Урок', 'Lesson', 'Lekcja', {
    es: 'Leccion',
    fr: 'Leçon',
    de: 'Lektion',
    it: 'Lezione',
  });

  if (!lesson) {
    return (
      <Screen>
        <Stack.Screen options={{ title: fallbackTitle }} />
        <View style={styles.empty}>
          <Text variant="muted">
            {tp(
              'Урок не найден',
              'Lesson not found',
              'Lekcja nie znaleziona',
              {
                es: 'Leccion no encontrada',
                fr: 'Leçon introuvable',
                de: 'Lektion nicht gefunden',
                it: 'Lezione non trovata',
              },
            )}
          </Text>
        </View>
      </Screen>
    );
  }

  const title = legacyPick(lesson, 'title', lang);
  const summary = legacyPick(lesson, 'summary', lang);
  const focus = legacyPick(lesson, 'focus', lang);

  const focusLabel = tp('Сфокусируйся', 'Focus this time', 'Skup sie', {
    es: 'Enfocate',
    fr: 'Concentre-toi',
    de: 'Fokus diesmal',
    it: 'Concentrati',
  });

  const openLabel = tp('Открыть', 'Open', 'Otworz', {
    es: 'Abrir',
    fr: 'Ouvrir',
    de: 'Oeffnen',
    it: 'Apri',
  });

  const meta = tp(
    `Урок ${lesson.order} (~${lesson.estMinutes} мин)`,
    `Lesson ${lesson.order} (~${lesson.estMinutes} min)`,
    `Lekcja ${lesson.order} (~${lesson.estMinutes} min)`,
    {
      es: `Leccion ${lesson.order} (~${lesson.estMinutes} min)`,
      fr: `Leçon ${lesson.order} (~${lesson.estMinutes} min)`,
      de: `Lektion ${lesson.order} (~${lesson.estMinutes} Min)`,
      it: `Lezione ${lesson.order} (~${lesson.estMinutes} min)`,
    },
  );

  const day = getLessonDay(lesson.id);
  const dayBadge = tp(
    `День ${day}`,
    `Day ${day}`,
    `Dzien ${day}`,
    {
      es: `Dia ${day}`,
      fr: `Jour ${day}`,
      de: `Tag ${day}`,
      it: `Giorno ${day}`,
    },
  );

  const drillId = getDrillForLesson(lesson.id);
  const tryInSimulatorLabel = tp(
    'Попробовать в симуляторе',
    'Try this in the simulator',
    'Sprobuj w symulatorze',
    {
      es: 'Pruebalo en el simulador',
      fr: 'Essaie dans le simulateur',
      de: 'Im Simulator ueben',
      it: 'Prova nel simulatore',
    },
  );

  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.dayBadge}>{dayBadge.toUpperCase()}</Text>
          <Text style={styles.emoji}>{lesson.emoji}</Text>
          <Text variant="title" style={styles.title}>{title}</Text>
          <Text variant="muted" style={styles.metaText}>{meta}</Text>
        </View>

        <View style={styles.diagramWrap}>
          <LessonDiagram lessonId={lesson.id} />
        </View>

        <Text variant="body" style={styles.summary}>{summary}</Text>

        <Card style={styles.focusCard}>
          <Text variant="muted" style={styles.focusLabel}>
            {focusLabel.toUpperCase()}
          </Text>
          <Text variant="body" style={styles.focusText}>{focus}</Text>
        </Card>

        <View style={styles.cta}>
          <Button
            onPress={() => {
              markCompleted(lesson.id);
              router.push(lesson.route);
            }}
            variant="primary"
          >
            {openLabel}
          </Button>
        </View>

        {drillId ? (
          <View style={styles.drillCta}>
            <Button
              onPress={() => {
                markCompleted(lesson.id);
                router.push(buildSimulatorDrillRoute(lesson.id, drillId));
              }}
              variant="secondary"
            >
              {tryInSimulatorLabel}
            </Button>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
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
  dayBadge: {
    color: colors.accentCyan,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    marginBottom: spacing.md,
  },
  emoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    textAlign: 'center',
  },
  metaText: {
    marginTop: spacing.sm,
  },
  summary: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    lineHeight: 24,
  },
  focusCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  focusLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  focusText: {
    lineHeight: 22,
  },
  cta: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  drillCta: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    marginTop: -spacing.lg,
  },
  diagramWrap: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
});
