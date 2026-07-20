import { useEffect, useMemo, useState } from 'react';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../../src/i18n/context';
import {
  Button,
  Card,
  LessonDiagram,
  QuizCard,
  Screen,
  Text,
} from '../../src/design-system/components';
import { bootcampLessons } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { useBootcampProgress } from '../../src/persistence/bootcamp';
import { useBootcampQuiz } from '../../src/persistence/bootcamp-quiz';
import { getLessonDay } from '../../src/bootcamp/days';
import {
  buildSimulatorDrillRoute,
  getDrillForLesson,
} from '../../src/bootcamp/lesson-drill-map';
import { webRouteToAppRoute } from '../../src/bootcamp/web-route-to-app-route';
import {
  getQuizForLesson,
  isQuizPassed,
} from '../../src/bootcamp/quiz-data';
import { colors, spacing } from '../../src/design-system/tokens';

/**
 * Bootcamp lesson detail. Resolves the lesson by id from the synced
 * bootcamp bundle, renders emoji + title + summary + a "focus this
 * time" card, and a primary CTA to open the practice route attached
 * to the lesson (e.g. `/simulator`, `/courses`).
 *
 * Pressing "Open" marks the lesson as completed in AsyncStorage so the
 * Bootcamp index reflects the user's progress on next visit.
 *
 * Sprint 11: at the bottom of the page, when the lesson has quiz
 * questions, a "Test your understanding" section offers a 2-3 question
 * micro-quiz. Quiz state is in-screen (no sub-route) so the user can
 * scroll back up to the lesson copy after finishing.
 */
