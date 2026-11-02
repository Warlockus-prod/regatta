'use client';
import type { Lang } from '@/lib/languages';

import {
  type DrillDefinition,
  DRILLS,
  pickText,
} from '../../runtime/scenario-presets';
import { type TpFn } from '../shared';
import type { DrillOutcome } from '../../runtime/drill-clock';
import { TRAINER_TERMS } from '@/lib/product/trainer-terms';

// ---------------------------------------------------------------------------
// DrillCard - shown when mode === 'drill'. Two states:
// - picker: no active drill, show the 3 drill cards to choose from
// - in progress: show title, goal, timer, hold-progress, win/fail result
// "Show me" (package 13 stage D) lets the auto-trim set the sails; the
// attempt then ends as "shown", never as a pass (runtime/drill-clock.ts).
// ---------------------------------------------------------------------------

export type DrillResult = DrillOutcome;

export function DrillCard({
  active,
  elapsed,
  heldFor,
  result,
  lang,
  tp,
  onStart,
  onRestart,
  onExit,
  onShowMe,
}: {
  active: DrillDefinition | null;
  elapsed: number;
  heldFor: number;
  result: DrillResult;
  lang: Lang;
  tp: TpFn;
  onStart: (d: DrillDefinition) => void;
  onRestart: () => void;
  onExit: () => void;
  /** "Show me": the auto-trim sets the sails, the attempt does not count. */
  onShowMe?: () => void;
}) {
  if (!active) {
    return (
      <div
        className="rounded-xl p-3 space-y-2"
        style={{
          background: 'color-mix(in srgb, var(--bg-secondary) 72%, transparent)',
          border: '1px solid rgba(0, 212, 255, 0.22)',
        }}
      >
        <div
          className="text-xs uppercase tracking-wider font-bold"
          style={{ color: 'var(--accent-cyan)' }}
        >
          {tp('Выбери упражнение', 'Pick a drill', 'Wybierz ćwiczenie', {
            es: 'Elige un ejercicio',
            fr: 'Choisis un exercice',
            de: 'Wähle eine Übung',
            it: 'Scegli un esercizio',
          })}
        </div>
        <div className="grid gap-2">
          {DRILLS.map((d) => (
            <button
              key={d.id}
              onClick={() => onStart(d)}
              className="text-left p-2 rounded-md border transition hover:bg-[rgba(0,212,255,0.06)]"
              style={{
                borderColor: 'rgba(139, 167, 184, 0.2)',
              }}
            >
              <div
                className="text-xs font-bold"
                style={{ color: 'var(--accent-cyan)' }}
              >
                {pickText(d.title, lang)}
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-0.5 leading-snug">
                {pickText(d.goal, lang)}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const title = pickText(active.title, lang);
  const goal = pickText(active.goal, lang);
  const progress = Math.min(100, (heldFor / active.holdDuration) * 100);
  const timeLeft = Math.max(0, active.timeLimit - elapsed);
  const barColor =
    result === 'win'
      ? 'var(--success)'
      : result === 'fail'
      ? 'var(--danger)'
      : result === 'shown'
      ? 'var(--text-muted)'
      : 'var(--accent-cyan)';

  const cardBorder =
    result === 'win'
      ? '1px solid rgba(82, 255, 142, 0.55)'
      : result === 'fail'
      ? '1px solid rgba(255, 130, 110, 0.5)'
      : '1px solid rgba(0, 212, 255, 0.22)';
  const cardShadow =
    result === 'win'
      ? '0 0 24px rgba(82, 255, 142, 0.25)'
      : result === 'fail'
      ? '0 0 24px rgba(255, 130, 110, 0.2)'
      : 'none';

  return (
    <div
      className="rounded-xl p-3 space-y-2 transition-all"
      style={{
        background: 'color-mix(in srgb, var(--bg-secondary) 72%, transparent)',
        border: cardBorder,
        boxShadow: cardShadow,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="text-xs uppercase tracking-wider font-bold"
          style={{
            color:
              result === 'win'
                ? 'var(--success)'
                : result === 'fail'
                ? 'var(--danger)'
                : result === 'shown'
                ? 'var(--text-secondary)'
                : 'var(--accent-cyan)',
          }}
        >
          {title}
        </div>
        <div
          className="text-xs font-mono tabular-nums shrink-0"
          style={{
            color:
              result === 'pending' && timeLeft < 5
                ? 'var(--warning)'
                : 'var(--text-muted)',
          }}
        >
          {Math.round(timeLeft)}s
        </div>
      </div>

      <div className="text-xs text-[var(--text-secondary)] leading-snug">
        {goal}
      </div>

      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: 'rgba(139, 167, 184, 0.12)' }}
      >
        <div
          className="h-full transition-all duration-150"
          style={{
            width: `${progress}%`,
            background: barColor,
          }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>
          {tp('удержание', 'hold', 'utrzymanie', {
            es: 'mantenido',
            fr: 'maintien',
            de: 'gehalten',
            it: 'tenuta',
          })}{' '}
          {heldFor.toFixed(1)}
          /{active.holdDuration}s
        </span>
        <span>
          {result === 'pending'
            ? tp('в процессе', 'in progress', 'w toku', {
                es: 'en curso',
                fr: 'en cours',
                de: 'läuft',
                it: 'in corso',
              })
            : result === 'win'
            ? tp('ГОТОВО', 'DONE', 'GOTOWE', {
                es: 'HECHO',
                fr: 'FAIT',
                de: 'GESCHAFFT',
                it: 'FATTO',
              })
            : result === 'shown'
            ? tp('ПОКАЗАНО', 'SHOWN', 'POKAZANO', {
                es: 'MOSTRADO',
                fr: 'MONTRÉ',
                de: 'GEZEIGT',
                it: 'MOSTRATO',
              })
            : tp('НЕ УСПЕЛ', 'FAILED', 'NIE UDAŁO SIĘ', {
                es: 'FALLIDO',
                fr: 'RATÉ',
                de: 'NICHT GESCHAFFT',
                it: 'FALLITO',
              })}
        </span>
      </div>

      {result === 'shown' && (
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]" data-testid="drill-shown" role="status">
          {tp('Это был показ: паруса настроил автотрим. Попытка не засчитана, теперь сделай сам.', 'That was a demonstration: the auto-trim set the sails. The attempt does not count, now do it yourself.', 'To był pokaz: żagle ustawił autotrym. Próba się nie liczy, teraz zrób to sam.', {
            es: 'Fue una demostración: el trimado automático ajustó las velas. El intento no cuenta, ahora hazlo tú.',
            fr: "C'était une démonstration : le réglage auto a réglé les voiles. L'essai ne compte pas, à toi maintenant.",
            de: 'Das war eine Vorführung: Der Autotrimm hat die Segel eingestellt. Der Versuch zählt nicht, jetzt bist du dran.',
            it: 'Era una dimostrazione: la regolazione automatica ha sistemato le vele. Il tentativo non conta, ora prova tu.',
          })}
        </p>
      )}

      {onShowMe && (result === 'pending' || result === 'fail') && (
        <button
          type="button"
          onClick={onShowMe}
          data-testid="drill-show-me"
          className="min-h-11 w-full rounded-md border px-2 text-sm font-semibold transition"
          style={{ borderColor: 'rgba(139, 167, 184, 0.22)', color: 'var(--text-primary)' }}
        >
          {TRAINER_TERMS.showMe[lang]}
        </button>
      )}

      {result !== 'pending' && (
        <div className="flex items-center gap-2">
          <button
            onClick={onRestart}
            data-testid="drill-restart"
            className="min-h-11 flex-1 text-xs uppercase tracking-wider font-bold px-2 py-1.5 rounded-md border transition"
            style={{
              borderColor: 'rgba(0, 212, 255, 0.4)',
              color: 'var(--accent-cyan)',
            }}
          >
            {result === 'shown'
              ? tp('Теперь сам', 'Now you', 'Teraz ty', { es: 'Ahora tú', fr: 'À toi', de: 'Jetzt du', it: 'Ora tu' })
              : tp('Ещё раз', 'Retry', 'Jeszcze raz', {
              es: 'Otra vez',
              fr: 'Recommencer',
              de: 'Nochmal',
              it: 'Di nuovo',
            })}
          </button>
          <button
            onClick={onExit}
            className="min-h-11 flex-1 text-xs uppercase tracking-wider font-bold px-2 py-1.5 rounded-md border transition"
            style={{
              borderColor: 'rgba(139, 167, 184, 0.22)',
              color: 'var(--text-muted)',
            }}
          >
            {tp('Выбрать другое', 'Pick another', 'Wybierz inne', {
              es: 'Elegir otro',
              fr: 'En choisir un autre',
              de: 'Andere wählen',
              it: 'Scegline un altro',
            })}
          </button>
        </div>
      )}
    </div>
  );
}
