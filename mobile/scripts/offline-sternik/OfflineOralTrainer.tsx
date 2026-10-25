import { useState } from "react";
import { ORAL_PROMPTS } from "../../../src/app/sternik/ustny/oralPrompts";
import { record as recordWeak } from "../../../src/app/radio/weakSpots";
import { postSternikProgress } from "./bridge";
import { gradeTypedAnswer } from "./oral";

/** Same prompts and rubric as the website. This adapter grades typed text locally. */
export default function OfflineOralTrainer() {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<ReturnType<typeof gradeTypedAnswer>>(null);
  const [showModel, setShowModel] = useState(false);
  const prompt = ORAL_PROMPTS[index];
  const reset = (next: number) => { setIndex(next); setAnswer(""); setResult(null); setShowModel(false); };
  const grade = () => {
    const checked = gradeTypedAnswer(prompt, answer);
    if (!checked) return;
    setResult(checked); setShowModel(true);
    recordWeak("oral", checked.checks.filter(c => !c.ok).map(c => ({ id: `${prompt.id}:${c.id}`, label: c.label })), checked.checks.filter(c => c.ok).map(c => ({ id: `${prompt.id}:${c.id}` })));
    postSternikProgress(true);
  };
  return <section className="space-y-4" data-testid="sternik-offline-oral">
    <div><h1 className="text-2xl font-bold">Odpowiedź ustna: ćwiczenie pisemne</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">Wpisz własną odpowiedź po polsku. Sprawdzanie punktów odbywa się na urządzeniu, bez mikrofonu i internetu. To pomoc w nauce treści, nie ocena wymowy ani zastępstwo egzaminatora.</p></div>
    <label className="block text-sm">Pytanie
      <select className="mt-2 block w-full min-h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3" value={index} onChange={e => reset(Number(e.target.value))}>
        {ORAL_PROMPTS.map((item, i) => <option key={item.id} value={i}>{i + 1}. {item.topic}</option>)}
      </select>
    </label>
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
      <p className="text-lg font-semibold">{prompt.questionPl}</p><p className="mt-2 text-sm text-[var(--text-secondary)]">{prompt.whyPl}</p>
      <label className="mt-4 block text-sm" htmlFor="sternik-typed-answer">Twoja odpowiedź</label>
      <textarea id="sternik-typed-answer" className="mt-2 block w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3 text-base" rows={6} maxLength={8000} value={answer} onChange={e => { setAnswer(e.target.value); setResult(null); }} placeholder="Odpowiedz własnymi słowami, wymieniając najważniejsze punkty." />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={!answer.trim()} onClick={grade} className="min-h-11 rounded-xl bg-[var(--accent-cyan)] px-4 font-semibold text-[var(--accent-ink)] disabled:opacity-40">Sprawdź odpowiedź</button>
        <button type="button" onClick={() => setShowModel(true)} className="min-h-11 rounded-xl border border-[var(--border-subtle)] px-4">Pokaż wzór bez oceniania</button>
      </div>
    </div>
    {result && <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4" role="status" aria-live="polite">
      <h2 className="font-semibold">{result.passed ? "Wymagane punkty ujęte" : "Uzupełnij odpowiedź"}: {result.score}%</h2>
      <ul className="mt-3 space-y-2">{result.checks.map(check => <li key={check.id} className="text-sm" style={{ color: check.ok ? "var(--success)" : "var(--warning)" }}>{check.ok ? "✓" : "○"} {check.label}</li>)}</ul>
      <p className="mt-3 text-xs text-[var(--text-muted)]">Lista sprawdza obecność kluczowych elementów. Może nie rozpoznać poprawnego sformułowania; porównaj odpowiedź ze wzorem.</p>
    </div>}
    {showModel && <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4"><h2 className="font-semibold">Wzorcowa odpowiedź</h2><p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{prompt.modelPl}</p></div>}
    <button type="button" className="min-h-11 rounded-xl border border-[var(--border-subtle)] px-4" onClick={() => reset((index + 1) % ORAL_PROMPTS.length)}>Następne pytanie</button>
  </section>;
}
