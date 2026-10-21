'use client';

import { type SimulationModel, type TpFn, type UiState } from './shared';

// ---------------------------------------------------------------------------
// Trim score, point of sail and tack. Rendered ABOVE the scene, never over it:
// the boat and its wind marks stay uncovered (owner, 2026-10-21).
// ---------------------------------------------------------------------------

export function SceneOverlayLabels(args: {
  ui: UiState;
  sim: SimulationModel;
  pointLabel: string;
  tackLabel: string;
  tp: TpFn;
}) {
  const { ui, sim, pointLabel, tackLabel, tp } = args;
  const trimColor =
    sim.trimScore > 80
      ? 'var(--success)'
      : sim.trimScore > 55
      ? 'var(--accent-cyan)'
      : 'var(--warning)';

  if (ui.view !== 'top' || ui.mainTrim) return null;

  return (
    <>
      <div className="flex justify-center py-1">
        <div
          className="rounded-full px-3 py-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: 'color-mix(in srgb, var(--bg-secondary) 75%, transparent)',
            border: '1px solid rgba(0, 212, 255, 0.22)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>
            {tp('Трим', 'Trim', 'Trym', { es: 'Trim', fr: 'Trim', de: 'Trimm', it: 'Trim' })}
          </span>
          <span style={{ color: trimColor }}>{sim.trimScore}%</span>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <span style={{ color: 'var(--text-secondary)' }}>{pointLabel}</span>
          <span style={{ color: 'var(--text-muted)' }}>·</span>
          <span style={{ color: 'var(--text-muted)' }}>{tackLabel}</span>
        </div>
      </div>
    </>
  );
}
