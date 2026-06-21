import { Stack, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../../src/i18n/context';
import { Card, Icon, type IconName, Screen, Text } from '../../src/design-system/components';
import { BOOTCAMP_TOTAL_MINUTES, bootcampLessons } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { useBootcampProgress } from '../../src/persistence/bootcamp';
import { groupLessonsByDay } from '../../src/bootcamp/days';
import { colors, spacing } from '../../src/design-system/tokens';

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
 * Bootcamp index. The 8 lessons render under "Day N" headers - the
 * "race-ready in a week" arc - while the per-lesson Card and the
 * top-level "completed N of 8" line stay intact for parity with v0.2.
 *
 * Lesson summary text comes through `legacyPick` so all 7 languages
 * resolve from the same JSON shape used on web (`{field}Ru`/`En`/`Pl`
 * required, `Es`/`Fr`/`De`/`It` optional).
 */
export default function BootcampIndex() {
  const { tp, lang } = useI18n();
  const router = useRouter();
  const { isCompleted, completedIds, ready } = useBootcampProgress();

  const headerTitle = tp('Bootcamp', 'Bootcamp', 'Bootcamp');

  const summary = tp(
    `${bootcampLessons.length} уроков, около ${BOOTCAMP_TOTAL_MINUTES} мин в сумме - 7 дней до регаты`,
    `${bootcampLessons.length} lessons, around ${BOOTCAMP_TOTAL_MINUTES} min total - 7 days to the regatta`,
    `${bootcampLessons.length} lekcji, okolo ${BOOTCAMP_TOTAL_MINUTES} min - 7 dni do regat`,
    {
      es: `${bootcampLessons.length} lecciones, unos ${BOOTCAMP_TOTAL_MINUTES} min - 7 dias a la regata`,
      fr: `${bootcampLessons.length} leçons, environ ${BOOTCAMP_TOTAL_MINUTES} min - 7 jours avant la regate`,
      de: `${bootcampLessons.length} Lektionen, etwa ${BOOTCAMP_TOTAL_MINUTES} Min - 7 Tage bis zur Regatta`,
      it: `${bootcampLessons.length} lezioni, circa ${BOOTCAMP_TOTAL_MINUTES} min - 7 giorni alla regata`,
    },
  );

  const progressLine = tp(
    `Пройдено ${completedIds.size} из ${bootcampLessons.length}`,
    `Completed ${completedIds.size} of ${bootcampLessons.length}`,
    `Ukonczone ${completedIds.size} z ${bootcampLessons.length}`,
    {
      es: `Completadas ${completedIds.size} de ${bootcampLessons.length}`,
      fr: `Terminees ${completedIds.size} sur ${bootcampLessons.length}`,
      de: `Abgeschlossen ${completedIds.size} von ${bootcampLessons.length}`,
      it: `Completate ${completedIds.size} di ${bootcampLessons.length}`,
    },
  );

  const days = groupLessonsByDay();

  return (
    <Screen>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <Text variant="caption">{summary}</Text>
          {ready && completedIds.size > 0 ? (
            <Text variant="muted" style={styles.progress}>{progressLine}</Text>
          ) : null}
        </View>

        {days.map(({ day, lessons }) => {
          const dayDone = lessons.filter((l) => isCompleted(l.id)).length;
          const dayLabel = tp(
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
          const dayProgress = tp(
            `${dayDone} из ${lessons.length} ${lessons.length === 1 ? 'готов' : 'готово'}`,
            `${dayDone} of ${lessons.length} done`,
            `${dayDone} z ${lessons.length} gotowe`,
            {
              es: `${dayDone} de ${lessons.length} hechas`,
              fr: `${dayDone} sur ${lessons.length} fait`,
              de: `${dayDone} von ${lessons.length} fertig`,
              it: `${dayDone} di ${lessons.length} fatte`,
            },
          );
          const dayComplete = dayDone === lessons.length;
          return (
            <View key={day} style={styles.dayBlock}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{dayLabel.toUpperCase()}</Text>
                <Text
                  style={[
                    styles.dayCount,
                    dayComplete ? styles.dayCountDone : null,
                  ]}
                >
                  {dayProgress}
                </Text>
              </View>

              {lessons.map((lesson) => {
                const title = legacyPick(lesson, 'title', lang);
                const lessonSummary = legacyPick(lesson, 'summary', lang);
                const completed = isCompleted(lesson.id);
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
                const lessonA11y = tp(
                  `Урок ${lesson.order}: ${title}${completed ? ', пройден' : ''}`,
                  `Lesson ${lesson.order}: ${title}${completed ? ', completed' : ''}`,
                  `Lekcja ${lesson.order}: ${title}${completed ? ', ukonczona' : ''}`,
                  {
                    es: `Leccion ${lesson.order}: ${title}${completed ? ', completada' : ''}`,
                    fr: `Lecon ${lesson.order} : ${title}${completed ? ', terminee' : ''}`,
                    de: `Lektion ${lesson.order}: ${title}${completed ? ', abgeschlossen' : ''}`,
                    it: `Lezione ${lesson.order}: ${title}${completed ? ', completata' : ''}`,
                  },
                );
                return (
                  <Card
                    key={lesson.id}
                    onPress={() => router.push(`/bootcamp/${lesson.id}`)}
                    style={styles.lesson}
                    accessibilityLabel={lessonA11y}
                    accessibilityState={{ selected: completed }}
                  >
                    <View style={styles.lessonHeader}>
                      <View style={styles.iconWrap}>
                        <Icon
                          name={LESSON_ICON[lesson.id] ?? 'compass'}
                          size={20}
                          color={completed ? colors.success : colors.textSecondary}
                        />
                        <Text style={styles.emojiHidden}>{lesson.emoji}</Text>
                      </View>
                      <View style={styles.lessonText}>
                        <Text variant="subtitle">{title}</Text>
                        <Text variant="muted" style={styles.meta}>{meta}</Text>
                      </View>
                      {completed ? (
                        <View style={styles.checkBadge}>
                          <Icon name="check" size={14} color={colors.success} />
                        </View>
                      ) : null}
                    </View>
                    <Text variant="caption" style={styles.lessonSummary}>{lessonSummary}</Text>
                  </Card>
                );
              })}
            </View>
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
  intro: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  progress: {
    marginTop: spacing.xs,
    color: colors.success,
  },
  dayBlock: {
    marginTop: spacing.md,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  dayLabel: {
    color: colors.accentCyan,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  dayCount: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  dayCountDone: {
    color: colors.success,
  },
  lesson: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconWrap: {
    marginRight: spacing.md,
    marginTop: 2,
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  meta: {
    marginTop: 2,
  },
  checkBadge: {
    minWidth: 32,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 11,
    backgroundColor: colors.surfaceSuccess,
    borderColor: colors.borderSuccess,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    marginTop: 2,
  },
  checkText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  lessonSummary: {
    marginTop: spacing.sm,
    lineHeight: 18,
  },
});
