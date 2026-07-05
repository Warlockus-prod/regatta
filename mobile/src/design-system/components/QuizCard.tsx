/**
 * QuizCard - one multiple-choice question with 2-4 options.
 *
 * State machine is owned by the parent screen:
 *   1. `revealed === false` and no `selectedId` -> options are tap-able,
 *      none highlighted.
 *   2. `revealed === false` and `selectedId` set -> the picked option
 *      is highlighted in cyan; user can re-tap a different option to
 *      change the pick.
 *   3. `revealed === true` -> options become non-interactive. The
 *      correct option is tinted green, a wrong selection (if any) is
 *      tinted red, and an explanation card appears below.
 *
 * The labels arrive already-localised from the parent so this component
 * stays language-agnostic. The only English/RU/PL/ES/FR/DE/IT strings
 * live in QuizCard itself: the "Correct" / "Not quite" badge and the
 * "Why" explanation label.
 */

import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { useI18n } from '../../i18n/context';
import type { QuizQuestion } from '../../bootcamp/quiz-data';
import { pickPrompt } from '../../bootcamp/quiz-data';
import { radii, spacing } from '../tokens';
import type { ThemeColors } from '../tokens';
import { useThemedStyles } from '../theme';

export interface QuizCardProps {
  question: QuizQuestion;
  /** Currently picked option id; undefined means no pick yet. */
  selectedId?: string;
  /** Parent calls this when the user taps an option (only effective pre-reveal). */
  onSelect: (optionId: string) => void;
  /** True after the user has tapped "Check answer". */
  revealed: boolean;
  /** Id of the correct option. Pre-computed by the parent for O(1) styling. */
  correctId: string;
}

type OptionTone = 'idle' | 'picked' | 'correct' | 'wrong';

function toneFor(
  optionId: string,
  selectedId: string | undefined,
  revealed: boolean,
  correctId: string,
): OptionTone {
  if (revealed) {
    if (optionId === correctId) return 'correct';
    if (optionId === selectedId) return 'wrong';
    return 'idle';
  }
  return optionId === selectedId ? 'picked' : 'idle';
}

