import type { SrcQuestion } from "@/data/src-radio";

export function createExam(bank: SrcQuestion[], random = Math.random): SrcQuestion[] {
  const shuffle = (items: SrcQuestion[]) => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  return shuffle(([1, 2] as const).flatMap((part) =>
    shuffle(bank.filter((question) => question.part === part)).slice(0, 5),
  ));
}

// A 2 x 5 multiple-choice practice test: 60% in EACH subject.
// Practical skills are assessed separately by UKE, not by this score.
export function gradeExam(queue: SrcQuestion[], answers: Record<string, number>) {
  const parts = ([1, 2] as const).map((part) => {
    const questions = queue.filter((question) => question.part === part);
    const correct = questions.filter((question) => answers[question.id] === question.correct).length;
    return { part, correct, total: questions.length, passed: questions.length === 5 && correct >= 3 };
  });
  return { parts, passed: parts.every((part) => part.passed) };
}
