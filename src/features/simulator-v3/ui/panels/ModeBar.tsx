'use client';

import { type TpFn } from '../shared';

export type ModeKind = 'free' | 'drill' | 'scenario';

// ---------------------------------------------------------------------------
// ModeBar - three-way tab at the top of the V3 surface to switch between:
// - Free Sail (open sandbox, what V3 has always been)
// - Drills (guided time-limited tasks, one concept each)
// - Scenarios (named starting conditions, no win/fail)
// ---------------------------------------------------------------------------

export function ModeBar({
  active,
  onChange,
  tp,
}: {
  active: ModeKind;
  onChange: (m: ModeKind) => void;
  tp: TpFn;
}) {
  const btn = (m: ModeKind, label: string) => (
    <button
      key={m}
      onClick={() => onChange(m)}
      className="flex-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md border transition"
      style={{
        borderColor:
          active === m ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.22)',
        background:
          active === m ? 'rgba(0, 212, 255, 0.14)' : 'transparent',
        color: active === m ? 'var(--accent-cyan)' : 'var(--text-secondary)',
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      className="flex gap-1 px-2 py-1.5 rounded-lg"
      style={{
        background: 'rgba(8, 24, 48, 0.55)',
        border: '1px solid rgba(0, 212, 255, 0.12)',
      }}
    >
      {btn('free', tp('Свободно', 'Free Sail', 'Wolna jazda'))}
      {btn('drill', tp('Упражнения', 'Drills', 'Cwiczenia'))}
      {btn('scenario', tp('Сценарии', 'Scenarios', 'Scenariusze'))}
    </div>
  );
}
