'use client';

import { LiveWindButton } from '../LiveWindButton';
import {
  PodCard,
  PodLabel,
  PodSegmented,
  PodSlider,
  type TpFn,
  type UiState,
  type WindMode,
} from '../shared';

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
      <PodLabel
        text={tp('ВЕТЕР', 'WIND', 'WIATR', {
          es: 'VIENTO',
          fr: 'VENT',
          de: 'WIND',
          it: 'VENTO',
        })}
        compact={compact}
      />
      <PodSlider
        compact={compact}
        label={tp('Угол TWA', 'Angle TWA', 'Kat TWA', {
          es: 'Angulo TWA',
          fr: 'Angle TWA',
          de: 'Winkel TWA',
          it: 'Angolo TWA',
        })}
        value={`${ui.twa}°`}
        min={30}
        max={180}
        step={1}
        sliderValue={ui.twa}
        onChange={(v) => setUi((p) => ({ ...p, twa: v }))}
      />
      <PodSlider
        compact={compact}
        label={tp('Сила', 'Speed', 'Sila', {
          es: 'Fuerza',
          fr: 'Force',
          de: 'Staerke',
          it: 'Forza',
        })}
        value={`${ui.windSpeed} ${tp('уз', 'kts', 'kts')}`}
        min={4}
        max={25}
        step={1}
        sliderValue={ui.windSpeed}
        onChange={(v) => setUi((p) => ({ ...p, windSpeed: v }))}
      />
      <LiveWindButton
        tp={tp}
        onApply={(speedKn) =>
          setUi((p) => ({ ...p, windSpeed: Math.max(4, Math.min(25, Math.round(speedKn))) }))
        }
      />
      {/* Wind dynamics selector. The sliders above always set the BASE
          wind; shift/gust modes modulate around that base in the runtime,
          so moving a slider mid-gust just re-anchors the modulation. */}
      <PodSegmented<WindMode>
        compact={compact}
        options={[
          {
            value: 'steady',
            label: tp('Ровный', 'Steady', 'Rowny', {
              es: 'Estable',
              fr: 'Regulier',
              de: 'Stetig',
              it: 'Costante',
            }),
          },
          {
            value: 'shift',
            label: tp('Заходы', 'Shifts', 'Zmiany', {
              es: 'Roles',
              fr: 'Adonnantes',
              de: 'Dreher',
              it: 'Salti',
            }),
          },
          {
            value: 'gust',
            label: tp('Порывы', 'Gusts', 'Podmuchy', {
              es: 'Rachas',
              fr: 'Rafales',
              de: 'Boen',
              it: 'Raffiche',
            }),
          },
        ]}
        active={ui.windMode}
        onSelect={(v) => setUi((p) => ({ ...p, windMode: v }))}
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
