/**
 * Local leaderboard screen.
 *
 * Sprint 11: replaces the Phase-3 PlaceholderScreen with a real list
 * built from the on-device race history. The user's personal best per
 * course heads each course slot; "All" shows the overall PB across
 * every course, sorted highest score first.
 *
 * Filters live above the list as two pill rows:
 *   - course: All / Short / Medium / Long
 *   - period: All time / This week / Today
 *
 * Each row links to `/replay/{id}` so the user can rewatch the race
 * that earned them the PB. The screen routes to /game from the
 * EmptyState when there is no history yet.
 *
 * Online layer: this screen will gain a "Global" tab once
 * `/api/leaderboard` ships. The local helpers in `src/leaderboard/local.ts`
 * are the read side of the cache; they stay regardless of the data
 * source. See `docs/design/mobile/audits/sprint11-dev-b.md` for the
 * sketch of the online architecture.
 */
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../../src/i18n/context';
import {
  Card,
  EmptyState,
  Screen,
  Text,
} from '../../src/design-system/components';
import {
  bestPerCourse,
  filterByCourse,
  filterByPeriod,
  relativeDate,
  scoreTier,
  type LeaderboardCourseFilter,
  type LeaderboardPeriodFilter,
  type ScoreTier,
} from '../../src/leaderboard/local';
import { useRaceHistory, type RaceRecord } from '../../src/persistence/race-history';
import { findCourse } from '../../src/game/course';
import { colors, radii, spacing } from '../../src/design-system/tokens';
import type { Lang } from '../../src/i18n/languages';
import {
  fetchGlobalLeaderboard,
  type Difficulty,
  type Wind,
  type GlobalLeaderboardRow,
} from '../../src/api/leaderboard';

const SCORE_TIER_COLOR: Record<ScoreTier, string> = {
  gold: colors.success,
  silver: colors.accentCyan,
  bronze: colors.warning,
};

function formatTime(sec: number): string {
  // m:ss.x with tenths, matching the web - distinct web times must not collapse.
  const tenths = Math.max(0, Math.round(sec * 10));
  const m = Math.floor(tenths / 600);
  const r = Math.floor((tenths % 600) / 10);
  const t = tenths % 10;
  return `${m}:${r.toString().padStart(2, '0')}.${t}`;
}

