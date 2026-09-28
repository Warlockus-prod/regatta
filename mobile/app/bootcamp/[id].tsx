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
import { lessonStatus } from '../../src/bootcamp/status';
import { useLearningBookmark } from '../../src/persistence/learning-bookmark';
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
  const { completedIds, doneIds, setDone, markCompleted, markLastViewed, lastViewedLessonId } = useBootcampProgress();
  const { results: quizResults, recordResult } = useBootcampQuiz();

  const lesson = bootcampLessons.find((l) => l.id === params.id);
  const lessonId = lesson?.id ?? null;
  useLearningBookmark(lesson ? 'bootcamp' : null, lessonId);

  // Opening a lesson makes it viewed (never passed: see src/bootcamp/status.ts).
  useEffect(() => {
    if (!lesson) return;
    markLastViewed(lesson.id);
    markCompleted(lesson.id);
  }, [lesson, markLastViewed, markCompleted]);

  // Memoise quiz lookup at the top so the hook order stays stable
  // across the early-return branch below. `lessonId` is null when the
  // route param doesn't match a lesson; that returns an empty list.
  const quizQuestions = useMemo(
    () => (lessonId ? getQuizForLesson(lessonId) : []),
    [lessonId],
  );

  const fallbackTitle = tp('Урок', 'Lesson', 'Lekcja', {
    es: 'Lección',
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
              'Nie znaleziono lekcji',
              {
                es: 'Lección no encontrada',
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

  const focusLabel = tp('Сфокусируйся', 'Focus this time', 'Skup się', {
    es: 'Céntrate en esto',
    fr: 'Concentre-toi',
    de: 'Dein Fokus',
    it: 'Concentrati',
  });

  const openLabel = tp('Открыть', 'Open', 'Otwórz', {
    es: 'Abrir',
    fr: 'Ouvrir',
    de: 'Öffnen',
    it: 'Apri',
  });

  // The header already says which lesson this is; the meta line keeps the time.
  const meta = tp(
    `~${lesson.estMinutes} мин`,
    `~${lesson.estMinutes} min`,
    `~${lesson.estMinutes} min`,
    { de: `~${lesson.estMinutes} Min.` },
  );

  const day = getLessonDay(lesson.id);
  const dayBadge = tp(
    `День ${day}`,
    `Day ${day}`,
    `Dzień ${day}`,
    {
      es: `Día ${day}`,
      fr: `Jour ${day}`,
      de: `Tag ${day}`,
      it: `Giorno ${day}`,
    },
  );

  const drillId = getDrillForLesson(lesson.id);
  const tryInSimulatorLabel = tp(
    'Попробовать в симуляторе',
    'Try this in the simulator',
    'Spróbuj w symulatorze',
    {
      es: 'Pruébalo en el simulador',
      fr: 'Essaie-le dans le simulateur',
      de: 'Im Simulator üben',
      it: 'Provalo nel simulatore',
    },
  );

  const previousResult = quizResults[lesson.id];
  const previouslyPassed = previousResult
    ? isQuizPassed(previousResult.score, previousResult.total)
    : false;

  const total = bootcampLessons.length;
  const headerTitle = tp(
    `Урок ${lesson.order} из ${total}`,
    `Lesson ${lesson.order} of ${total}`,
    `Lekcja ${lesson.order} z ${total}`,
    {
      es: `Lección ${lesson.order} de ${total}`,
      fr: `Leçon ${lesson.order} sur ${total}`,
      de: `Lektion ${lesson.order} von ${total}`,
      it: `Lezione ${lesson.order} di ${total}`,
    },
  );
  const status = lessonStatus(lesson.id, {
    viewedIds: completedIds,
    quizResults,
    doneIds,
    lastViewedLessonId,
  });
  const withQuiz = quizQuestions.length > 0;
  const statusLine = status === 'passed'
    ? tp('Урок пройден', 'Lesson passed', 'Lekcja zaliczona', {
        es: 'Lección superada', fr: 'Leçon réussie', de: 'Lektion bestanden', it: 'Lezione superata',
      })
    : withQuiz
      ? tp(
          'Урок будет пройден, когда ты ответишь верно хотя бы на 70% вопросов проверки ниже.',
          'The lesson counts as passed once you answer at least 70% of the check below correctly.',
          'Lekcja będzie zaliczona, gdy odpowiesz poprawnie na co najmniej 70% pytań sprawdzianu poniżej.',
          {
            es: 'La lección cuenta como superada cuando aciertes al menos el 70% de la prueba de abajo.',
            fr: 'La leçon est réussie dès que tu réponds juste à au moins 70 % du test ci-dessous.',
            de: 'Die Lektion gilt als bestanden, sobald du mindestens 70 % des Tests unten richtig beantwortest.',
            it: 'La lezione è superata quando rispondi correttamente ad almeno il 70% della verifica qui sotto.',
          },
        )
      : tp(
          'В этом уроке нет проверки. Отметь его сам, когда разберешься и попробуешь практику.',
          'This lesson has no check. Mark it yourself once you understand it and have tried the practice.',
          'Ta lekcja nie ma sprawdzianu. Zaznacz ją sam, gdy ją zrozumiesz i spróbujesz ćwiczenia.',
          {
            es: 'Esta lección no tiene prueba. Márcala tú cuando la entiendas y hayas probado la práctica.',
            fr: "Cette leçon n'a pas de test. Marque-la toi-même quand tu l'as comprise et que tu as essayé l'exercice.",
            de: 'Diese Lektion hat keinen Test. Markiere sie selbst, wenn du sie verstanden und die Übung ausprobiert hast.',
            it: "Questa lezione non ha una verifica. Segnala tu quando l'hai capita e hai provato l'esercizio.",
          },
        );
  const markDoneLabel = tp('Отметить урок пройденным', 'Mark lesson as passed', 'Oznacz lekcję jako zaliczoną', {
    es: 'Marcar la lección como superada',
    fr: 'Marquer la leçon comme réussie',
    de: 'Lektion als bestanden markieren',
    it: 'Segna la lezione come superata',
  });
  const unmarkLabel = tp('Снять отметку', 'Remove the mark', 'Usuń oznaczenie', {
    es: 'Quitar la marca',
    fr: 'Retirer la marque',
    de: 'Markierung entfernen',
    it: 'Togli il segno',
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text variant="eyebrow">{dayBadge}</Text>
          <Text variant="title" style={styles.title} accessibilityRole="header">{title}</Text>
          <Text variant="muted" style={styles.metaText}>{meta}</Text>
          <Text
            style={[styles.status, status === 'passed' && styles.statusPassed]}
            accessibilityLiveRegion="polite"
          >
            {statusLine}
          </Text>
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

        {!withQuiz ? (
          <View style={styles.drillCta}>
            <Button
              variant={status === 'passed' ? 'ghost' : 'primary'}
              onPress={() => setDone(lesson.id, status !== 'passed')}
            >
              {status === 'passed' ? unmarkLabel : markDoneLabel}
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
    'Sprawdź się',
    {
      es: 'Ponte a prueba',
      fr: 'Teste tes connaissances',
      de: 'Teste dein Wissen',
      it: 'Mettiti alla prova',
    },
  );
  const startLabel = tp('Начать квиз', 'Start quiz', 'Rozpocznij quiz', {
    es: 'Empezar el quiz',
    fr: 'Commencer le quiz',
    de: 'Quiz starten',
    it: 'Inizia il quiz',
  });
  const retakeLabel = tp(
    'Пройти ещё раз',
    'Retake quiz',
    'Powtórz quiz',
    {
      es: 'Repetir el quiz',
      fr: 'Refaire le quiz',
      de: 'Quiz wiederholen',
      it: 'Rifai il quiz',
    },
  );
  const checkLabel = tp(
    'Проверить ответ',
    'Check answer',
    'Sprawdź odpowiedź',
    {
      es: 'Comprobar respuesta',
      fr: 'Vérifier la réponse',
      de: 'Antwort prüfen',
      it: 'Verifica la risposta',
    },
  );
  const nextLabel = tp(
    'Следующий вопрос',
    'Next question',
    'Następne pytanie',
    {
      es: 'Siguiente pregunta',
      fr: 'Question suivante',
      de: 'Nächste Frage',
      it: 'Domanda successiva',
    },
  );
  const finishLabel = tp(
    'Завершить квиз',
    'Finish quiz',
    'Zakończ quiz',
    {
      es: 'Terminar el quiz',
      fr: 'Terminer le quiz',
      de: 'Quiz beenden',
      it: 'Termina il quiz',
    },
  );
  const markCompleteLabel = tp(
    'Отметить выполненным',
    'Mark complete',
    'Oznacz jako ukończoną',
    {
      es: 'Marcar como completada',
      fr: 'Marquer comme terminée',
      de: 'Als erledigt markieren',
      it: 'Segna come completata',
    },
  );
  const tryAgainLabel = tp('Попробовать снова', 'Try again', 'Spróbuj ponownie', {
    es: 'Intentar de nuevo',
    fr: 'Réessayer',
    de: 'Erneut versuchen',
    it: 'Riprova',
  });
  const previousScoreLabel = tp(
    'Прошлый результат',
    'Last result',
    'Ostatni wynik',
    {
      es: 'Último resultado',
      fr: 'Dernier résultat',
      de: 'Letztes Ergebnis',
      it: 'Ultimo risultato',
    },
  );
  const passedBadge = tp('Сдано', 'Passed', 'Zaliczone', {
    es: 'Aprobado',
    fr: 'Réussi',
    de: 'Bestanden',
    it: 'Superato',
  });
  const blurb = tp(
    `Короткие вопросы по уроку: ${questions.length}.`,
    `Quick questions on this lesson: ${questions.length}.`,
    `Krótkie pytania z tej lekcji: ${questions.length}.`,
    {
      es: `Preguntas rápidas sobre esta lección: ${questions.length}.`,
      fr: `Questions rapides sur cette leçon : ${questions.length}.`,
      de: `Kurze Fragen zu dieser Lektion: ${questions.length}.`,
      it: `Domande rapide su questa lezione: ${questions.length}.`,
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
          fr: `Bien joué : ${phase.score} sur ${total}`,
          de: `Gut gemacht: ${phase.score} von ${total}`,
          it: `Ben fatto: ${phase.score} su ${total}`,
        },
      )
    : tp(
        `Результат: ${phase.score} из ${total}`,
        `Score: ${phase.score} of ${total}`,
        `Wynik: ${phase.score} z ${total}`,
        {
          es: `Puntuación: ${phase.score} de ${total}`,
          fr: `Résultat : ${phase.score} sur ${total}`,
          de: `Ergebnis: ${phase.score} von ${total}`,
          it: `Punteggio: ${phase.score} su ${total}`,
        },
      );
  const passNote = passed
    ? tp(
        'Урок засчитан как пройденный.',
        'This lesson now counts as fully complete.',
        'Lekcja zaliczona.',
        {
          es: 'La lección cuenta como completada.',
          fr: 'Leçon validée.',
          de: 'Diese Lektion gilt als abgeschlossen.',
          it: 'La lezione risulta completata.',
        },
      )
    : tp(
        `Нужно ${Math.ceil(total * 0.7)} из ${total} для зачёта. Попробуй ещё.`,
        `You need ${Math.ceil(total * 0.7)} of ${total} to pass. Give it another go.`,
        `Do zaliczenia potrzebujesz ${Math.ceil(total * 0.7)} z ${total}. Spróbuj jeszcze raz.`,
        {
          es: `Necesitas ${Math.ceil(total * 0.7)} de ${total} para aprobar. Inténtalo de nuevo.`,
          fr: `Il en faut ${Math.ceil(total * 0.7)} sur ${total} pour valider. Réessaie.`,
          de: `Du brauchst ${Math.ceil(total * 0.7)} von ${total} zum Bestehen. Versuch es noch einmal.`,
          it: `Ne servono ${Math.ceil(total * 0.7)} su ${total} per superarlo. Riprova.`,
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
  status: {
    marginTop: spacing.md,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  statusPassed: {
    color: colors.accentTeal,
    fontWeight: '700',
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
