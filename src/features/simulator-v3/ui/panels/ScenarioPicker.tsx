'use client';
import type { Lang } from '@/lib/languages';

import {
  SCENARIO_PRESETS,
  pickText,
  type ScenarioPreset,
} from '../../runtime/scenario-presets';
import { type TpFn } from '../shared';

// ---------------------------------------------------------------------------
// ScenarioPicker - list of named starting conditions. Picking one reseeds
// the runtime with that scenario's UiState. Pure presentational.
// ---------------------------------------------------------------------------

export function ScenarioPicker({
  activeId,
  onPick,
  lang,
  tp,
}: {
  activeId: string | null;
  onPick: (s: ScenarioPreset) => void;
  lang: Lang;
  tp: TpFn;
}) {
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
        {tp('Ситуации', 'Situations', 'Sytuacje', {
          es: 'Situaciones',
          fr: 'Situations',
          de: 'Situationen',
          it: 'Situazioni',
        })}
      </div>
      <div className="grid gap-2">
        {SCENARIO_PRESETS.map((s) => {
          const active = activeId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onPick(s)}
              className="text-left p-2 rounded-md border transition hover:bg-[rgba(0,212,255,0.06)]"
              style={{
                borderColor: active
                  ? 'var(--accent-cyan)'
                  : 'rgba(139, 167, 184, 0.2)',
                background: active ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
              }}
            >
              <div
                className="text-[11px] font-bold"
                style={{
                  color: active
                    ? 'var(--accent-cyan)'
                    : 'var(--text-secondary)',
                }}
              >
                {pickText(s.title, lang)}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-snug">
                {pickText(s.summary, lang)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
