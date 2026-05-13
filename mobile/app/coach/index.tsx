import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../../src/i18n/context';
import {
  Button,
  Card,
  EmptyState,
  Screen,
  Skeleton,
  Text,
} from '../../src/design-system/components';
import {
  loadRaceById,
  type RaceRecord,
} from '../../src/persistence/race-history';
import {
  requestCoaching,
  type CoachLogEvent,
  type CoachLogSample,
  type CoachResponse,
} from '../../src/api/coach';
import { findCourse } from '../../src/game/course';
import { colors, radii, spacing } from '../../src/design-system/tokens';

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading-race' }
  | { kind: 'loading-coach' }
  | { kind: 'loaded'; coaching: CoachResponse['coaching'] }
  | { kind: 'error'; message: string }
  | { kind: 'race-missing' };

/**
 * Post-race AI coach view. Reads `?raceId=...`, loads the race from
 * AsyncStorage, calls /api/coach with a race log derived from the
 * stored samples + events, then renders the parsed coaching JSON as
 * a stack of Cards (overall, mistakes, strengths, next goal).
 */
export default function Coach() {
  const { tp, lang } = useI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{ raceId?: string }>();
  const raceId = typeof params.raceId === 'string' ? params.raceId : undefined;

  const [race, setRace] = useState<RaceRecord | null>(null);
  const [state, setState] = useState<LoadState>({ kind: 'loading-race' });

  // 1. Hydrate the race from AsyncStorage. We do this once per raceId.
  useEffect(() => {
    let cancelled = false;
    if (!raceId) {
      setState({ kind: 'race-missing' });
      return;
    }
    setState({ kind: 'loading-race' });
    loadRaceById(raceId).then((rec) => {
      if (cancelled) return;
      if (!rec) {
        setState({ kind: 'race-missing' });
        return;
      }
      setRace(rec);
      setState({ kind: 'loading-coach' });
    });
    return () => {
      cancelled = true;
    };
  }, [raceId]);

  // 2. Build the /api/coach payload from the race + fire the request
  //    once race is hydrated. Re-fires when the user taps "Try again".
  const coachPayload = useMemo(() => {
    if (!race) return null;
    const course = findCourse(race.courseId);
    const samples: CoachLogSample[] =
      race.samples ??
      race.replay.map((p) => ({
        t: p.t,
        x: p.x,
        y: p.y,
        heading: 0,
        twa: 0,
        speed: 0,
        lap: 0,
      }));
    const events: CoachLogEvent[] = race.events ?? [
      { t: 0, type: 'start' },
      { t: race.timeSec, type: 'finish' },
    ];
    // The web /api/coach expects course geometry in canvas px to make
    // the prompt sensible. We approximate with a 360x520 reference grid
    // (the same scene size the Game screen uses on a typical phone) so
    // the coordinates land in a familiar range for the model.
    const refW = 360;
    const refH = 520;
    return {
      difficulty: course.difficulty,
      courseInfo: {
        windDirection: race.windDirDeg ?? 0,
        windwardMark: {
          x: course.marks[1]!.fx * refW,
          y: course.marks[1]!.fy * refH,
        },
        startY: course.marks[0]!.fy * refH,
      },
      finishTime: race.timeSec,
      position: 1,
      totalBoats: 1,
      samples,
      events,
      lang,
    };
  }, [race, lang]);

  const fetchCoach = useCallback(async () => {
    if (!coachPayload) return;
    setState({ kind: 'loading-coach' });
    const result = await requestCoaching(coachPayload);
    if (!result.ok || !result.data) {
      setState({
        kind: 'error',
        message: result.error ?? 'Coach unavailable',
      });
      return;
    }
    setState({ kind: 'loaded', coaching: result.data.coaching });
  }, [coachPayload]);

  useEffect(() => {
    if (state.kind === 'loading-coach') {
      void fetchCoach();
    }
    // We deliberately fire only when the state flips to 'loading-coach'
    // (initial transition + retry). Adding fetchCoach would re-trigger
    // on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.kind]);

  const title = tp('AI тренер', 'AI coach', 'Trener AI', {
    es: 'Coach IA',
    fr: 'Coach IA',
    de: 'KI-Coach',
    it: 'Coach IA',
  });
  const loadingLabel = tp(
    'Тренер анализирует гонку…',
    'Coach is analysing the race…',
    'Trener analizuje wyscig…',
    {
      es: 'El coach analiza la regata…',
      fr: 'Le coach analyse la course…',
      de: 'Der Coach analysiert das Rennen…',
      it: 'Il coach analizza la gara…',
    },
  );
  const errorTitle = tp(
    'Не удалось получить совет',
    'Could not load coaching',
    'Nie udalo sie zaladowac trenera',
    {
      es: 'No se pudo cargar el coach',
      fr: 'Impossible de charger le coach',
      de: 'Coaching konnte nicht geladen werden',
      it: 'Impossibile caricare il coach',
    },
  );
  const retryLabel = tp('Повторить', 'Retry', 'Spróbuj ponownie', {
    es: 'Reintentar',
    fr: 'Reessayer',
    de: 'Erneut versuchen',
    it: 'Riprova',
  });
  const tryAgainLabel = tp('Сыграть ещё', 'Try another race', 'Zagraj ponownie', {
    es: 'Otra regata',
    fr: 'Encore une course',
    de: 'Noch ein Rennen',
    it: 'Altra gara',
  });
  const homeLabel = tp('Домой', 'Home', 'Strona glowna', {
    es: 'Inicio',
    fr: 'Accueil',
    de: 'Start',
    it: 'Home',
  });
  const noRaceTitle = tp(
    'Гонка не найдена',
    'Race not found',
    'Nie znaleziono wyscigu',
    {
      es: 'Regata no encontrada',
      fr: 'Course introuvable',
      de: 'Rennen nicht gefunden',
      it: 'Gara non trovata',
    },
  );
  const noRaceSubtitle = tp(
    'Попробуй сыграть и сохранить ещё одну.',
    'Try playing and saving another race.',
    'Sprobuj zagrac i zapisac kolejny wyscig.',
    {
      es: 'Prueba a jugar y guardar otra regata.',
      fr: 'Essaie de jouer et denregistrer une autre course.',
      de: 'Spiele und speichere ein anderes Rennen.',
      it: 'Prova a giocare e salvare unaltra gara.',
    },
  );

  const overallLabel = tp('ИТОГ', 'OVERALL', 'OGOLEM', {
    es: 'GLOBAL',
    fr: 'BILAN',
    de: 'GESAMT',
    it: 'GLOBALE',
  });
  const mistakesLabel = tp('ОШИБКИ', 'MISTAKES', 'BLEDY', {
    es: 'ERRORES',
    fr: 'ERREURS',
    de: 'FEHLER',
    it: 'ERRORI',
  });
  const strengthsLabel = tp('СИЛЬНЫЕ СТОРОНЫ', 'STRENGTHS', 'MOCNE STRONY', {
    es: 'PUNTOS FUERTES',
    fr: 'POINTS FORTS',
    de: 'STAERKEN',
    it: 'PUNTI DI FORZA',
  });
  const nextGoalLabel = tp(
    'СЛЕДУЮЩАЯ ЦЕЛЬ',
    'NEXT GOAL',
    'NASTEPNY CEL',
    {
      es: 'PROXIMO OBJETIVO',
      fr: 'PROCHAIN OBJECTIF',
      de: 'NAECHSTES ZIEL',
      it: 'PROSSIMO OBIETTIVO',
    },
  );
  const explainLabel = tp('Что случилось', 'What happened', 'Co sie stalo', {
    es: 'Que paso',
    fr: 'Ce qui sest passe',
    de: 'Was passiert ist',
    it: 'Cosa e successo',
  });
  const fixLabel = tp('Как лучше', 'How to fix', 'Jak poprawic', {
    es: 'Como mejorar',
    fr: 'Comment corriger',
    de: 'Wie es geht',
    it: 'Come migliorare',
  });
  const scoreLabel = tp('Оценка', 'Score', 'Wynik', {
    es: 'Puntuacion',
    fr: 'Note',
    de: 'Bewertung',
    it: 'Valutazione',
  });
  const minorLabel = tp('лёгкая', 'minor', 'lekki', {
    es: 'leve',
    fr: 'mineure',
    de: 'leicht',
    it: 'lieve',
  });
  const majorLabel = tp('серьёзная', 'major', 'powazny', {
    es: 'grave',
    fr: 'majeure',
    de: 'schwer',
    it: 'grave',
  });
  // Sprint 10: "Watch replay" CTA at the top of the coach page so the
  // user can jump from the AI feedback into the Replay viewer with the
  // same raceId. Hidden on the race-missing branch since there's no id
  // to route to.
  const watchReplayLabel = tp(
    'Смотреть повтор',
    'Watch replay',
    'Obejrzyj powtorke',
    {
      es: 'Ver repeticion',
      fr: 'Voir le replay',
      de: 'Wiedergabe ansehen',
      it: 'Guarda il replay',
    },
  );
  const handleWatchReplay = useCallback(() => {
    if (!raceId) return;
    router.push(`/replay/${encodeURIComponent(raceId)}`);
  }, [raceId, router]);

  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {raceId && state.kind !== 'race-missing' ? (
          <Pressable
            onPress={handleWatchReplay}
            accessibilityRole="button"
            accessibilityLabel={watchReplayLabel}
            style={({ pressed }) => [
              styles.replayCta,
              pressed && styles.replayCtaPressed,
            ]}
          >
            <Text style={styles.replayCtaText}>{watchReplayLabel}</Text>
            <Text style={styles.replayCtaArrow}>→</Text>
          </Pressable>
        ) : null}
        {state.kind === 'loading-race' || state.kind === 'loading-coach' ? (
          <View style={styles.loadingWrap}>
            <Text variant="caption" style={styles.loadingLabel}>
              {loadingLabel}
            </Text>
            <Skeleton width="100%" height={90} radius={12} style={styles.skeleton} />
            <Skeleton width="100%" height={140} radius={12} style={styles.skeleton} />
            <Skeleton width="100%" height={90} radius={12} style={styles.skeleton} />
          </View>
        ) : null}

        {state.kind === 'error' ? (
          <View style={styles.errorWrap}>
            <EmptyState
              icon="bolt"
              title={errorTitle}
              subtitle={state.message}
              cta={{ label: retryLabel, onPress: fetchCoach }}
            />
          </View>
        ) : null}

        {state.kind === 'race-missing' ? (
          <EmptyState
            icon="flag"
            title={noRaceTitle}
            subtitle={noRaceSubtitle}
            cta={{
              label: tp('К гонке', 'To the race', 'Do wyscigu', {
                es: 'A la regata',
                fr: 'A la course',
                de: 'Zum Rennen',
                it: 'Alla gara',
              }),
              onPress: () => router.replace('/game'),
            }}
          />
        ) : null}

        {state.kind === 'loaded' ? (
          <View style={styles.body}>
            <Card>
              <Text variant="muted" style={styles.kicker}>
                {overallLabel}
              </Text>
              <Text variant="body" style={styles.overall}>
                {state.coaching.overall}
              </Text>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>{scoreLabel}</Text>
                <Text style={styles.scoreValue}>
                  {state.coaching.score}
                  <Text style={styles.scoreOutOf}>/100</Text>
                </Text>
              </View>
            </Card>

            {state.coaching.mistakes.length > 0 ? (
              <View style={styles.section}>
                <Text variant="muted" style={styles.kicker}>
                  {mistakesLabel}
                </Text>
                {state.coaching.mistakes.map((m, idx) => {
                  const heading = m.title ?? m.titleRu ?? '';
                  const explanation = m.explanation ?? m.explanationRu ?? '';
                  const fix = m.fix ?? m.fixRu ?? '';
                  const severity = m.severity === 'major' ? majorLabel : minorLabel;
                  return (
                    <Card
                      key={`${idx}-${heading}`}
                      style={styles.mistakeCard}
                    >
                      <View style={styles.mistakeHeader}>
                        <View
                          style={[
                            styles.severityPill,
                            m.severity === 'major'
                              ? styles.severityMajor
                              : styles.severityMinor,
                          ]}
                        >
                          <Text
                            allowFontScaling={false}
                            style={[
                              styles.severityText,
                              m.severity === 'major'
                                ? styles.severityTextMajor
                                : styles.severityTextMinor,
                            ]}
                          >
                            {severity.toUpperCase()}
                          </Text>
                        </View>
                        <Text variant="muted" style={styles.mistakeTime}>
                          {`${Math.round(m.timeStart)}s - ${Math.round(m.timeEnd)}s`}
                        </Text>
                      </View>
                      <Text variant="subtitle" style={styles.mistakeTitle}>
                        {heading}
                      </Text>
                      {explanation ? (
                        <View style={styles.mistakeBlock}>
                          <Text variant="muted" style={styles.mistakeBlockLabel}>
                            {explainLabel}
                          </Text>
                          <Text style={styles.mistakeBody}>{explanation}</Text>
                        </View>
                      ) : null}
                      {fix ? (
                        <View style={styles.mistakeBlock}>
                          <Text variant="muted" style={styles.mistakeBlockLabel}>
                            {fixLabel}
                          </Text>
                          <Text style={styles.mistakeBody}>{fix}</Text>
                        </View>
                      ) : null}
                    </Card>
                  );
                })}
              </View>
            ) : null}

            {state.coaching.strengths.length > 0 ? (
              <View style={styles.section}>
                <Text variant="muted" style={styles.kicker}>
                  {strengthsLabel}
                </Text>
                <Card>
                  {state.coaching.strengths.map((s, i) => (
                    <View key={`${i}-${s}`} style={styles.strengthRow}>
                      <View style={styles.strengthDot} />
                      <Text style={styles.strengthText}>{s}</Text>
                    </View>
                  ))}
                </Card>
              </View>
            ) : null}

            {state.coaching.nextGoal || state.coaching.nextGoalRu ? (
              <View style={styles.section}>
                <Text variant="muted" style={styles.kicker}>
                  {nextGoalLabel}
                </Text>
                <Card accent="cyan">
                  <Text style={styles.nextGoal}>
                    {state.coaching.nextGoal ?? state.coaching.nextGoalRu}
                  </Text>
                </Card>
              </View>
            ) : null}

            <View style={styles.actions}>
              <Button onPress={() => router.replace('/game')}>
                {tryAgainLabel}
              </Button>
              <Button
                onPress={() => router.replace('/')}
                variant="secondary"
              >
                {homeLabel}
              </Button>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loadingWrap: {
    gap: spacing.md,
  },
  loadingLabel: {
    fontSize: 13,
    marginBottom: spacing.xs,
  },
  skeleton: {
    width: '100%',
  },
  errorWrap: {
    paddingTop: spacing.xl,
  },
  body: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    color: colors.textMuted,
  },
  overall: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderCyanFaint,
  },
  scoreLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  scoreValue: {
    color: colors.accentCyan,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  scoreOutOf: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  mistakeCard: {
    gap: spacing.sm,
  },
  mistakeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  severityPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  severityMinor: {
    backgroundColor: 'rgba(0, 212, 255, 0.10)',
    borderColor: 'rgba(0, 212, 255, 0.40)',
  },
  severityMajor: {
    backgroundColor: 'rgba(255, 68, 68, 0.12)',
    borderColor: 'rgba(255, 68, 68, 0.42)',
  },
  severityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  severityTextMinor: {
    color: colors.accentCyan,
  },
  severityTextMajor: {
    color: colors.danger,
  },
  mistakeTime: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  mistakeTitle: {
    fontSize: 16,
  },
  mistakeBlock: {
    gap: 2,
  },
  mistakeBlockLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  mistakeBody: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  strengthDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginTop: 9,
  },
  strengthText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  nextGoal: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  // Sprint 10: Watch-replay CTA at the top of the coach page.
  replayCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderCyanSoft,
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
    marginBottom: spacing.md,
  },
  replayCtaPressed: {
    opacity: 0.84,
  },
  replayCtaText: {
    color: colors.accentCyan,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  replayCtaArrow: {
    color: colors.accentCyan,
    fontSize: 16,
    fontWeight: '700',
  },
});
