import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useI18n } from '../../src/i18n/context';
import { Icon, type IconName, Screen, Text } from '../../src/design-system/components';
import { BOOTCAMP_TOTAL_MINUTES, bootcampLessons } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { useBootcampProgress } from '../../src/persistence/bootcamp';
import { getLessonDay } from '../../src/bootcamp/days';
import { lessonStatus, nextBootcampLesson, passedLessonIds } from '../../src/bootcamp/status';
import { useBootcampQuiz } from '../../src/persistence/bootcamp-quiz';
import { useLearningBookmark } from '../../src/persistence/learning-bookmark';
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
 * Bootcamp index: the course path. One row per lesson with its day, minutes
 * and state. States come from evidence (`src/bootcamp/status.ts`): passed
 * (quiz passed, or marked done where a lesson has no quiz), viewed, or new;
 * the next lesson is the raised white card with a play mark. Course progress
 * sits once at the top, not repeated per day.
 *
 * Lesson titles come through `legacyPick` so all 7 languages resolve from
 * the same JSON shape used on web (`{field}Ru`/`En`/`Pl` required,
 * `Es`/`Fr`/`De`/`It` optional).
 */
export default function BootcampIndex() {
  const { tp, lang } = useI18n();
  const router = useRouter();
  const { completedIds, doneIds, lastViewedLessonId, ready } = useBootcampProgress();
  // At accessibility text sizes the icon tile gives its width to the title.
  const roomy = useWindowDimensions().fontScale < 1.6;
  const { results: quizResults, ready: quizReady } = useBootcampQuiz();
  useLearningBookmark('bootcamp');
  const course = destinations.find((d) => d.id === 'course')!;
  const loaded = ready && quizReady;
  const evidence = { viewedIds: completedIds, quizResults, doneIds, lastViewedLessonId };
  const passed = loaded ? passedLessonIds(evidence).size : 0;
  const next = loaded ? nextBootcampLesson(evidence) : null;
  const total = bootcampLessons.length;

  const summary = tp(
    `${total} уроков, около ${BOOTCAMP_TOTAL_MINUTES} мин в сумме - 7 дней до регаты`,
    `${total} lessons, around ${BOOTCAMP_TOTAL_MINUTES} min total - 7 days to the regatta`,
    `${total} lekcji, łącznie około ${BOOTCAMP_TOTAL_MINUTES} min - 7 dni do regat`,
    {
      es: `${total} lecciones, unos ${BOOTCAMP_TOTAL_MINUTES} min en total - 7 días para la regata`,
      fr: `${total} leçons, environ ${BOOTCAMP_TOTAL_MINUTES} min au total - 7 jours avant la régate`,
      de: `${total} Lektionen, insgesamt etwa ${BOOTCAMP_TOTAL_MINUTES} Min. - 7 Tage bis zur Regatta`,
      it: `${total} lezioni, circa ${BOOTCAMP_TOTAL_MINUTES} min in tutto - 7 giorni alla regata`,
    },
  );
  const progressLine = tp(
    `Пройдено ${passed} из ${total}`,
    `Passed ${passed} of ${total}`,
    `Zaliczono ${passed} z ${total}`,
    {
      es: `Superadas: ${passed} de ${total}`,
      fr: `Réussies : ${passed} sur ${total}`,
      de: `Bestanden: ${passed} von ${total}`,
      it: `Superate: ${passed} di ${total}`,
    },
  );
  const passedWord = tp('пройден', 'passed', 'zaliczona', { es: 'superada', fr: 'réussie', de: 'bestanden', it: 'superata' });
  const viewedWord = tp('просмотрен', 'viewed', 'otwarta', { es: 'vista', fr: 'vue', de: 'angesehen', it: 'vista' });
  const nextWord = tp('следующий', 'next', 'następna', { es: 'siguiente', fr: 'suivante', de: 'als Nächstes', it: 'prossima' });

  const lessons = [...bootcampLessons].sort((a, b) => a.order - b.order);

  return (
    <Screen>
      <Stack.Screen options={{ title: course.title[lang] }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <Text style={styles.summary}>{summary}</Text>
          <View style={styles.progressBlock}>
            <Text style={styles.progress}>{loaded ? progressLine : ' '}</Text>
            <View style={styles.track} accessibilityRole="progressbar" accessibilityLabel={progressLine} accessibilityValue={{ min: 0, max: total, now: passed }}>
              <View style={[styles.fill, { width: `${(passed / total) * 100}%` }]} />
            </View>
          </View>
        </View>

        <View style={styles.list}>
          {lessons.map((lesson) => {
            const title = legacyPick(lesson, 'title', lang);
            const status = loaded ? lessonStatus(lesson.id, evidence) : 'new';
            const current = status !== 'passed' && next?.id === lesson.id;
            const day = getLessonDay(lesson.id);
            const dayLabel = tp(`День ${day}`, `Day ${day}`, `Dzień ${day}`, {
              es: `Día ${day}`,
              fr: `Jour ${day}`,
              de: `Tag ${day}`,
              it: `Giorno ${day}`,
            });
            const stateWord = status === 'passed' ? passedWord : current ? nextWord : status === 'viewed' ? viewedWord : null;
            const meta = [
              dayLabel,
              tp(`${lesson.estMinutes} мин`, `${lesson.estMinutes} min`, `${lesson.estMinutes} min`, { de: `${lesson.estMinutes} Min.` }),
              stateWord,
            ].filter(Boolean).join(' · ');
            const lessonA11y = tp(
              `Урок ${lesson.order}: ${title}`,
              `Lesson ${lesson.order}: ${title}`,
              `Lekcja ${lesson.order}: ${title}`,
              {
                es: `Lección ${lesson.order}: ${title}`,
                fr: `Leçon ${lesson.order} : ${title}`,
                de: `Lektion ${lesson.order}: ${title}`,
                it: `Lezione ${lesson.order}: ${title}`,
              },
            ) + (stateWord ? `, ${stateWord}` : '');
            return (
              <Pressable
                key={lesson.id}
                onPress={() => router.push(`/bootcamp/${lesson.id}`)}
                style={({ pressed }) => [styles.lesson, current && styles.lessonCurrent, pressed && styles.lessonPressed]}
                accessibilityRole="button"
                accessibilityLabel={lessonA11y}
                accessibilityState={{ selected: status === 'passed' }}
              >
                {roomy && (
                  <View style={[styles.iconTile, status === 'passed' && styles.iconTileDone]}>
                    <Icon
                      name={LESSON_ICON[lesson.id] ?? 'compass'}
                      size={24}
                      color={status === 'passed' ? colors.accentTeal : colors.textPrimary}
                    />
                  </View>
                )}
                <Text style={styles.emojiHidden}>{lesson.emoji}</Text>
                <View style={styles.lessonText}>
                  <Text style={[styles.meta, status === 'passed' && styles.metaDone, current && styles.metaCurrent]}>{meta}</Text>
                  <Text style={styles.lessonTitle}>{title}</Text>
                </View>
                <LessonState state={status === 'passed' ? 'done' : current ? 'next' : status === 'viewed' ? 'viewed' : 'todo'} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

/**
 * Passed: teal disc with a check. Next: blue disc with a play mark. Viewed: a
 * ring with a dot. Not started: an empty ring. Shape differs, not just colour.
 */
function LessonState({ state }: { state: 'done' | 'next' | 'viewed' | 'todo' }) {
  return (
    <Svg width={30} height={30} viewBox="0 0 30 30" style={styles.state} accessibilityElementsHidden importantForAccessibility="no">
      {state === 'todo' || state === 'viewed' ? (
        <Circle cx={15} cy={15} r={13} stroke={state === 'viewed' ? colors.textMuted : colors.sandStrong} strokeWidth={2} fill="none" />
      ) : (
        <Circle cx={15} cy={15} r={14} fill={state === 'done' ? colors.accentTeal : colors.accentCyan} />
      )}
      {state === 'viewed' ? <Circle cx={15} cy={15} r={4} fill={colors.textMuted} /> : null}
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
  list: {
    marginTop: spacing.lg,
    gap: spacing.xs,
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
  state: {
    marginLeft: spacing.xs,
  },
});
