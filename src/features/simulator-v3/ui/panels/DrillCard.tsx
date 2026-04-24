'use client';
import type { Lang } from '@/lib/languages';

import {
  type DrillDefinition,
  DRILLS,
} from '../../runtime/scenario-presets';
import { type TpFn } from '../shared';

// ---------------------------------------------------------------------------
// DrillCard - shown when mode === 'drill'. Two states:
// - picker: no active drill, show the 3 drill cards to choose from
// - in progress: show title, goal, timer, hold-progress, win/fail result
// ---------------------------------------------------------------------------

export type DrillResult = 'pending' | 'win' | 'fail';

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
}) {
  if (!active) {
    return (
      <div
        className="rounded-xl p-3 space-y-2"
        style={{
          background: 'rgba(8, 24, 48, 0.72)',
          border: '1px solid rgba(0, 212, 255, 0.22)',
        }}
      >
        <div
          className="text-[10px] uppercase tracking-wider font-bold"
          style={{ color: 'var(--accent-cyan)' }}
        >
          {tp('Выбери упражнение', 'Pick a drill', 'Wybierz cwiczenie')}
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
                className="text-[11px] font-bold"
                style={{ color: 'var(--accent-cyan)' }}
              >
                {d.title[lang]}
              </div>
              <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                {d.goal[lang]}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const title = active.title[lang];
  const goal = active.goal[lang];
  const progress = Math.min(100, (heldFor / active.holdDuration) * 100);
  const timeLeft = Math.max(0, active.timeLimit - elapsed);
  const barColor =
    result === 'win'
      ? 'var(--success)'
      : result === 'fail'
      ? 'var(--danger)'
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
        background: 'rgba(8, 24, 48, 0.72)',
        border: cardBorder,
        boxShadow: cardShadow,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="text-[11px] uppercase tracking-wider font-bold"
          style={{
            color:
              result === 'win'
                ? 'var(--success)'
                : result === 'fail'
                ? 'var(--danger)'
                : 'var(--accent-cyan)',
          }}
        >
          {title}
        </div>
        <div
          className="text-[10px] font-mono tabular-nums shrink-0"
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

      <div className="text-[11px] text-[var(--text-secondary)] leading-snug">
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
      <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)]">
        <span>
          {tp('удержание', 'hold', 'utrzymanie')} {heldFor.toFixed(1)}
          /{active.holdDuration}s
        </span>
        <span>
          {result === 'pending'
            ? tp('в процессе', 'in progress', 'w toku')
            : result === 'win'
            ? tp('ГОТОВО', 'DONE', 'GOTOWE')
            : tp('НЕ УСПЕЛ', 'FAILED', 'PORAZKA')}
        </span>
      </div>

      {result !== 'pending' && (
        <div className="flex items-center gap-2">
          <button
            onClick={onRestart}
            className="flex-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 rounded-md border transition"
            style={{
              borderColor: 'rgba(0, 212, 255, 0.4)',
              color: 'var(--accent-cyan)',
            }}
          >
            {tp('Ещё раз', 'Retry', 'Ponow')}
          </button>
          <button
            onClick={onExit}
            className="flex-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 rounded-md border transition"
            style={{
              borderColor: 'rgba(139, 167, 184, 0.22)',
              color: 'var(--text-muted)',
            }}
          >
            {tp('Выбрать другое', 'Pick another', 'Wybierz inne')}
          </button>
        </div>
      )}
    </div>
  );
}