export default function Leaderboard() {
  const { tp, lang } = useI18n();
  const router = useRouter();
  const history = useRaceHistory();
  const [courseFilter, setCourseFilter] = useState<LeaderboardCourseFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<LeaderboardPeriodFilter>('all');

  // Global board: a tab over the local PBs. Segmented by difficulty + wind to
  // match how the web /api/leaderboard keys the board. Deep-linkable via
  // `?tab=global` (e.g. from a "you made the board" notification later).
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<'local' | 'global'>(
    params.tab === 'global' ? 'global' : 'local',
  );
  useEffect(() => {
    if (params.tab === 'global') setTab('global');
    else if (params.tab === 'local') setTab('local');
  }, [params.tab]);
  const [gDiff, setGDiff] = useState<Difficulty>('medium');
  const [gWind, setGWind] = useState<Wind>('medium');
  const [gRows, setGRows] = useState<GlobalLeaderboardRow[] | null>(null);
  const [gLoading, setGLoading] = useState(false);
  const [gError, setGError] = useState<string | null>(null);
  const [gNonce, setGNonce] = useState(0);

  useEffect(() => {
    if (tab !== 'global') return;
    let cancelled = false;
    setGLoading(true);
    setGError(null);
    fetchGlobalLeaderboard(gDiff, gWind).then((res) => {
      if (cancelled) return;
      setGLoading(false);
      if (res.ok && res.data) {
        setGRows(res.data.rows);
      } else {
        setGRows(null);
        setGError(res.error ?? 'error');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [tab, gDiff, gWind, gNonce]);

  const screenTitle = tp('Таблица лидеров', 'Leaderboard', 'Ranking', {
    es: 'Clasificación',
    fr: 'Classement',
    de: 'Bestenliste',
    it: 'Classifica',
  });
  const subtitle = tp(
    'Личные рекорды по трассам и глобальная таблица по классам гонок.',
    'Your bests per course, plus the global board by race class.',
    'Twoje rekordy na każdej trasie i globalny ranking według klas wyścigu.',
    {
      es: 'Tus mejores marcas por recorrido y la tabla global por clase de regata.',
      fr: 'Tes meilleurs temps par parcours et le classement global par classe.',
      de: 'Deine Bestzeiten pro Bahn und die globale Liste nach Rennklasse.',
      it: 'I tuoi record per percorso e la classifica globale per classe di regata.',
    },
  );

  const courseFilterLabel = tp('Трасса', 'Course', 'Trasa', {
    es: 'Recorrido',
    fr: 'Parcours',
    de: 'Bahn',
    it: 'Percorso',
  });
  const periodFilterLabel = tp('Период', 'Period', 'Okres', {
    es: 'Periodo',
    fr: 'Période',
    de: 'Zeitraum',
    it: 'Periodo',
  });

  const courseLabels: Record<LeaderboardCourseFilter, string> = {
    all: tp('Все', 'All', 'Wszystkie', {
      es: 'Todas',
      fr: 'Toutes',
      de: 'Alle',
      it: 'Tutte',
    }),
    short: tp('Короткая', 'Short', 'Krótka', {
      es: 'Corta',
      fr: 'Courte',
      de: 'Kurz',
      it: 'Breve',
    }),
    medium: tp('Средняя', 'Medium', 'Średnia', {
      es: 'Media',
      fr: 'Moyenne',
      de: 'Mittel',
      it: 'Media',
    }),
    long: tp('Длинная', 'Long', 'Długa', {
      es: 'Larga',
      fr: 'Longue',
      de: 'Lang',
      it: 'Lunga',
    }),
  };
  const periodLabels: Record<LeaderboardPeriodFilter, string> = {
    all: tp('За всё время', 'All time', 'Od początku', {
      es: 'Histórico',
      fr: 'Depuis toujours',
      de: 'Gesamt',
      it: 'Sempre',
    }),
    week: tp('Эта неделя', 'This week', 'Ten tydzień', {
      es: 'Esta semana',
      fr: 'Cette semaine',
      de: 'Diese Woche',
      it: 'Questa settimana',
    }),
    today: tp('Сегодня', 'Today', 'Dzisiaj', {
      es: 'Hoy',
      fr: "Aujourd'hui",
      de: 'Heute',
      it: 'Oggi',
    }),
  };

  const personalBestLabel = tp('Личный рекорд', 'Personal best', 'Rekord osobisty', {
    es: 'Récord personal',
    fr: 'Record personnel',
    de: 'Bestzeit',
    it: 'Record personale',
  });
  const timeLabel = tp('Время', 'Time', 'Czas', {
    es: 'Tiempo',
    fr: 'Temps',
    de: 'Zeit',
    it: 'Tempo',
  });
  const scoreLabel = tp('Очки', 'Score', 'Punkty', {
    es: 'Puntos',
    fr: 'Score',
    de: 'Punkte',
    it: 'Punti',
  });

  const emptyTitle = tp(
    'Пока нет финишей',
    'No races yet',
    'Brak wyścigów',
    {
      es: 'Aún no hay regatas',
      fr: 'Pas encore de courses',
      de: 'Noch keine Rennen',
      it: 'Ancora nessuna regata',
    },
  );
  const emptySubtitle = tp(
    'Финишируй гонку, и она встанет в таблицу. Лучший заезд по каждой трассе попадает на верх.',
    'Finish a race and it will land here. The best run on each course tops the board.',
    'Ukończ wyścig, a pojawi się tutaj. Najlepszy wynik na każdej trasie trafia na górę.',
    {
      es: 'Termina una regata y aparecerá aquí. Tu mejor regata en cada recorrido encabeza la tabla.',
      fr: 'Termine une course et elle apparaîtra ici. Ta meilleure course sur chaque parcours arrive en tête.',
      de: 'Beende ein Rennen und es erscheint hier. Der beste Lauf pro Bahn steht oben.',
      it: 'Completa una regata e comparirà qui. La tua regata migliore su ogni percorso va in cima.',
    },
  );
  const emptyFilteredTitle = tp(
    'Пусто в этом срезе',
    'No races in this slice',
    'Brak wyników dla tego filtra',
    {
      es: 'Nada con este filtro',
      fr: 'Rien pour ce filtre',
      de: 'Nichts für diesen Filter',
      it: 'Niente con questo filtro',
    },
  );
  const emptyFilteredSubtitle = tp(
    'Сбрось фильтр или сделай заезд по выбранной трассе.',
    'Clear the filter or finish a run on the selected course.',
    'Wyczyść filtr albo ukończ wyścig na wybranej trasie.',
    {
      es: 'Borra el filtro o termina una regata en el recorrido elegido.',
      fr: 'Efface le filtre ou termine une course sur le parcours choisi.',
      de: 'Setz den Filter zurück oder beende ein Rennen auf der gewählten Bahn.',
      it: 'Rimuovi il filtro o completa una regata sul percorso scelto.',
    },
  );
  const emptyCtaLabel = tp('К гонке', 'To the race', 'Do wyścigu', {
    es: 'A la regata',
    fr: 'À la course',
    de: 'Zum Rennen',
    it: 'Alla regata',
  });
  const clearFiltersLabel = tp('Сбросить фильтры', 'Clear filters', 'Wyczyść filtry', {
    es: 'Borrar filtros',
    fr: 'Effacer les filtres',
    de: 'Filter zurücksetzen',
    it: 'Cancella filtri',
  });

  const localTabLabel = tp('Личные', 'Personal', 'Osobiste', { es: 'Personal', fr: 'Perso', de: 'Persönlich', it: 'Personale' });
  const globalTabLabel = tp('Глобальная', 'Global', 'Globalne', { es: 'Global', fr: 'Global', de: 'Global', it: 'Globale' });
  const difficultyLabel = tp('Сложность', 'Difficulty', 'Trudność', { es: 'Dificultad', fr: 'Difficulté', de: 'Schwierigkeit', it: 'Difficoltà' });
  const windLabelText = tp('Ветер', 'Wind', 'Wiatr', { es: 'Viento', fr: 'Vent', de: 'Wind', it: 'Vento' });
  const diffLabels: Record<Difficulty, string> = {
    easy: tp('Легко', 'Easy', 'Łatwy', { es: 'Fácil', fr: 'Facile', de: 'Leicht', it: 'Facile' }),
    medium: tp('Средне', 'Medium', 'Średni', { es: 'Medio', fr: 'Moyen', de: 'Mittel', it: 'Medio' }),
    hard: tp('Сложно', 'Hard', 'Trudny', { es: 'Difícil', fr: 'Difficile', de: 'Schwer', it: 'Difficile' }),
  };
  const windLabels: Record<Wind, string> = {
    light: tp('Слабый', 'Light', 'Słaby', { es: 'Flojo', fr: 'Faible', de: 'Schwach', it: 'Leggero' }),
    medium: tp('Средний', 'Medium', 'Średni', { es: 'Medio', fr: 'Moyen', de: 'Mittel', it: 'Medio' }),
    heavy: tp('Сильный', 'Strong', 'Silny', { es: 'Fuerte', fr: 'Fort', de: 'Stark', it: 'Forte' }),
  };
  const globalEmptyTitle = tp('Пока пусто', 'No entries yet', 'Jeszcze pusto', { es: 'Aún vacío', fr: 'Encore vide', de: 'Noch leer', it: 'Ancora vuoto' });
  const globalEmptySub = tp(
    'Никто ещё не финишировал в этом классе. Сыграй гонку - и попадёшь сюда.',
    'No finishes in this class yet. Play a race to land here.',
    'Nikt jeszcze nie dopłynął do mety w tej klasie. Zagraj wyścig, a trafisz tutaj.',
    {
      es: 'Aún no hay llegadas en esta clase. Juega una regata para aparecer aquí.',
      fr: 'Aucune arrivée dans cette classe. Joue une course pour y figurer.',
      de: 'Noch keine Zieleinläufe in dieser Klasse. Fahr ein Rennen, um hier zu landen.',
      it: 'Nessun arrivo in questa classe. Gioca una regata per comparire qui.',
    },
  );
  const globalErrorTitle = tp('Не загрузилось', 'Could not load', 'Nie udało się wczytać', { es: 'No se pudo cargar', fr: 'Échec du chargement', de: 'Laden fehlgeschlagen', it: 'Caricamento non riuscito' });
  const retryLabel = tp('Повторить', 'Retry', 'Ponów', { es: 'Reintentar', fr: 'Réessayer', de: 'Erneut versuchen', it: 'Riprova' });
  const anonLabel = tp('Аноним', 'Anon', 'Anonim', { es: 'Anónimo', fr: 'Anonyme', de: 'Anonym', it: 'Anonimo' });

  const rows = useMemo(() => {
    const filteredByCourse = filterByCourse(history.races, courseFilter);
    const filteredByPeriod = filterByPeriod(filteredByCourse, periodFilter);
    return bestPerCourse(filteredByPeriod);
  }, [history.races, courseFilter, periodFilter]);

  const courseFilters: LeaderboardCourseFilter[] = ['all', 'short', 'medium', 'long'];
  const periodFilters: LeaderboardPeriodFilter[] = ['all', 'week', 'today'];

  const showEmptyAll = history.ready && history.races.length === 0;
  const showEmptyFiltered = history.ready && history.races.length > 0 && rows.length === 0;
  const filtersActive = courseFilter !== 'all' || periodFilter !== 'all';

  return (
    <Screen>
      <Stack.Screen options={{ title: screenTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text variant="caption" style={styles.subtitle}>
            {subtitle}
          </Text>
        </View>

        {/* Personal / Global tabs */}
        <View style={[styles.chipRow, styles.tabRow]}>
          <FilterChip label={localTabLabel} active={tab === 'local'} onPress={() => setTab('local')} />
          <FilterChip label={globalTabLabel} active={tab === 'global'} onPress={() => setTab('global')} />
        </View>

        {tab === 'local' ? (
          <>
            <View style={styles.filterBlock}>
              <Text variant="muted" style={styles.filterLabel}>
                {courseFilterLabel.toUpperCase()}
              </Text>
              <View style={styles.chipRow}>
                {courseFilters.map((id) => (
                  <FilterChip
                    key={id}
                    label={courseLabels[id]}
                    active={courseFilter === id}
                    onPress={() => setCourseFilter(id)}
                  />
                ))}
              </View>
            </View>
            <View style={styles.filterBlock}>
              <Text variant="muted" style={styles.filterLabel}>
                {periodFilterLabel.toUpperCase()}
              </Text>
              <View style={styles.chipRow}>
                {periodFilters.map((id) => (
                  <FilterChip
                    key={id}
                    label={periodLabels[id]}
                    active={periodFilter === id}
                    onPress={() => setPeriodFilter(id)}
                  />
                ))}
              </View>
            </View>

            {showEmptyAll ? (
              <EmptyState
                icon="leaderboard"
                title={emptyTitle}
                subtitle={emptySubtitle}
                cta={{ label: emptyCtaLabel, onPress: () => router.push('/game') }}
              />
            ) : null}

            {showEmptyFiltered ? (
              <EmptyState
                icon="leaderboard"
                title={emptyFilteredTitle}
                subtitle={emptyFilteredSubtitle}
                cta={
                  filtersActive
                    ? {
                        label: clearFiltersLabel,
                        onPress: () => {
                          setCourseFilter('all');
                          setPeriodFilter('all');
                        },
                      }
                    : undefined
                }
              />
            ) : null}

            {rows.map((race, idx) => (
              <LeaderboardRow
                key={race.id}
                rank={idx + 1}
                race={race}
                tp={tp}
                lang={lang}
                personalBestLabel={personalBestLabel}
                timeLabel={timeLabel}
                scoreLabel={scoreLabel}
                onPress={() => router.push(`/replay/${encodeURIComponent(race.id)}`)}
              />
            ))}
          </>
        ) : (
          <>
            <View style={styles.filterBlock}>
              <Text variant="muted" style={styles.filterLabel}>
                {difficultyLabel.toUpperCase()}
              </Text>
              <View style={styles.chipRow}>
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                  <FilterChip key={d} label={diffLabels[d]} active={gDiff === d} onPress={() => setGDiff(d)} />
                ))}
              </View>
            </View>
            <View style={styles.filterBlock}>
              <Text variant="muted" style={styles.filterLabel}>
                {windLabelText.toUpperCase()}
              </Text>
              <View style={styles.chipRow}>
                {(['light', 'medium', 'heavy'] as Wind[]).map((w) => (
                  <FilterChip key={w} label={windLabels[w]} active={gWind === w} onPress={() => setGWind(w)} />
                ))}
              </View>
            </View>

            {gLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={colors.accentCyan} />
              </View>
            ) : null}

            {!gLoading && gError ? (
              <EmptyState
                icon="leaderboard"
                title={globalErrorTitle}
                subtitle={gError}
                cta={{ label: retryLabel, onPress: () => setGNonce((n) => n + 1) }}
              />
            ) : null}

            {!gLoading && !gError && gRows && gRows.length === 0 ? (
              <EmptyState
                icon="leaderboard"
                title={globalEmptyTitle}
                subtitle={globalEmptySub}
                cta={{ label: emptyCtaLabel, onPress: () => router.push('/game') }}
              />
            ) : null}

            {!gLoading && !gError && gRows
              ? gRows.map((r, idx) => (
                  <GlobalRow
                    key={`${r.sid}-${idx}`}
                    rank={idx + 1}
                    row={r}
                    timeLabel={timeLabel}
                    scoreLabel={scoreLabel}
                    anonLabel={anonLabel}
                  />
                ))
              : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

interface LeaderboardRowProps {
  rank: number;
  race: RaceRecord;
  tp: ReturnType<typeof useI18n>['tp'];
  lang: Lang;
  personalBestLabel: string;
  timeLabel: string;
  scoreLabel: string;
  onPress: () => void;
}

function LeaderboardRow({
  rank,
  race,
  tp,
  lang,
  personalBestLabel,
  timeLabel,
  scoreLabel,
  onPress,
}: LeaderboardRowProps) {
  const course = findCourse(race.courseId);
  const courseTitle = course.title(tp);
  const tier = scoreTier(race.score);
  const tierColor = SCORE_TIER_COLOR[tier];
  const date = relativeDate(race.finishedAt, lang);

  return (
    <Card
      onPress={onPress}
      style={styles.row}
      accessibilityLabel={`#${rank} ${courseTitle}, ${formatTime(race.timeSec)}, ${race.score}`}
    >
      <View style={styles.rowHeader}>
        <View style={styles.rankBlock}>
          <Text style={styles.rank}>{`#${rank}`}</Text>
        </View>
        <View style={styles.titleBlock}>
          <Text variant="subtitle" style={styles.courseTitle} numberOfLines={1}>
            {courseTitle}
          </Text>
          <Text variant="muted" style={styles.dateText}>
            {date}
          </Text>
        </View>
        <View style={styles.pbPill}>
          <Text style={styles.pbPillText}>{personalBestLabel.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statCell}>
          <Text style={styles.statLabel}>{timeLabel.toUpperCase()}</Text>
          <Text style={styles.statValue}>{formatTime(race.timeSec)}</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statLabel}>{scoreLabel.toUpperCase()}</Text>
          <Text style={[styles.statValue, { color: tierColor }]}>{race.score}</Text>
        </View>
      </View>
    </Card>
  );
}

function GlobalRow({
  rank,
  row,
  timeLabel,
  scoreLabel,
  anonLabel,
}: {
  rank: number;
  row: GlobalLeaderboardRow;
  timeLabel: string;
  scoreLabel: string;
  anonLabel: string;
}) {
  const tier = scoreTier(row.score ?? 0);
  const tierColor = SCORE_TIER_COLOR[tier];
  const name = row.nickname && row.nickname.trim().length > 0 ? row.nickname : anonLabel;
  return (
    <Card
      style={styles.row}
      accessibilityLabel={`#${rank} ${name}, ${formatTime(row.finish_time_sec)}, ${row.score ?? 0}`}
    >
      <View style={styles.rowHeader}>
        <View style={styles.rankBlock}>
          <Text style={styles.rank}>{`#${rank}`}</Text>
        </View>
        <View style={styles.titleBlock}>
          <Text variant="subtitle" style={styles.courseTitle} numberOfLines={1}>
            {name}
          </Text>
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statCell}>
          <Text style={styles.statLabel}>{timeLabel.toUpperCase()}</Text>
          <Text style={styles.statValue}>{formatTime(row.finish_time_sec)}</Text>
        </View>
        <View style={styles.statCell}>
          <Text style={styles.statLabel}>{scoreLabel.toUpperCase()}</Text>
          <Text style={[styles.statValue, { color: tierColor }]}>{row.score ?? 0}</Text>
        </View>
      </View>
    </Card>
  );
}

interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function FilterChip({ label, active, onPress }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && !active && styles.chipPressed,
      ]}
    >
      <Text
        style={[styles.chipText, active && styles.chipTextActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  header: {
    marginBottom: spacing.sm,
  },
  tabRow: {
    marginBottom: spacing.xs,
  },
  loadingBox: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
  },
  filterBlock: {
    gap: spacing.sm,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.textSecondary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.bgCard,
    borderColor: colors.borderCyanFaint,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: colors.surfaceCyanSoft,
    borderColor: colors.borderCyanStrong,
  },
  chipPressed: {
    backgroundColor: colors.bgCardHover,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.accentCyan,
    fontWeight: '600',
  },
  row: {
    gap: spacing.sm,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rankBlock: {
    width: 44,
    alignItems: 'flex-start',
  },
  rank: {
    color: colors.accentCyan,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.4,
    fontVariant: ['tabular-nums'],
  },
  titleBlock: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 16,
  },
  dateText: {
    fontSize: 11,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  pbPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(138, 97, 0, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(138, 97, 0, 0.4)',
  },
  pbPillText: {
    color: colors.warning,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.xs,
  },
  statCell: {
    flex: 0,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
