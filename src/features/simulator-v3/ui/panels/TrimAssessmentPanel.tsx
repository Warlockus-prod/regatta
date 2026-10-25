'use client';

import { assessmentCopy as c } from "../../../../data/sailing-lab/assessment-copy";
import { words, type Language } from "../../../../lib/product/catalog";
import type { TrimAssessment } from "../../../sailing-lab/lessons/trim-assessment";

const button = "min-h-11 rounded-md border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--accent-cyan)]";
export function TrimAssessmentGoal({ assessment: a, lang }: { assessment: TrimAssessment; lang: Language }) {
  const goal = a.phase === "baseline"
    ? words("Не меняй снасти. Дождись исходного состояния.", "Keep controls unchanged. Wait for the baseline.", "Nie zmieniaj nastaw. Poczekaj na stan wyjściowy.", "No cambies controles. Espera el estado inicial.", "Garde les réglages. Attends l'état initial.", "Leinen unverändert lassen. Ausgangszustand abwarten.", "Non cambiare i comandi. Attendi lo stato iniziale.")
    : a.phase === "explain" ? c.why : a.phase === "complete"
    ? words("Задача выполнена. Сохрани результат ниже.", "Task complete. Save the result below.", "Zadanie ukończone. Zapisz wynik poniżej.", "Tarea completa. Guarda el resultado abajo.", "Tâche terminée. Enregistre le résultat ci-dessous.", "Aufgabe abgeschlossen. Ergebnis unten speichern.", "Compito completato. Salva il risultato qui sotto.")
    : a.task === "twist"
    ? words("Открой верх на 1° или больше. Гик: в пределах 1°, глубина низа прежняя.", "Open the top by at least 1°. Boom within 1°; lower depth unchanged.", "Otwórz górę o minimum 1°. Bom w granicach 1°, głębokość dołu bez zmian.", "Abre arriba al menos 1°. Ángulo dentro de 1°; profundidad inferior igual.", "Ouvre le haut d'au moins 1°. Angle à 1° près, creux bas inchangé.", "Oben mindestens 1° öffnen. Baumwinkel innerhalb 1°, untere Tiefe gleich.", "Apri in alto almeno 1°. Angolo entro 1°, profondità bassa invariata.")
    : words("Уплощи низ минимум на 15%. Гик: в пределах 1°, твист: в пределах 0,5°.", "Flatten the foot by at least 15%. Boom within 1°; twist within 0.5°.", "Spłaszcz dół o minimum 15%. Bom w granicach 1°, skręt w granicach 0,5°.", "Aplana abajo al menos 15%. Ángulo dentro de 1°; torsión dentro de 0,5°.", "Aplatis le bas d'au moins 15%. Angle à 1° près, vrillage à 0,5° près.", "Unten mindestens 15% abflachen. Baumwinkel innerhalb 1°, Twist innerhalb 0,5°.", "Appiattisci in basso almeno del 15%. Angolo entro 1°, twist entro 0,5°.");
  return <p data-testid="trim-assessment-goal" className="text-sm leading-snug text-[var(--text-primary)]">{goal[lang]}</p>;
}
export function TrimAssessmentPanel({ assessment: a, lang, record, answer, restart, close }: {
  assessment: TrimAssessment; lang: Language; record(): void; answer(value: boolean): void; restart(): void; close(): void;
}) {
  const base = a.baseline, now = a.result ?? a.last;
  return <section aria-label={c.title[lang]} className="space-y-3 py-3">
    <h3 className="text-base font-semibold text-[var(--text-primary)]">{c.title[lang]}: {c[a.task][lang]}</h3>
    {a.phase === "perform" && <>
      <p className="text-sm text-[var(--text-secondary)]">{c.wait[lang]} {(Math.floor(a.stableFor * 10) / 10).toFixed(1)}/3 {lang === "ru" ? "с" : "s"}</p>
      <button className={button} onClick={record}>{c.record[lang]}</button>
    </>}
    {a.phase === "explain" && <fieldset className="space-y-2"><legend className="mb-2 text-sm text-[var(--text-primary)]">{c.why[lang]}</legend>
      <button className={button} onClick={() => answer(false)}>{c.wrong[lang]}</button>
      <button className={button} onClick={() => answer(true)}>{c[a.task === "twist" ? "twistReason" : "depthReason"][lang]}</button>
    </fieldset>}
    {a.issue && <p role="status" className="text-sm text-[var(--text-primary)]">{c[a.issue][lang]}</p>}
    {a.phase === "complete" && <p role="status" className="text-sm text-[var(--text-primary)]">{c.done[lang]}</p>}
    <details className="border-t border-[var(--border-subtle)]">
      <summary className="min-h-11 cursor-pointer py-3 text-sm text-[var(--text-primary)]">{c.comparison[lang]} / {c[a.task][lang]}</summary>
      <div className="space-y-3">
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
      </div>
    </details>
    <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{c.temporary[lang]}</p>
    <div className="flex flex-wrap gap-2"><button className={button} onClick={restart}>{c.restart[lang]}</button><button className={button} onClick={close}>{c.close[lang]}</button></div>
  </section>;
}
