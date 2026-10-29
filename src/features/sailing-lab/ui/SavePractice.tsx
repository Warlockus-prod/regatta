'use client';

import { useRef, useState } from "react";
import type { Language } from "../../../lib/product/catalog";
import { practiceCopy } from "../../../data/sailing-lab/practice-copy";
import { practiceStorage } from "../runtime/checkpoint-storage";
import { saveMeasuredAttempt, type AssessmentAttempt, type PracticeId, type PracticeSummary } from "../lessons/practice-results";
import { AssessmentReview } from "./AssessmentReview";

/** Mount only after the exercise state machine has verified completion. */
export function SavePractice({ id, lang, measure, onRepeat }: {
  id: PracticeId; lang: Language;
  /** Measured before/after for twist/depth assessments; `at` stays fixed across retries. */
  measure?: (at: number) => AssessmentAttempt | null;
  onRepeat?: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [summary, setSummary] = useState<PracticeSummary | null>(null);
  const at = useRef<number | null>(null);
  const save = async () => {
    if (status === "saving" || status === "saved") return;
    setStatus("saving");
    at.current ??= Date.now();
    try {
      const attempt = (id === "twist" || id === "depth") && measure ? measure(at.current) : null;
      if (attempt && (id === "twist" || id === "depth")) setSummary(await saveMeasuredAttempt(id, attempt, practiceStorage));
      else await practiceStorage.write(JSON.stringify({ version: 1, completed: { [id]: at.current } }));
      setStatus("saved");
    }
    catch { setStatus("error"); }
  };
  return <div className="my-4 space-y-2">
    {status === "saved" ? <p role="status">✓ {practiceCopy.saved[lang]}</p> : <button type="button" disabled={status === "saving"} onClick={() => { void save(); }} className="min-h-11 rounded-md border border-[var(--accent-cyan)] px-4 py-3 text-sm text-[var(--accent-cyan)]">{practiceCopy[status === "saving" ? "saving" : "save"][lang]}</button>}
    {status === "error" && <p role="alert">{practiceCopy.saveError[lang]}</p>}
    {summary && (id === "twist" || id === "depth") && <AssessmentReview task={id} summary={summary} lang={lang} onRepeat={onRepeat} />}
  </div>;
}
