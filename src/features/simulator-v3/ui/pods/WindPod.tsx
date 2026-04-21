'use client';

import { PodCard, PodLabel, PodSlider, type TpFn, type UiState } from '../shared';

export function WindPod(props: {
  ui: UiState;
  setUi: React.Dispatch<React.SetStateAction<UiState>>;
  tp: TpFn;
  tackLabel: string;
  compact?: boolean;
}) {
  const { ui, setUi, tp, tackLabel, compact } = props;
  return (
    <PodCard compact={compact}>
      <PodLabel text={tp('ВЕТЕР', 'WIND', 'WIATR')} compact={compact} />
      <PodSlider
        compact={compact}
        label={tp('Угол TWA', 'Angle TWA', 'Kat TWA')}
        value={`${ui.twa}°`}
        min={30}
        max={180}
        step={1}
        sliderValue={ui.twa}
        onChange={(v) => setUi((p) => ({ ...p, twa: v }))}
      />
      <PodSlider
        compact={compact}
        label={tp('Сила', 'Speed', 'Sila')}
        value={`${ui.windSpeed} kts`}
        min={4}
        max={25}
        step={1}
        sliderValue={ui.windSpeed}
        onChange={(v) => setUi((p) => ({ ...p, windSpeed: v }))}
      />
      <button
        onClick={() =>
          setUi((p) => ({ ...p, tack: p.tack === 'starboard' ? 'port' : 'starboard' }))
        }
        className={`w-full ${compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]'} rounded-md border font-semibold transition uppercase tracking-wider`}
        style={{
          borderColor: 'rgba(0, 212, 255, 0.22)',
          background: 'rgba(0, 212, 255, 0.08)',
          color: 'var(--accent-cyan)',
        }}
      >
        {tackLabel}
      </button>
    </PodCard>
  );
}
