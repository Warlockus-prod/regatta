/**
 * Race history list.
 *
 * Reads every persisted race from `regatta.race-history.v1` and renders
 * them newest-first as Card rows. Each row exposes:
 *   - "Watch"  -> /replay/[id] (Sprint 10 Replay viewer)
 *   - "Coach"  -> /coach?raceId=...  (Sprint 9 AI coach)
 *
 * Empty state when no races exist (e.g. fresh install): a CTA routes
 * the user to /game so they can finish a race that gets persisted on
 * the way to becoming the first row here.
 *
 * "Clear all" lives at the bottom and goes through a confirm Alert; the
 * actual wipe delegates to `useRaceHistory().clear()`, which removes
 * the AsyncStorage row and resets the in-memory list.
 */
import { Stack, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../../src/i18n/context';
import type { Lang } from '../../src/i18n/languages';
import {
  Card,
  EmptyState,
  Screen,
  Text,
} from '../../src/design-system/components';
import {
  useRaceHistory,
  type RaceRecord,
} from '../../src/persistence/race-history';
import { findCourse } from '../../src/game/course';
import { colors, radii, spacing } from '../../src/design-system/tokens';

function formatTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/** Short month names in the app's own language, so the header follows the
 *  language picked in the app rather than the device locale. */
const MONTHS: Record<Lang, string> = {
  ru: 'янв фев мар апр мая июн июл авг сен окт ноя дек',
  en: 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec',
  pl: 'sty lut mar kwi maj cze lip sie wrz paź lis gru',
  es: 'ene feb mar abr may jun jul ago sept oct nov dic',
  fr: 'janv. févr. mars avr. mai juin juil. août sept. oct. nov. déc.',
  de: 'Jan. Feb. März Apr. Mai Juni Juli Aug. Sept. Okt. Nov. Dez.',
  it: 'gen feb mar apr mag giu lug ago set ott nov dic',
};

/** "12 May, 16:42" in the app language ("12. Mai, 16:42" in German). */
function formatFinishedAt(ms: number, lang: Lang): string {
  const d = new Date(ms);
  const day = d.getDate();
  const month = (MONTHS[lang] ?? MONTHS.en).split(' ')[d.getMonth()];
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day}${lang === 'de' ? '.' : ''} ${month}, ${hours}:${minutes}`;
}

export default function History() {
  const { tp, lang } = useI18n();
  const router = useRouter();
  const history = useRaceHistory();

  const screenTitle = tp('История гонок', 'Race history', 'Historia wyścigów', {
    es: 'Historial de regatas',
    fr: 'Historique des courses',
    de: 'Rennhistorie',
    it: 'Cronologia regate',
  });
  const watchLabel = tp('Повтор', 'Watch', 'Powtórka', {
    es: 'Ver',
    fr: 'Revoir',
    de: 'Ansehen',
    it: 'Guarda',
  });
  const coachLabel = tp('Тренер', 'Coach', 'Trener', {
    es: 'Entrenador',
    fr: 'Coach',
    de: 'Trainer',
    it: 'Coach',
  });
  const clearAllLabel = tp('Очистить всё', 'Clear all', 'Wyczyść wszystko', {
    es: 'Borrar todo',
    fr: 'Tout effacer',
    de: 'Alles löschen',
    it: 'Cancella tutto',
  });
  const emptyTitle = tp('Пока пусто', 'Nothing here yet', 'Na razie pusto', {
    es: 'Aún no hay nada',
    fr: 'Encore vide',
    de: 'Noch nichts hier',
    it: 'Ancora vuoto',
  });
  const emptySubtitle = tp(
    'Финишируй гонку в симуляторе, чтобы она появилась здесь.',
    'Finish a race in the simulator to see it here.',
    'Ukończ wyścig w symulatorze, a pojawi się tutaj.',
    {
      es: 'Termina una regata en el simulador para verla aquí.',
      fr: 'Termine une course dans le simulateur pour la voir ici.',
      de: 'Beende ein Rennen im Simulator, damit es hier erscheint.',
      it: 'Completa una regata nel simulatore per vederla qui.',
    },
  );
  const emptyCtaLabel = tp('К гонке', 'To the race', 'Do wyścigu', {
    es: 'A la regata',
    fr: 'À la course',
    de: 'Zum Rennen',
    it: 'Alla regata',
  });
  const confirmTitle = tp(
    'Очистить историю?',
    'Clear race history?',
    'Wyczyścić historię?',
    {
      es: '¿Borrar el historial?',
      fr: 'Effacer l\'historique ?',
      de: 'Verlauf löschen?',
      it: 'Cancellare la cronologia?',
    },
  );
  const confirmBody = tp(
    'Действие нельзя отменить.',
    'This cannot be undone.',
    'Tej operacji nie można cofnąć.',
    {
      es: 'Esta acción no se puede deshacer.',
      fr: 'Cette action est irréversible.',
      de: 'Das kann nicht rückgängig gemacht werden.',
      it: 'Questa azione non può essere annullata.',
    },
  );
  const cancelLabel = tp('Отмена', 'Cancel', 'Anuluj', {
    es: 'Cancelar',
    fr: 'Annuler',
    de: 'Abbrechen',
    it: 'Annulla',
  });
  const confirmYesLabel = tp('Очистить', 'Clear', 'Wyczyść', {
    es: 'Borrar',
    fr: 'Effacer',
    de: 'Löschen',
    it: 'Cancella',
  });
  const scoreLabel = tp('Очки', 'Score', 'Punkty', {
    es: 'Puntos',
    fr: 'Score',
    de: 'Punkte',
    it: 'Punti',
  });
  const timeLabel = tp('Время', 'Time', 'Czas', {
    es: 'Tiempo',
    fr: 'Temps',
    de: 'Zeit',
    it: 'Tempo',
  });

  const handleClear = useCallback(() => {
    Alert.alert(confirmTitle, confirmBody, [
      { text: cancelLabel, style: 'cancel' },
      {
        text: confirmYesLabel,
        style: 'destructive',
        onPress: () => {
          void history.clear();
        },
      },
    ]);
  }, [
    history,
    confirmTitle,
    confirmBody,
    cancelLabel,
    confirmYesLabel,
  ]);

  // Sort newest-first. We don't mutate the underlying list - the hook
  // owns it.
  const sorted = [...history.races].sort(
    (a, b) => b.finishedAt - a.finishedAt,
  );

  if (history.ready && sorted.length === 0) {
    return (
      <Screen>
        <Stack.Screen options={{ title: screenTitle }} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <EmptyState
            icon="flag"
            title={emptyTitle}
            subtitle={emptySubtitle}
            cta={{
              label: emptyCtaLabel,
              onPress: () => router.push('/game'),
            }}
          />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: screenTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {sorted.map((race) => (
          <RaceCard
            key={race.id}
            race={race}
            onWatch={() => router.push(`/replay/${encodeURIComponent(race.id)}`)}
            onCoach={() =>
              router.push(`/coach?raceId=${encodeURIComponent(race.id)}`)
            }
            tp={tp}
            lang={lang}
            watchLabel={watchLabel}
            coachLabel={coachLabel}
            timeLabel={timeLabel}
            scoreLabel={scoreLabel}
          />
        ))}
        {sorted.length > 0 ? (
          <View style={styles.clearRow}>
            <Pressable
              onPress={handleClear}
              accessibilityRole="button"
              accessibilityLabel={clearAllLabel}
              style={({ pressed }) => [
                styles.clearButton,
                pressed && styles.clearButtonPressed,
              ]}
            >
              <Text style={styles.clearButtonText}>{clearAllLabel}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

interface RaceCardProps {
  race: RaceRecord;
  onWatch: () => void;
  onCoach: () => void;
  tp: ReturnType<typeof useI18n>['tp'];
  lang: Lang;
  watchLabel: string;
  coachLabel: string;
  timeLabel: string;
  scoreLabel: string;
}

function RaceCard({
  race,
  onWatch,
  onCoach,
  tp,
  lang,
  watchLabel,
  coachLabel,
  timeLabel,
  scoreLabel,
}: RaceCardProps) {
  const course = findCourse(race.courseId);
  const courseTitle = course.title(tp);
  return (
    <Card style={styles.raceCard}>
      <View style={styles.raceHeader}>
        <Text variant="subtitle" style={styles.raceTitle} numberOfLines={1}>
          {courseTitle}
        </Text>
        <Text variant="muted" style={styles.raceMeta}>
          {formatFinishedAt(race.finishedAt, lang)}
        </Text>
      </View>
      <View style={styles.raceStatsRow}>
        <View style={styles.raceStat}>
          <Text style={styles.raceStatLabel}>{timeLabel}</Text>
          <Text style={styles.raceStatValue}>{formatTime(race.timeSec)}</Text>
        </View>
        <View style={styles.raceStat}>
          <Text style={styles.raceStatLabel}>{scoreLabel}</Text>
          <Text style={styles.raceStatValue}>{race.score}</Text>
        </View>
      </View>
      <View style={styles.raceActions}>
        <Pressable
          onPress={onWatch}
          accessibilityRole="button"
          accessibilityLabel={watchLabel}
          style={({ pressed }) => [
            styles.actionButton,
            styles.actionButtonPrimary,
            pressed && styles.actionButtonPressed,
          ]}
        >
          <Text style={styles.actionButtonTextPrimary}>{watchLabel}</Text>
        </Pressable>
        <Pressable
          onPress={onCoach}
          accessibilityRole="button"
          accessibilityLabel={coachLabel}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.actionButtonPressed,
          ]}
        >
          <Text style={styles.actionButtonText}>{coachLabel}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  raceCard: {
    gap: spacing.sm,
  },
  raceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  raceTitle: {
    fontSize: 16,
    flex: 1,
  },
  raceMeta: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  raceStatsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  raceStat: {
    flex: 0,
  },
  raceStatLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  raceStatValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  raceActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderColor: colors.borderCyanSoft,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: colors.accentCyan,
    borderColor: colors.accentCyan,
  },
  actionButtonPressed: {
    opacity: 0.84,
  },
  actionButtonText: {
    color: colors.accentCyan,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  actionButtonTextPrimary: {
    color: colors.bgPrimary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  clearRow: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  clearButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.40)',
    backgroundColor: 'rgba(255, 68, 68, 0.10)',
  },
  clearButtonPressed: {
    opacity: 0.84,
  },
  clearButtonText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
