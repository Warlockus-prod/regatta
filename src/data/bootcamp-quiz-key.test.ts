import { describe, expect, it } from "vitest";
import { BOOTCAMP_QUIZZES, isQuizPassed as quizPassed } from "./bootcamp-quiz";
import { BOOTCAMP_QUIZ_KEY, isQuizPassed, quizKeyForLesson } from "./bootcamp-quiz-key";

// Saved foundation checks are validated and graded against this key. If it
// drifts from the quizzes, a learner who answered correctly is shown "not
// passed" (or a wrong answer passes) on every page except the check itself.
describe("quiz answer key matches BOOTCAMP_QUIZZES", () => {
  it("question ids, option ids and the one correct option, per lesson", () => {
    const fromQuizzes = Object.fromEntries(Object.entries(BOOTCAMP_QUIZZES).map(([lesson, questions]) => [lesson, questions.map(question => {
      const correct = question.options.filter(option => option.correct);
      expect(correct, question.id).toHaveLength(1);
      return { id: question.id, options: question.options.map(option => option.id), correct: correct[0].id };
    })]));
    expect(JSON.parse(JSON.stringify(BOOTCAMP_QUIZ_KEY))).toEqual(fromQuizzes);
  });
  it("has no key for an unknown lesson and keeps one pass mark", () => {
    expect(quizKeyForLesson("missing")).toEqual([]);
    expect(quizPassed).toBe(isQuizPassed);
    expect([isQuizPassed(2, 3), isQuizPassed(3, 3), isQuizPassed(1, 2), isQuizPassed(0, 0)]).toEqual([false, true, false, false]);
  });
});
