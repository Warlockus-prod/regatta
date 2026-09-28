import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useI18n } from '../../src/i18n/context';
import { Icon, type IconName, Screen, Text } from '../../src/design-system/components';
import { BOOTCAMP_TOTAL_MINUTES, bootcampLessons } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { useBootcampProgress } from '../../src/persistence/bootcamp';
import { groupLessonsByDay, summarizeContinue } from '../../src/bootcamp/days';
import { destinations } from '../../../src/lib/product/catalog';
import { colors, radii, shadow, spacing } from '../../src/design-system/tokens';

/**
 * Map each lesson id to a designer icon. Bootcamp lessons cover the
 * 8-step arc (wind -> rules -> mini race); quick refresh lessons reuse
 * the same icon family. Lessons not in the map fall back to `compass`,
 * which is the safe neutral.
 */
const LESSON_ICON: Record<string, IconName> = {
  'wind-direction': 'wind',
  'points-of-sail': 'compass',
  'how-sail-works': 'sail-trim',
  tacking: 'tack',
  jibing: 'jibe',
  'vmg-beating': 'vmg',
  'simple-rules': 'book',
  'mini-race': 'flag',
  'q-wind': 'wind',
  'q-courses': 'compass',
  'q-maneuvers': 'tack',
  'q-rules': 'book',
  'q-start': 'flag',
  'q-race': 'sail',
};

/**
 * Bootcamp index: the course path. Lessons sit under "Day N" headers (the
 * "race-ready in a week" arc). Each row shows its state (done, next, not
 * started); the next lesson is the raised white card, so the path reads at
 * a glance. Counts come from the saved progress only.
 *
 * Lesson summary text comes through `legacyPick` so all 7 languages
 * resolve from the same JSON shape used on web (`{field}Ru`/`En`/`Pl`
 * required, `Es`/`Fr`/`De`/`It` optional).
 */
