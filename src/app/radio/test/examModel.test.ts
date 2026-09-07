import { describe, expect, it } from "vitest";
import { SRC_BANK } from "@/data/src-radio";
import { createExam, gradeExam } from "./examModel";

describe("SRC mock exam", () => {
  it("draws five unique questions per subject without mutating the bank", () => {
    const before = SRC_BANK.map((q) => q.id);
    const queue = createExam(SRC_BANK, () => 0.4);
    expect(queue).toHaveLength(10);
    expect(new Set(queue.map((q) => q.id)).size).toBe(10);
    expect(queue.filter((q) => q.part === 1)).toHaveLength(5);
    expect(SRC_BANK.map((q) => q.id)).toEqual(before);
  });

  it("does not let a strong subject compensate for a failed one", () => {
    const queue = createExam(SRC_BANK);
    const answers: Record<string, number> = {};
    let second = 0;
    for (const q of queue) {
      if (q.part === 1 || ++second <= 2) answers[q.id] = q.correct;
      else answers[q.id] = (q.correct + 1) % 3;
    }
    const result = gradeExam(queue, answers);
    expect(result.parts.map((p) => p.correct)).toEqual([5, 2]);
    expect(result.passed).toBe(false);
  });

  it("requires at least three correct answers in each complete subject", () => {
    const queue = createExam(SRC_BANK);
    const answers: Record<string, number> = {};
    for (const part of [1, 2]) {
      queue.filter((q) => q.part === part).slice(0, 3).forEach((q) => { answers[q.id] = q.correct; });
    }
    expect(gradeExam(queue, answers).passed).toBe(true);
    expect(gradeExam(queue.slice(0, 3), answers).passed).toBe(false);
  });
});
