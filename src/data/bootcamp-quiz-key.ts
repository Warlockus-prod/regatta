// ============================================================================
// Answer key of the foundation quizzes: question ids, option ids and the
// correct option, without prompts and explanations. Saved progress is
// validated and graded against this key on every page (lesson footer, home
// continue card); the full bootcamp-quiz.ts text loads only where a check is
// shown. bootcamp-quiz-key.test.ts deep-compares the key with BOOTCAMP_QUIZZES,
// so a new question or a changed correct answer fails until this file follows.
// ============================================================================

export interface QuizKeyQuestion { id: string; options: readonly string[]; correct: string }

export const BOOTCAMP_QUIZ_KEY: Readonly<Record<string, readonly QuizKeyQuestion[]>> = {
  "wind-direction": [
    { id: "wd-q1", options: ["wd-q1-a", "wd-q1-b", "wd-q1-c"], correct: "wd-q1-a" },
    { id: "wd-q2", options: ["wd-q2-a", "wd-q2-b", "wd-q2-c"], correct: "wd-q2-b" },
    { id: "wd-q3", options: ["wd-q3-a", "wd-q3-b", "wd-q3-c"], correct: "wd-q3-b" },
  ],
  "points-of-sail": [
    { id: "pos-q1", options: ["pos-q1-a", "pos-q1-b", "pos-q1-c"], correct: "pos-q1-b" },
    { id: "pos-q2", options: ["pos-q2-a", "pos-q2-b", "pos-q2-c"], correct: "pos-q2-a" },
    { id: "pos-q3", options: ["pos-q3-a", "pos-q3-b", "pos-q3-c"], correct: "pos-q3-b" },
  ],
  "how-sail-works": [
    { id: "hs-q1", options: ["hs-q1-a", "hs-q1-b", "hs-q1-c"], correct: "hs-q1-a" },
    { id: "hs-q2", options: ["hs-q2-a", "hs-q2-b", "hs-q2-c"], correct: "hs-q2-b" },
  ],
  "tacking": [
    { id: "tk-q1", options: ["tk-q1-a", "tk-q1-b", "tk-q1-c"], correct: "tk-q1-a" },
    { id: "tk-q2", options: ["tk-q2-a", "tk-q2-b", "tk-q2-c"], correct: "tk-q2-a" },
  ],
  "jibing": [
    { id: "jb-q1", options: ["jb-q1-a", "jb-q1-b", "jb-q1-c"], correct: "jb-q1-a" },
    { id: "jb-q2", options: ["jb-q2-a", "jb-q2-b", "jb-q2-c"], correct: "jb-q2-b" },
  ],
  "vmg-beating": [
    { id: "vmg-q1", options: ["vmg-q1-a", "vmg-q1-b", "vmg-q1-c"], correct: "vmg-q1-a" },
    { id: "vmg-q2", options: ["vmg-q2-a", "vmg-q2-b", "vmg-q2-c"], correct: "vmg-q2-b" },
  ],
  "simple-rules": [
    { id: "sr-q1", options: ["sr-q1-a", "sr-q1-b", "sr-q1-c"], correct: "sr-q1-a" },
    { id: "sr-q2", options: ["sr-q2-a", "sr-q2-b", "sr-q2-c"], correct: "sr-q2-b" },
    { id: "sr-q3", options: ["sr-q3-a", "sr-q3-b", "sr-q3-c"], correct: "sr-q3-a" },
  ],
  "mini-race": [
    { id: "mr-q1", options: ["mr-q1-a", "mr-q1-b", "mr-q1-c"], correct: "mr-q1-a" },
    { id: "mr-q2", options: ["mr-q2-a", "mr-q2-b", "mr-q2-c"], correct: "mr-q2-a" },
  ],
};

export function quizKeyForLesson(lessonId: string): readonly QuizKeyQuestion[] {
  return BOOTCAMP_QUIZ_KEY[lessonId] ?? [];
}

/** Pass threshold: >=70% correct counts as a passed quiz. */
export const QUIZ_PASS_THRESHOLD = 0.7 as const;

/** True when a recorded score (correct, total) is at or above the pass mark. */
export function isQuizPassed(score: number, total: number): boolean {
  if (total <= 0) return false;
  return score / total >= QUIZ_PASS_THRESHOLD;
}
