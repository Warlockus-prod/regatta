'use client';

import { useState } from "react";
import type { Language } from "../../../lib/product/catalog";
import { guideCopy } from "../../../data/sailing-lab/lesson-guide";
import { practiceStorage } from "../runtime/checkpoint-storage";
import type { PracticeId } from "../lessons/practice-results";

/** Mount only after the exercise state machine has verified completion. */
export function SavePractice({ id, lang }: { id: PracticeId; lang: Language }) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const save = async () => {
    if (status === "saving" || status === "saved") return;
    setStatus("saving");
    try { await practiceStorage.write(JSON.stringify({ version: 1, completed: { [id]: Date.now() } })); setStatus("saved"); }
    catch { setStatus("error"); }
  };
  return <div className="my-4 space-y-2">
    {status === "saved" ? <p role="status">✓ {guideCopy.saved[lang]}</p> : <button type="button" disabled={status === "saving"} onClick={() => { void save(); }} className="min-h-11 rounded-md border border-[var(--accent-cyan)] px-4 py-3 text-sm text-[var(--accent-cyan)]">{guideCopy[status === "saving" ? "saving" : "save"][lang]}</button>}
    {status === "error" && <p role="alert">{guideCopy.saveError[lang]}</p>}
  </div>;
}
