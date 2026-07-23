export const QUESTION_PROGRESS_KEY = "radio.src.progress.v2";
const LEGACY_KEY = "radio.src.progress.v1";

export interface QuestionStat {
  seen: number;
  correct: number;
  streak: number;
  lastAnsweredAt?: number;
}

export type QuestionProgress = Record<string, QuestionStat>;

function isProgress(value: unknown): value is QuestionProgress {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function loadQuestionProgress(): QuestionProgress {
  if (typeof window === "undefined") return {};
  try {
    const current = JSON.parse(
      window.localStorage.getItem(QUESTION_PROGRESS_KEY) ?? "null",
    );
    if (isProgress(current)) return current;

    const legacy = JSON.parse(window.localStorage.getItem(LEGACY_KEY) ?? "{}");
    if (isProgress(legacy)) {
      window.localStorage.setItem(QUESTION_PROGRESS_KEY, JSON.stringify(legacy));
      return legacy;
    }
  } catch {
    return {};
  }
  return {};
}

export function saveQuestionProgress(progress: QuestionProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUESTION_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Progress is optional in private browsing.
  }
}

export function withQuestionAnswer(
  progress: QuestionProgress,
  questionId: string,
  correct: boolean,
): QuestionProgress {
  const previous = progress[questionId] ?? { seen: 0, correct: 0, streak: 0 };
  return {
    ...progress,
    [questionId]: {
      seen: previous.seen + 1,
      correct: previous.correct + (correct ? 1 : 0),
      streak: correct ? previous.streak + 1 : 0,
      lastAnsweredAt: Date.now(),
    },
  };
}
