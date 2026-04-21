'use client';

import { type SimulationModel, type TpFn, type UiState } from './shared';

// ---------------------------------------------------------------------------
// Metrics strip (4 chips)
// ---------------------------------------------------------------------------

export function MetricsStrip({ ui, sim, tp }: { ui: UiState; sim: SimulationModel; tp: TpFn }) {
  void ui;
  const heelAbs = Math.abs(sim.result.state.heel);
  const trimColor =
    sim.trimScore > 80
      ? 'var(--success)'
      : sim.trimScore > 55
      ? 'var(--accent-cyan)'
      : 'var(--warning)';
  const heelColor =
    heelAbs > 28 ? 'var(--danger)' : heelAbs > 22 ? 'var(--warning)' : 'var(--accent-cyan)';

  return (
    <div
      className="grid grid-cols-4 gap-0 mx-2 lg:mx-0 mt-2 lg:mt-3 rounded-xl overflow-hidden"
      style={{ background: 'rgba(8, 24, 48, 0.6)', border: '1px solid rgba(0, 212, 255, 0.18)' }}
    >
      <MetricChip
        label={tp('СКОРОСТЬ', 'SPEED', 'PREDKOSC')}
        value={sim.result.state.boatSpeed.toFixed(1)}
        unit="kts"
        color="var(--accent-cyan)"
      />
      <MetricChip
        label={tp('КРЕН', 'HEEL', 'PRZECHYL')}
        value={Math.round(sim.result.state.heel).toString()}
        unit="°"
        color={heelColor}
        divider
      />
      <MetricChip
        label="AWA"
        value={Math.round(Math.abs(sim.result.diag.awa)).toString()}
        unit="°"
        color="var(--accent-cyan)"
        divider
      />
      <MetricChip
        label={tp('ТРИМ', 'TRIM', 'TRIM')}
        value={sim.trimScore.toString()}
        unit="%"
        color={trimColor}
        divider
      />
    </div>
  );
}

function MetricChip({
  label,
  value,
  unit,
  color,
  divider,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
  divider?: boolean;
}) {
  return (
    <div className="px-2 py-2 sm:px-3 sm:py-3 relative">
      {divider && (
        <div
          className="absolute left-0 top-2 bottom-2 w-px"
          style={{ background: 'rgba(139, 167, 184, 0.18)' }}
        />
      )}
      <div className="text-[8px] sm:text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span
          className="text-xl sm:text-3xl font-black font-mono tabular-nums leading-none"
          style={{ color }}
        >
          {value}
        </span>
        <span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-semibold">{unit}</span>
      </div>
    </div>
  );
}
