'use client';

import {
  COURSE_PRESETS,
  PodCard,
  PodLabel,
  PodSegmented,
  type SailsRaised,
  type TpFn,
  type UiState,
  type ViewMode,
} from '../shared';

export function ViewPod(props: {
  ui: UiState;
  setUi: React.Dispatch<React.SetStateAction<UiState>>;
  tp: TpFn;
  applyOptimal: () => void;
  resetAll: () => void;
  setPreset: (twa: number) => void;
  compact?: boolean;
}) {
  const { ui, setUi, tp, applyOptimal, resetAll, setPreset, compact } = props;
  return (
    <PodCard compact={compact}>
      <PodLabel text={tp('ВИД', 'VIEW', 'WIDOK')} compact={compact} />
      <PodSegmented
        compact={compact}
        options={[
          { value: 'top' as const, label: tp('Сверху', 'Top', 'Gora') },
          { value: 'rear' as const, label: tp('Сзади', 'Rear', 'Z tylu') },
        ]}
        active={ui.view}
        onSelect={(v) => setUi((p) => ({ ...p, view: v as ViewMode }))}
      />
      <PodSegmented
        compact={compact}
        options={[
          { value: 'both' as const, label: tp('Оба', 'Both', 'Oba') },
          { value: 'main' as const, label: tp('Грот', 'Main', 'Grot') },
          { value: 'jib' as const, label: tp('Стакс.', 'Jib', 'Fok') },
        ]}
        active={ui.sailsRaised}
        onSelect={(v) => setUi((p) => ({ ...p, sailsRaised: v as SailsRaised }))}
      />
      <div className="grid grid-cols-4 gap-1">
        {COURSE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => setPreset(preset.twa)}
            className={`${
              compact ? 'px-0.5 py-0.5 text-[8px]' : 'px-1 py-1 text-[9px]'
            } rounded-md border font-semibold uppercase tracking-wider transition truncate`}
            style={{
              borderColor:
                Math.abs(ui.twa - preset.twa) < 2
                  ? 'var(--accent-cyan)'
                  : 'rgba(139, 167, 184, 0.22)',
              background:
                Math.abs(ui.twa - preset.twa) < 2 ? 'rgba(0, 212, 255, 0.12)' : 'transparent',
              color:
                Math.abs(ui.twa - preset.twa) < 2 ? 'var(--accent-cyan)' : 'var(--text-muted)',
            }}
          >
            {preset.id === 'close'
              ? tp('Бей', 'Close', 'Bej')
              : preset.id === 'beam'
              ? tp('Галф', 'Beam', 'Galf')
              : preset.id === 'broad'
              ? tp('Бак', 'Broad', 'Bak')
              : tp('Форд', 'Run', 'Ford')}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1">
        <button
          onClick={applyOptimal}
          className={`${compact ? 'px-1 py-0.5 text-[9px]' : 'px-1.5 py-1 text-[10px]'} rounded-md border font-semibold uppercase tracking-wider transition`}
          style={{ borderColor: 'rgba(82, 255, 142, 0.4)', color: 'var(--success)' }}
        >
          {tp('Оптим', 'Best', 'Opt')}
        </button>
        <button
          onClick={resetAll}
          className={`${compact ? 'px-1 py-0.5 text-[9px]' : 'px-1.5 py-1 text-[10px]'} rounded-md border font-semibold uppercase tracking-wider transition`}
          style={{ borderColor: 'rgba(139, 167, 184, 0.22)', color: 'var(--text-muted)' }}
        >
          {tp('Сброс', 'Reset', 'Reset')}
        </button>
      </div>
      <label
        className={`flex items-center gap-2 ${compact ? 'text-[9px]' : 'text-[10px]'} text-[var(--text-secondary)] cursor-pointer`}
      >
        <input
          type="checkbox"
          checked={ui.showOptimal}
          onChange={(e) => setUi((p) => ({ ...p, showOptimal: e.target.checked }))}
        />
        {tp('Призрак оптимума', 'Ghost optimum', 'Duch optimum')}
      </label>
    </PodCard>
  );
}
