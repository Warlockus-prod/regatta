import type { AssessmentAttempt, AssessmentId, AssessmentRecord } from "./practice-results";

// Review of the last measured trim assessment: what changed (before -> after),
// how large the intended effect was, and whether a repeat beat the previous
// attempt. The intended effect is the task goal: opening the top (deg) for
// "twist", flattening the lower sail (% of the baseline depth index) for "depth".

export type ReviewTrend = "first" | "better" | "same" | "weaker";
export interface AttemptEffect { effect: number; side: number; boom: number }
export interface AssessmentReviewData extends AttemptEffect {
  task: AssessmentId;
  attempts: number;
  trend: ReviewTrend;
  previousEffect: number | null;
  last: AssessmentAttempt;
}

/** Below this difference two attempts count as the same: 0.2 deg of top
 * opening or 2 percentage points of lower-depth reduction. */
export const TREND_TOLERANCE: Record<AssessmentId, number> = { twist: .2, depth: 2 };

export function attemptEffect(task: AssessmentId, attempt: AssessmentAttempt): AttemptEffect {
  const { baseline: b, result: r } = attempt;
  const depthChange = 100 * (r.depth / b.depth - 1);
  return task === "twist"
    ? { effect: r.twist - b.twist, side: Math.abs(depthChange), boom: Math.abs(r.boom - b.boom) }
    : { effect: -depthChange, side: Math.abs(r.twist - b.twist), boom: Math.abs(r.boom - b.boom) };
}

export function reviewTrend(task: AssessmentId, now: number, previous: number | null): ReviewTrend {
  if (previous === null) return "first";
  const diff = now - previous;
  return Math.abs(diff) < TREND_TOLERANCE[task] ? "same" : diff > 0 ? "better" : "weaker";
}

export function reviewAssessment(task: AssessmentId, record: AssessmentRecord): AssessmentReviewData {
  const now = attemptEffect(task, record.last);
  const previousEffect = record.previous ? attemptEffect(task, record.previous).effect : null;
  return { task, attempts: record.count, ...now, previousEffect, trend: reviewTrend(task, now.effect, previousEffect), last: record.last };
}

export const formatEffect = (task: AssessmentId, value: number) => `${value.toFixed(1)}${task === "twist" ? "°" : "%"}`;