export default function BootcampIndex() {
  const { tp, lang } = useI18n();
  const router = useRouter();
  const { isCompleted, completedIds, lastViewedLessonId, ready } = useBootcampProgress();
  const course = destinations.find((d) => d.id === 'course')!;
  const next = ready ? summarizeContinue(completedIds, lastViewedLessonId).nextLesson : null;

  const summary = tp(
    `${bootcampLessons.length} уроков, около ${BOOTCAMP_TOTAL_MINUTES} мин в сумме - 7 дней до регаты`,
    `${bootcampLessons.length} lessons, around ${BOOTCAMP_TOTAL_MINUTES} min total - 7 days to the regatta`,
    `${bootcampLessons.length} lekcji, łącznie około ${BOOTCAMP_TOTAL_MINUTES} min - 7 dni do regat`,
    {
      es: `${bootcampLessons.length} lecciones, unos ${BOOTCAMP_TOTAL_MINUTES} min en total - 7 días para la regata`,
      fr: `${bootcampLessons.length} leçons, environ ${BOOTCAMP_TOTAL_MINUTES} min au total - 7 jours avant la régate`,
      de: `${bootcampLessons.length} Lektionen, insgesamt etwa ${BOOTCAMP_TOTAL_MINUTES} Min. - 7 Tage bis zur Regatta`,
      it: `${bootcampLessons.length} lezioni, circa ${BOOTCAMP_TOTAL_MINUTES} min in tutto - 7 giorni alla regata`,
    },
  );

  const progressLine = tp(
    `Пройдено ${completedIds.size} из ${bootcampLessons.length}`,
    `Completed ${completedIds.size} of ${bootcampLessons.length}`,
    `Ukończono ${completedIds.size} z ${bootcampLessons.length}`,
    {
      es: `Completadas: ${completedIds.size} de ${bootcampLessons.length}`,
      fr: `Terminées : ${completedIds.size} sur ${bootcampLessons.length}`,
      de: `Abgeschlossen: ${completedIds.size} von ${bootcampLessons.length}`,
      it: `Completate: ${completedIds.size} su ${bootcampLessons.length}`,
    },
  );

  const days = groupLessonsByDay();

  return (
    <Screen>
      <Stack.Screen options={{ title: course.title[lang] }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <Text style={styles.summary}>{summary}</Text>
          {ready && completedIds.size > 0 ? (
            <View style={styles.progressBlock}>
              <Text style={styles.progress}>{progressLine}</Text>
              <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                <View style={[styles.fill, { width: `${(completedIds.size / bootcampLessons.length) * 100}%` }]} />
              </View>
            </View>
          ) : null}
        </View>

        {days.map(({ day, lessons }) => {
          const dayDone = lessons.filter((l) => isCompleted(l.id)).length;
          const dayLabel = tp(
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
          const dayProgress = tp(
            `${dayDone} из ${lessons.length} ${lessons.length === 1 ? 'готов' : 'готово'}`,
            `${dayDone} of ${lessons.length} done`,
            `${dayDone} z ${lessons.length} gotowe`,
            {
              es: `${dayDone} de ${lessons.length} hechas`,
              fr: `${dayDone} sur ${lessons.length} faites`,
              de: `${dayDone} von ${lessons.length} fertig`,
              it: `${dayDone} su ${lessons.length} fatte`,
            },
          );
          const dayComplete = dayDone === lessons.length;
          return (
            <View key={day} style={styles.dayBlock}>
              <View style={styles.dayHeader}>
                <Text variant="eyebrow">{dayLabel}</Text>
                <Text style={[styles.dayCount, dayComplete ? styles.dayCountDone : null]}>
                  {dayProgress}
                </Text>
              </View>

              {lessons.map((lesson) => {
                const title = legacyPick(lesson, 'title', lang);
                const lessonSummary = legacyPick(lesson, 'summary', lang);
                const completed = isCompleted(lesson.id);
                const current = !completed && next?.id === lesson.id;
                const state = completed
                  ? tp('пройден', 'done', 'ukończona', { es: 'completada', fr: 'terminée', de: 'abgeschlossen', it: 'completata' })
                  : current
                    ? tp('следующий', 'next', 'następna', { es: 'siguiente', fr: 'suivante', de: 'als Nächstes', it: 'prossima' })
                    : null;
                const meta = [
                  tp(
                    `Урок ${lesson.order}`,
                    `Lesson ${lesson.order}`,
                    `Lekcja ${lesson.order}`,
                    { es: `Lección ${lesson.order}`, fr: `Leçon ${lesson.order}`, de: `Lektion ${lesson.order}`, it: `Lezione ${lesson.order}` },
                  ),
                  tp(`${lesson.estMinutes} мин`, `${lesson.estMinutes} min`, `${lesson.estMinutes} min`, { de: `${lesson.estMinutes} Min.` }),
                  state,
                ].filter(Boolean).join(' · ');
                const lessonA11y = tp(
                  `Урок ${lesson.order}: ${title}${completed ? ', пройден' : ''}`,
                  `Lesson ${lesson.order}: ${title}${completed ? ', completed' : ''}`,
                  `Lekcja ${lesson.order}: ${title}${completed ? ', ukończona' : ''}`,
                  {
                    es: `Lección ${lesson.order}: ${title}${completed ? ', completada' : ''}`,
                    fr: `Leçon ${lesson.order} : ${title}${completed ? ', terminée' : ''}`,
                    de: `Lektion ${lesson.order}: ${title}${completed ? ', abgeschlossen' : ''}`,
                    it: `Lezione ${lesson.order}: ${title}${completed ? ', completata' : ''}`,
                  },
                );
                return (
                  <Pressable
                    key={lesson.id}
                    onPress={() => router.push(`/bootcamp/${lesson.id}`)}
                    style={({ pressed }) => [styles.lesson, current && styles.lessonCurrent, pressed && styles.lessonPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={lessonA11y}
                    accessibilityState={{ selected: completed }}
                  >
                    <View style={[styles.iconTile, completed && styles.iconTileDone]}>
                      <Icon
                        name={LESSON_ICON[lesson.id] ?? 'compass'}
                        size={24}
                        color={completed ? colors.accentTeal : colors.textPrimary}
                      />
                      <Text style={styles.emojiHidden}>{lesson.emoji}</Text>
                    </View>
                    <View style={styles.lessonText}>
                      <Text style={[styles.meta, completed && styles.metaDone, current && styles.metaCurrent]}>{meta}</Text>
                      <Text style={styles.lessonTitle}>{title}</Text>
                      <Text style={styles.lessonSummary} numberOfLines={2}>{lessonSummary}</Text>
                    </View>
                    <LessonState state={completed ? 'done' : current ? 'next' : 'todo'} />
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </Screen>
  );
}

/** Done: teal disc with a check. Next: blue disc with a play mark. Else a ring. */
function LessonState({ state }: { state: 'done' | 'next' | 'todo' }) {
  return (
    <Svg width={30} height={30} viewBox="0 0 30 30" style={styles.state} accessibilityElementsHidden importantForAccessibility="no">
      {state === 'todo' ? (
        <Circle cx={15} cy={15} r={13} stroke={colors.sandStrong} strokeWidth={2} fill="none" />
      ) : (
        <Circle cx={15} cy={15} r={14} fill={state === 'done' ? colors.accentTeal : colors.accentCyan} />
      )}
      {state === 'done' ? <Path d="m9.5 15.5 3.7 3.7 7.3-8" stroke="#ffffff" strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {state === 'next' ? <Path d="M12.5 10.2v9.6l7.4-4.8z" fill="#ffffff" /> : null}
    </Svg>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xxl,
  },
  intro: {
    paddingHorizontal: spacing.xl - 4,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  summary: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  progressBlock: {
    gap: spacing.sm,
  },
  progress: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.sand,
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accentCyan,
  },
  dayBlock: {
    marginTop: spacing.lg,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl - 4,
    paddingBottom: spacing.sm,
  },
  dayCount: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  dayCountDone: {
    color: colors.accentTeal,
  },
  lesson: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: spacing.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.md,
    borderRadius: radii.card,
  },
  lessonCurrent: {
    backgroundColor: colors.bgCard,
    ...shadow.card,
  },
  lessonPressed: {
    backgroundColor: colors.bgCardHover,
  },
  iconTile: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTileDone: {
    backgroundColor: colors.surfaceSuccess,
  },
  emojiHidden: {
    position: 'absolute',
    width: 0,
    height: 0,
    opacity: 0,
    fontSize: 1,
  },
  lessonText: {
    flex: 1,
    gap: 2,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  metaDone: {
    color: colors.accentTeal,
  },
  metaCurrent: {
    color: colors.accentCyan,
  },
  lessonTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  lessonSummary: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  state: {
    marginLeft: spacing.xs,
  },
});
