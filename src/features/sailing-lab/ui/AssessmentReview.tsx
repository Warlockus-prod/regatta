'use client';

import Link from "next/link";
import type { Language } from "../../../lib/product/catalog";
import { assessmentCopy as c } from "../../../data/sailing-lab/assessment-copy";
import { formatEffect, reviewAssessment } from "../lessons/assessment-review";
import type { AssessmentId, PracticeSummary } from "../lessons/practice-results";

const fill = (text: string, vars: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (whole, key: string) => key in vars ? String(vars[key]) : whole);
const action = "inline-flex min-h-11 items-center rounded-md border border-[var(--accent-cyan)] px-4 py-2 text-sm text-[var(--accent-cyan)] focus-visible:outline-2 focus-visible:outline-[var(--accent-cyan)]";

/** Before/after of the last measured attempt, a causal line, the trend against
 * the previous attempt and a way to repeat the task without hints. */
export function AssessmentReview({ task, summary, lang, repeatHref, onRepeat }: {
  task: AssessmentId; summary: PracticeSummary; lang: Language; repeatHref?: string; onRepeat?: () => void;
}) {
  if (!summary.completed) return null;
  const review = summary.record ? reviewAssessment(task, summary.record) : null;
  const repeat = repeatHref ? <Link className={action} href={repeatHref}>{c.repeat[lang]} →</Link>
    : onRepeat ? <button type="button" className={action} onClick={onRepeat}>{c.repeat[lang]}</button> : null;
  return <section data-testid={`assessment-review-${task}`} aria-label={`${c.reviewTitle[lang]}: ${c[task][lang]}`} className="my-3 space-y-2 text-sm text-[var(--text-primary)]">
    <p className="font-semibold">✓ {c[task][lang]} · {fill(c.attempts[lang], { n: summary.attempts })}</p>
    {review ? <>
      <p className="text-[var(--text-secondary)]">{c.reviewTitle[lang]}</p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 tabular-nums">
        <dt>{c.boom[lang]}</dt><dd>{review.last.baseline.boom.toFixed(1)}° → {review.last.result.boom.toFixed(1)}°</dd>
        <dt>{c.top[lang]}</dt><dd>{review.last.baseline.twist.toFixed(1)}° → {review.last.result.twist.toFixed(1)}°</dd>
        <dt>{c.lower[lang]}</dt><dd>100% → {(100 * review.last.result.depth / review.last.baseline.depth).toFixed(1)}%</dd>
      </dl>
      <p data-testid="assessment-cause">{fill(c[task === "twist" ? "twistCause" : "depthCause"][lang], { effect: review.effect.toFixed(1), side: review.side.toFixed(1), boom: review.boom.toFixed(1) })}</p>
      <p data-testid="assessment-trend" data-trend={review.trend}>{fill(c[review.trend][lang], { prev: review.previousEffect === null ? "" : formatEffect(task, review.previousEffect), now: formatEffect(task, review.effect) })}</p>
    </> : <p className="text-[var(--text-secondary)]">{c.unmeasured[lang]}</p>}
    {repeat}
  </section>;
}
