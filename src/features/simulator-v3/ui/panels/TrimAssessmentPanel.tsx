'use client';

import { assessmentCopy as c } from "../../../../data/sailing-lab/assessment-copy";
import type { Language } from "../../../../lib/product/catalog";
import type { TrimAssessment } from "../../../sailing-lab/lessons/trim-assessment";

const button = "min-h-11 rounded-md border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--accent-cyan)]";
export function TrimAssessmentPanel({ assessment: a, lang, record, answer, restart, close }: {
  assessment: TrimAssessment; lang: Language; record(): void; answer(value: boolean): void; restart(): void; close(): void;
}) {
  const base = a.baseline, now = a.result ?? a.last;
  return <section aria-label={c.title[lang]} className="space-y-3 py-3">
    <h3 className="text-base font-semibold text-[var(--text-primary)]">{c.title[lang]}: {c[a.task][lang]}</h3>
    <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{c[a.task === "twist" ? "twistGoal" : "depthGoal"][lang]}</p>
    {a.phase === "baseline" && <p role="status" className="text-sm text-[var(--text-secondary)]">{c.baseline[lang]}</p>}
    {base && now && <div className="text-sm text-[var(--text-primary)]">
      <p className="mb-2 text-[var(--text-secondary)]">{c.comparison[lang]}</p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 tabular-nums">
        <dt>{c.boom[lang]}</dt><dd>{Math.abs(base.yaw).toFixed(1)}° → {Math.abs(now.yaw).toFixed(1)}°</dd>
        <dt>{c.top[lang]}</dt><dd>{base.twist.toFixed(1)}° → {now.twist.toFixed(1)}°</dd>
        <dt>{c.lower[lang]}</dt><dd>100% → {(100 * now.depth / base.depth).toFixed(1)}%</dd>
      </dl>
    </div>}
    {a.phase === "perform" && <>
      <p className="text-sm text-[var(--text-secondary)]">{c.wait[lang]} {(Math.floor(a.stableFor * 10) / 10).toFixed(1)}/3 s</p>
      <button className={button} onClick={record}>{c.record[lang]}</button>
    </>}
    {a.phase === "explain" && <fieldset className="space-y-2"><legend className="mb-2 text-sm text-[var(--text-primary)]">{c.why[lang]}</legend>
      <button className={button} onClick={() => answer(false)}>{c.wrong[lang]}</button>
      <button className={button} onClick={() => answer(true)}>{c[a.task === "twist" ? "twistReason" : "depthReason"][lang]}</button>
    </fieldset>}
    {a.issue && <p role="status" className="text-sm text-[var(--text-primary)]">{c[a.issue][lang]}</p>}
    {a.phase === "complete" && <p role="status" className="text-sm text-[var(--text-primary)]">{c.done[lang]}</p>}
    <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{c.temporary[lang]}</p>
    <div className="flex flex-wrap gap-2"><button className={button} onClick={restart}>{c.restart[lang]}</button><button className={button} onClick={close}>{c.close[lang]}</button></div>
  </section>;
}