export default function BootcampLesson() {
  const params = useLocalSearchParams<{ id: string }>();
  const { tp, lang } = useI18n();
  const router = useRouter();
  const { markCompleted, markLastViewed } = useBootcampProgress();
  const { results: quizResults, recordResult } = useBootcampQuiz();

  const lesson = bootcampLessons.find((l) => l.id === params.id);
  const lessonId = lesson?.id ?? null;

  useEffect(() => {
    if (lesson) markLastViewed(lesson.id);
  }, [lesson, markLastViewed]);

  // Memoise quiz lookup at the top so the hook order stays stable
  // across the early-return branch below. `lessonId` is null when the
  // route param doesn't match a lesson; that returns an empty list.
  const quizQuestions = useMemo(
    () => (lessonId ? getQuizForLesson(lessonId) : []),
    [lessonId],
  );

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

  const previousResult = quizResults[lesson.id];
  const previouslyPassed = previousResult
    ? isQuizPassed(previousResult.score, previousResult.total)
    : false;

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
              // lesson.route is a WEB path; "/simulator" means Basics on the
              // web but the native trainer in the app (see web-route-to-app-route).
              router.push(webRouteToAppRoute(lesson.route));
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

        {quizQuestions.length > 0 ? (
          <QuizSection
            lessonId={lesson.id}
            questions={quizQuestions}
            previousScore={previousResult?.score}
            previousTotal={previousResult?.total}
            previouslyPassed={previouslyPassed}
            onRecord={(score, total) => {
              markCompleted(lesson.id);
              recordResult(lesson.id, score, total);
            }}
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

interface QuizSectionProps {
  lessonId: string;
  questions: ReturnType<typeof getQuizForLesson>;
  previousScore?: number;
  previousTotal?: number;
  previouslyPassed: boolean;
  onRecord: (score: number, total: number) => void;
}

type Phase =
  | { kind: 'intro' }
  | { kind: 'question'; index: number; pickedId?: string; revealed: boolean }
  | { kind: 'result'; score: number; recorded: boolean };

/**
 * In-screen quiz state machine. Lives next to the lesson copy so users
 * can scroll back up after answering, and so a deep link straight to
 * the quiz wasn't needed for v1.
 */
function QuizSection({
  lessonId,
  questions,
  previousScore,
  previousTotal,
  previouslyPassed,
  onRecord,
}: QuizSectionProps) {
  const { tp } = useI18n();
  const [phase, setPhase] = useState<Phase>({ kind: 'intro' });
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  const sectionLabel = tp(
    'Проверь себя',
    'Test your understanding',
    'Sprawdz sie',
    {
      es: 'Comprueba tu comprension',
      fr: 'Verifie ta comprehension',
      de: 'Verstaendnis pruefen',
      it: 'Verifica la tua comprensione',
    },
  );
  const startLabel = tp('Начать квиз', 'Start quiz', 'Rozpocznij quiz', {
    es: 'Empezar quiz',
    fr: 'Commencer le quiz',
    de: 'Quiz starten',
    it: 'Avvia il quiz',
  });
  const retakeLabel = tp(
    'Пройти ещё раз',
    'Retake quiz',
    'Powtorz quiz',
    {
      es: 'Reintentar quiz',
      fr: 'Refaire le quiz',
      de: 'Quiz wiederholen',
      it: 'Rifai il quiz',
    },
  );
  const checkLabel = tp(
    'Проверить ответ',
    'Check answer',
    'Sprawdz odpowiedz',
    {
      es: 'Comprobar respuesta',
      fr: 'Verifier la reponse',
      de: 'Antwort pruefen',
      it: 'Verifica risposta',
    },
  );
  const nextLabel = tp(
    'Следующий вопрос',
    'Next question',
    'Nastepne pytanie',
    {
      es: 'Siguiente pregunta',
      fr: 'Question suivante',
      de: 'Naechste Frage',
      it: 'Prossima domanda',
    },
  );
  const finishLabel = tp(
    'Завершить квиз',
    'Finish quiz',
    'Zakoncz quiz',
    {
      es: 'Terminar quiz',
      fr: 'Terminer le quiz',
      de: 'Quiz beenden',
      it: 'Termina quiz',
    },
  );
  const markCompleteLabel = tp(
    'Отметить выполненным',
    'Mark complete',
    'Oznacz ukonczone',
    {
      es: 'Marcar como hecho',
      fr: 'Marquer comme fait',
      de: 'Als erledigt markieren',
      it: 'Segna come completato',
    },
  );
  const tryAgainLabel = tp('Попробовать снова', 'Try again', 'Sprobuj ponownie', {
    es: 'Intentar de nuevo',
    fr: 'Reessayer',
    de: 'Nochmal versuchen',
    it: 'Riprova',
  });
  const previousScoreLabel = tp(
    'Прошлый результат',
    'Last result',
    'Ostatni wynik',
    {
      es: 'Ultimo resultado',
      fr: 'Dernier resultat',
      de: 'Letztes Ergebnis',
      it: 'Ultimo risultato',
    },
  );
  const passedBadge = tp('Сдано', 'Passed', 'Zaliczone', {
    es: 'Aprobado',
    fr: 'Reussi',
    de: 'Bestanden',
    it: 'Superato',
  });
  const blurb = tp(
    `${questions.length} коротких вопросов по уроку.`,
    `${questions.length} quick questions on this lesson.`,
    `${questions.length} krotkich pytan z lekcji.`,
    {
      es: `${questions.length} preguntas rapidas sobre esta leccion.`,
      fr: `${questions.length} questions rapides sur cette leçon.`,
      de: `${questions.length} kurze Fragen zu dieser Lektion.`,
      it: `${questions.length} domande rapide su questa lezione.`,
    },
  );

  const showStartButton =
    phase.kind === 'intro' && (!previouslyPassed || previousScore === undefined);
  const showRetakeButton = phase.kind === 'intro' && previousScore !== undefined;

  if (phase.kind === 'intro') {
    return (
      <Card style={styles.quizSection}>
        <Text variant="muted" style={styles.quizSectionLabel}>
          {sectionLabel.toUpperCase()}
        </Text>
        <Text variant="body" style={styles.quizSectionBody}>{blurb}</Text>

        {previousScore !== undefined && previousTotal !== undefined ? (
          <View style={styles.previousScoreRow}>
            <Text variant="muted" style={styles.previousScoreLabel}>
              {previousScoreLabel}: {previousScore} / {previousTotal}
            </Text>
            {previouslyPassed ? (
              <Text style={styles.passedBadge}>
                {passedBadge.toUpperCase()}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.quizCta}>
          {showStartButton ? (
            <Button
              variant="primary"
              onPress={() => {
                setAnswers({});
                setPhase({ kind: 'question', index: 0, revealed: false });
              }}
            >
              {startLabel}
            </Button>
          ) : null}
          {showRetakeButton ? (
            <Button
              variant="secondary"
              onPress={() => {
                setAnswers({});
                setPhase({ kind: 'question', index: 0, revealed: false });
              }}
            >
              {retakeLabel}
            </Button>
          ) : null}
        </View>
      </Card>
    );
  }

  if (phase.kind === 'question') {
    const q = questions[phase.index];
    if (!q) {
      // Shouldn't happen with finite indices, but keep types narrow.
      return null;
    }
    const correctOption = q.options.find((o) => o.correct);
    const correctId = correctOption?.id ?? '';
    const isLast = phase.index === questions.length - 1;
    const stepLabel = tp(
      `Вопрос ${phase.index + 1} из ${questions.length}`,
      `Question ${phase.index + 1} of ${questions.length}`,
      `Pytanie ${phase.index + 1} z ${questions.length}`,
      {
        es: `Pregunta ${phase.index + 1} de ${questions.length}`,
        fr: `Question ${phase.index + 1} sur ${questions.length}`,
        de: `Frage ${phase.index + 1} von ${questions.length}`,
        it: `Domanda ${phase.index + 1} di ${questions.length}`,
      },
    );

    return (
      <View style={styles.quizSection}>
        <Text variant="muted" style={styles.stepLabel}>
          {stepLabel.toUpperCase()}
        </Text>
        <QuizCard
          question={q}
          selectedId={phase.pickedId}
          revealed={phase.revealed}
          correctId={correctId}
          onSelect={(id) => {
            if (phase.revealed) return;
            setPhase({ ...phase, pickedId: id });
          }}
        />
        <View style={styles.quizCta}>
          {phase.revealed ? (
            <Button
              variant="primary"
              onPress={() => {
                if (isLast) {
                  let score = 0;
                  for (const question of questions) {
                    if (answers[question.id]) score += 1;
                  }
                  setPhase({ kind: 'result', score, recorded: false });
                } else {
                  setPhase({
                    kind: 'question',
                    index: phase.index + 1,
                    revealed: false,
                  });
                }
              }}
            >
              {isLast ? finishLabel : nextLabel}
            </Button>
          ) : (
            <Button
              variant="primary"
              disabled={phase.pickedId === undefined}
              onPress={() => {
                if (phase.pickedId === undefined) return;
                const isCorrect = phase.pickedId === correctId;
                setAnswers((prev) => ({ ...prev, [q.id]: isCorrect }));
                setPhase({ ...phase, revealed: true });
              }}
            >
              {checkLabel}
            </Button>
          )}
        </View>
      </View>
    );
  }

  // phase.kind === 'result'
  const total = questions.length;
  const passed = isQuizPassed(phase.score, total);
  const resultHeadline = passed
    ? tp(
        `Отлично: ${phase.score} из ${total}`,
        `Nicely done: ${phase.score} of ${total}`,
        `Brawo: ${phase.score} z ${total}`,
        {
          es: `Bien hecho: ${phase.score} de ${total}`,
          fr: `Bien joue: ${phase.score} sur ${total}`,
          de: `Gut gemacht: ${phase.score} von ${total}`,
          it: `Ben fatto: ${phase.score} di ${total}`,
        },
      )
    : tp(
        `Результат: ${phase.score} из ${total}`,
        `Score: ${phase.score} of ${total}`,
        `Wynik: ${phase.score} z ${total}`,
        {
          es: `Puntuacion: ${phase.score} de ${total}`,
          fr: `Score: ${phase.score} sur ${total}`,
          de: `Ergebnis: ${phase.score} von ${total}`,
          it: `Punteggio: ${phase.score} di ${total}`,
        },
      );
  const passNote = passed
    ? tp(
        'Урок засчитан как пройденный.',
        'This lesson now counts as fully complete.',
        'Lekcja zaliczona w pelni.',
        {
          es: 'Esta leccion cuenta como completada.',
          fr: 'Cette leçon compte comme terminee.',
          de: 'Diese Lektion gilt als vollstaendig abgeschlossen.',
          it: 'Questa lezione conta come completata.',
        },
      )
    : tp(
        `Нужно ${Math.ceil(total * 0.7)} из ${total} для зачёта. Попробуй ещё.`,
        `You need ${Math.ceil(total * 0.7)} of ${total} to pass. Give it another go.`,
        `Potrzebujesz ${Math.ceil(total * 0.7)} z ${total} do zaliczenia. Sprobuj jeszcze raz.`,
        {
          es: `Necesitas ${Math.ceil(total * 0.7)} de ${total} para aprobar. Intentalo de nuevo.`,
          fr: `Il faut ${Math.ceil(total * 0.7)} sur ${total} pour valider. Reessaie.`,
          de: `Du brauchst ${Math.ceil(total * 0.7)} von ${total} zum Bestehen. Versuche es nochmal.`,
          it: `Servono ${Math.ceil(total * 0.7)} di ${total} per superarlo. Riprova.`,
        },
      );

  return (
    <Card
      style={[
        styles.quizSection,
        passed ? styles.resultCardPass : styles.resultCardFail,
      ]}
      accessibilityLabel={resultHeadline}
    >
      <Text variant="subtitle" style={styles.resultHeadline}>
        {resultHeadline}
      </Text>
      <Text variant="body" style={styles.resultBody}>{passNote}</Text>
      <View style={styles.quizCta}>
        {!phase.recorded ? (
          <Button
            variant="primary"
            onPress={() => {
              onRecord(phase.score, total);
              setPhase({ ...phase, recorded: true });
            }}
            accessibilityHint={lessonId}
          >
            {markCompleteLabel}
          </Button>
        ) : null}
        <View style={styles.tryAgainSpacer} />
        <Button
          variant="secondary"
          onPress={() => {
            setAnswers({});
            setPhase({ kind: 'question', index: 0, revealed: false });
          }}
        >
          {tryAgainLabel}
        </Button>
      </View>
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
  quizSection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  quizSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  quizSectionBody: {
    lineHeight: 22,
  },
  previousScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  previousScoreLabel: {
    fontSize: 13,
  },
  passedBadge: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    backgroundColor: colors.surfaceSuccess,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  quizCta: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.accentCyan,
    marginBottom: spacing.sm,
  },
  resultCardPass: {
    borderColor: colors.success,
  },
  resultCardFail: {
    borderColor: colors.warning,
  },
  resultHeadline: {
    marginBottom: spacing.sm,
  },
  resultBody: {
    lineHeight: 22,
  },
  tryAgainSpacer: {
    height: 0,
  },
});