export function QuizCard({
  question,
  selectedId,
  onSelect,
  revealed,
  correctId,
}: QuizCardProps) {
  const { tp, lang } = useI18n();
  const styles = useThemedStyles(makeStyles);
  const toneStyles = useThemedStyles(makeToneStyles);
  const bulletStyles = useThemedStyles(makeBulletStyles);
  const bulletTextStyles = useThemedStyles(makeBulletTextStyles);

  const correctBadge = tp('Верно', 'Correct', 'Dobrze', {
    es: 'Correcto',
    fr: 'Correct',
    de: 'Richtig',
    it: 'Corretto',
  });
  const wrongBadge = tp('Не совсем', 'Not quite', 'Nie do konca', {
    es: 'No del todo',
    fr: 'Pas tout a fait',
    de: 'Nicht ganz',
    it: 'Non proprio',
  });
  const whyLabel = tp('Почему', 'Why', 'Dlaczego', {
    es: 'Por que',
    fr: 'Pourquoi',
    de: 'Warum',
    it: 'Perche',
  });

  const promptText = pickPrompt(question.prompt, lang);
  const explanationText = pickPrompt(question.explanation, lang);
  const userPicked = revealed && selectedId !== undefined;
  const userCorrect = userPicked && selectedId === correctId;

  return (
    <View style={styles.card}>
      <Text variant="subtitle" style={styles.prompt}>{promptText}</Text>

      <View style={styles.options}>
        {question.options.map((opt, idx) => {
          const tone = toneFor(opt.id, selectedId, revealed, correctId);
          const label = pickPrompt(opt.label, lang);
          const numberLetter = String.fromCharCode(65 + idx); // A / B / C / D
          return (
            <Pressable
              key={opt.id}
              accessibilityRole="button"
              accessibilityLabel={`${numberLetter}. ${label}`}
              accessibilityState={{
                selected: opt.id === selectedId,
                disabled: revealed,
              }}
              onPress={revealed ? undefined : () => onSelect(opt.id)}
              style={({ pressed }) => [
                styles.option,
                toneStyles[tone],
                pressed && !revealed && styles.optionPressed,
              ]}
            >
              <View style={[styles.bullet, bulletStyles[tone]]}>
                <Text style={[styles.bulletText, bulletTextStyles[tone]]}>
                  {numberLetter}
                </Text>
              </View>
              <View style={styles.optionLabelWrap}>
                <Text variant="body" style={styles.optionLabel}>{label}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {revealed ? (
        <View
          style={[
            styles.explanation,
            userCorrect ? styles.explanationCorrect : styles.explanationWrong,
          ]}
        >
          <Text
            style={[
              styles.badge,
              userCorrect ? styles.badgeCorrect : styles.badgeWrong,
            ]}
          >
            {(userCorrect ? correctBadge : wrongBadge).toUpperCase()}
          </Text>
          <Text variant="muted" style={styles.whyLabel}>
            {whyLabel.toUpperCase()}
          </Text>
          <Text variant="body" style={styles.explanationBody}>
            {explanationText}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const makeToneStyles = (c: ThemeColors) =>
  StyleSheet.create({
    idle: {
      backgroundColor: c.bgCard,
      borderColor: c.borderCyanFaint,
    },
    picked: {
      backgroundColor: 'rgba(0, 212, 255, 0.12)',
      borderColor: c.accentCyan,
    },
    correct: {
      backgroundColor: 'rgba(68, 255, 136, 0.12)',
      borderColor: c.success,
    },
    wrong: {
      backgroundColor: 'rgba(255, 68, 68, 0.12)',
      borderColor: c.danger,
    },
  });

const makeBulletStyles = (c: ThemeColors) =>
  StyleSheet.create({
    idle: {
      backgroundColor: c.bgSecondary,
      borderColor: c.borderCyanFaint,
    },
    picked: {
      backgroundColor: c.accentCyan,
      borderColor: c.accentCyan,
    },
    correct: {
      backgroundColor: c.success,
      borderColor: c.success,
    },
    wrong: {
      backgroundColor: c.danger,
      borderColor: c.danger,
    },
  });

const makeBulletTextStyles = (c: ThemeColors) =>
  StyleSheet.create({
    idle: { color: c.textSecondary },
    picked: { color: c.bgPrimary },
    correct: { color: c.bgPrimary },
    wrong: { color: c.textPrimary },
  });

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.bgCard,
      borderColor: c.borderCyanFaint,
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing.lg,
    },
    prompt: {
      marginBottom: spacing.lg,
      lineHeight: 24,
    },
    options: {
      gap: spacing.sm,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderRadius: radii.md,
    },
    optionPressed: {
      opacity: 0.85,
    },
    bullet: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    bulletText: {
      fontSize: 13,
      fontWeight: '700',
    },
    optionLabelWrap: {
      flex: 1,
    },
    optionLabel: {
      lineHeight: 20,
    },
    explanation: {
      marginTop: spacing.lg,
      padding: spacing.md,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    explanationCorrect: {
      backgroundColor: 'rgba(68, 255, 136, 0.08)',
      borderColor: 'rgba(68, 255, 136, 0.35)',
    },
    explanationWrong: {
      backgroundColor: 'rgba(255, 170, 0, 0.08)',
      borderColor: 'rgba(255, 170, 0, 0.35)',
    },
    badge: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
      marginBottom: spacing.sm,
    },
    badgeCorrect: {
      color: c.success,
    },
    badgeWrong: {
      color: c.warning,
    },
    whyLabel: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.2,
      marginBottom: spacing.xs,
    },
    explanationBody: {
      lineHeight: 22,
    },
  });
