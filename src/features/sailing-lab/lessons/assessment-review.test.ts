import { describe, expect, it } from "vitest";
import { attemptEffect, reviewAssessment, reviewTrend } from "./assessment-review";
import { addAssessmentAttempt, emptyPracticeResults, type AssessmentAttempt } from "./practice-results";
import { assessmentCopy } from "../../../data/sailing-lab/assessment-copy";

const twist = (at: number, after: number): AssessmentAttempt => ({ at, baseline: { twist: 4, depth: .2, boom: 10 }, result: { twist: after, depth: .2, boom: 10.4 } });
const depth = (at: number, after: number): AssessmentAttempt => ({ at, baseline: { twist: 5, depth: .2, boom: 12 }, result: { twist: 5.3, depth: after, boom: 12 } });

describe("assessment review", () => {
  it("measures the intended effect and the side effect of each task", () => {
    expect(attemptEffect("twist", twist(1, 5.5))).toMatchObject({ effect: 1.5, side: 0 });
    const flat = attemptEffect("depth", depth(1, .15));
    expect(flat.effect).toBeCloseTo(25);
    expect(flat.side).toBeCloseTo(.3);
    expect(attemptEffect("twist", twist(1, 5.5)).boom).toBeCloseTo(.4);
  });
  it("chooses first, better, same or weaker against the previous attempt", () => {
    expect(reviewTrend("twist", 1.5, null)).toBe("first");
    expect(reviewTrend("twist", 2, 1.5)).toBe("better");
    expect(reviewTrend("twist", 1.6, 1.5)).toBe("same");
    expect(reviewTrend("twist", 1.1, 1.5)).toBe("weaker");
    expect(reviewTrend("depth", 26, 25)).toBe("same");
    expect(reviewTrend("depth", 30, 25)).toBe("better");
  });
  it("reviews a repeat against the previous measured attempt, and a first one as first", () => {
    const one = addAssessmentAttempt(emptyPracticeResults(), "depth", depth(10, .16));
    expect(reviewAssessment("depth", one.attempts!.depth!)).toMatchObject({ trend: "first", attempts: 1, previousEffect: null });
    const two = addAssessmentAttempt(one, "depth", depth(20, .12));
    const review = reviewAssessment("depth", two.attempts!.depth!);
    expect(review).toMatchObject({ trend: "better", attempts: 2 });
    expect(review.previousEffect).toBeCloseTo(20);
    const three = addAssessmentAttempt(two, "depth", depth(30, .16));
    expect(reviewAssessment("depth", three.attempts!.depth!).trend).toBe("weaker");
  });
  it("has every review line in all seven languages with the placeholders it needs", () => {
    const needs = { twistCause: ["effect", "side", "boom"], depthCause: ["effect", "side", "boom"], better: ["prev", "now"], same: ["prev", "now"], weaker: ["prev", "now"], attempts: ["n"], first: [], unmeasured: [], repeat: [], reviewTitle: [] } as const;
    for (const [key, vars] of Object.entries(needs)) {
      const line = assessmentCopy[key as keyof typeof needs];
      for (const lang of ["ru", "en", "pl", "es", "fr", "de", "it"] as const) {
        expect(line[lang].length, `${key}.${lang}`).toBeGreaterThan(0);
        for (const v of vars) expect(line[lang], `${key}.${lang}`).toContain(`{${v}}`);
      }
    }
  });
});
