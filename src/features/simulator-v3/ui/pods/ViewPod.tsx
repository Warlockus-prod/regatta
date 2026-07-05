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
      <PodLabel
        text={tp('ВИД', 'VIEW', 'WIDOK', {
          es: 'VISTA',
          fr: 'VUE',
          de: 'ANSICHT',
          it: 'VISTA',
        })}
        compact={compact}
      />
      <PodSegmented
        compact={compact}
        options={[
          {
            value: 'top' as const,
            label: tp('Сверху', 'Top', 'Gora', { es: 'Arriba', fr: 'Dessus', de: 'Oben', it: 'Alto' }),
          },
          {
            value: 'rear' as const,
            label: tp('Сзади', 'Rear', 'Z tylu', { es: 'Popa', fr: 'Arriere', de: 'Heck', it: 'Poppa' }),
          },
          {
            value: 'side' as const,
            label: tp('Сбоку', 'Side', 'Z boku', { es: 'Lateral', fr: 'Cote', de: 'Seite', it: 'Lato' }),
          },
        ]}
        active={ui.view}
        onSelect={(v) => setUi((p) => ({ ...p, view: v as ViewMode }))}
      />
      <PodSegmented
        compact={compact}
        options={[
          {
            value: 'both' as const,
            label: tp('Оба', 'Both', 'Oba', { es: 'Ambas', fr: 'Deux', de: 'Beide', it: 'Entrambe' }),
          },
          {
            value: 'main' as const,
            label: tp('Грот', 'Main', 'Grot', { es: 'Mayor', fr: 'GV', de: 'Gross', it: 'Randa' }),
          },
          {
            value: 'jib' as const,
            label: tp('Стакс.', 'Jib', 'Fok', { es: 'Foque', fr: 'Foc', de: 'Fock', it: 'Fiocco' }),
          },
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
              ? tp('Бей', 'Close', 'Bej', { es: 'Ceñida', fr: 'Près', de: 'Am Wind', it: 'Bolina' })
              : preset.id === 'beam'
              ? tp('Галф', 'Beam', 'Galf', { es: 'Través', fr: 'Travers', de: 'Halbwind', it: 'Traverso' })
              : preset.id === 'broad'
              ? tp('Бак', 'Broad', 'Bak', { es: 'Largo', fr: 'Largue', de: 'Raumwind', it: 'Lasco' })
              : tp('Форд', 'Run', 'Ford', { es: 'Empopada', fr: 'Arrière', de: 'Vorwind', it: 'Poppa' })}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1">
        <button
          onClick={applyOptimal}
          className={`${compact ? 'px-1 py-0.5 text-[9px]' : 'px-1.5 py-1 text-[10px]'} rounded-md border font-semibold uppercase tracking-wider transition`}
          style={{ borderColor: 'rgba(82, 255, 142, 0.4)', color: 'var(--success)' }}
        >
          {tp('Оптим', 'Best', 'Opt', { es: 'Optimo', fr: 'Optimal', de: 'Optimal', it: 'Ottimo' })}
        </button>
        <button
          onClick={resetAll}
          className={`${compact ? 'px-1 py-0.5 text-[9px]' : 'px-1.5 py-1 text-[10px]'} rounded-md border font-semibold uppercase tracking-wider transition`}
          style={{ borderColor: 'rgba(139, 167, 184, 0.22)', color: 'var(--text-muted)' }}
        >
          {tp('Сброс', 'Reset', 'Reset', { es: 'Reset', fr: 'Reset', de: 'Reset', it: 'Reset' })}
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
        {tp('Призрак оптимума', 'Ghost optimum', 'Duch optimum', {
          es: 'Fantasma del optimo',
          fr: "Fantôme d'optimum",
          de: 'Geister-Optimum',
          it: "Fantasma dell'ottimo",
        })}
      </label>
    </PodCard>
  );
}
