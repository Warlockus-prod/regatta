'use client';

import { type SimulationModel, type TpFn, type UiState } from './shared';

// ---------------------------------------------------------------------------
// Overlay labels on scene (corner labels - point of sail, TWA, trim score)
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

  if (ui.view === 'rear') return null;

  return (
    <>
      {/* Top-left label is NOT shown here - it's obvious from the point of sail chip */}
      {/* Top-center: trim score pill */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 pointer-events-none">
        <div
          className="rounded-full px-3 py-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider"
          style={{
            background: 'rgba(8, 24, 48, 0.75)',
            border: '1px solid rgba(0, 212, 255, 0.22)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <span style={{ color: 'var(--text-muted)' }}>{tp('Трим', 'Trim', 'Trim')}</span>
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
