'use client';

import { type getBoatParams } from '@/lib/sailing-physics';
import {
  PodCard,
  PodLabel,
  PodSegmented,
  PodSlider,
  StatusDot,
  type ReefLevel,
  type SimulationModel,
  type TpFn,
  type UiState,
} from '../shared';

export function MainPod(props: {
  ui: UiState;
  setUi: React.Dispatch<React.SetStateAction<UiState>>;
  params: ReturnType<typeof getBoatParams>;
  sim: SimulationModel;
  tp: TpFn;
  compact?: boolean;
}) {
  const { ui, setUi, params, sim, tp, compact } = props;
  // 4-state gradient (more pedagogically honest than binary stall):
  //   AoA < 5   : LUFFING   - sail flapping, no lift
  //   5-15      : ATTACHED  - healthy lift
  //   15-20     : EDGE      - flow starting to separate, close to stall
  //   >= 20     : STALL     - flow fully detached
  const aoa = sim.result.diag.mainAoA;
  const stalled = sim.result.diag.mainStalled;
  const state: 'luffing' | 'attached' | 'edge' | 'stall' = stalled
    ? 'stall'
    : aoa < 5
    ? 'luffing'
    : aoa >= 15
    ? 'edge'
    : 'attached';
  const tone: 'good' | 'warn' | 'danger' =
    state === 'stall' ? 'danger' : state === 'attached' ? 'good' : 'warn';
  const text =
    state === 'stall'
      ? tp('СРЫВ', 'STALL', 'STALL', { es: 'STALL', fr: 'DECROCHE', de: 'STALL', it: 'STALLO' })
      : state === 'edge'
      ? tp('НА ГРАНИ', 'EDGE', 'KRAWEDZ', { es: 'AL LIMITE', fr: 'A LA LIMITE', de: 'GRENZE', it: 'AL LIMITE' })
      : state === 'luffing'
      ? tp('ПОЛОЩЕТ', 'LUFFING', 'LOPOCZE', { es: 'FLAMEA', fr: 'FASEYE', de: 'KILLT', it: 'FILEGGIA' })
      : tp('ТЯНЕТ', 'ATTACHED', 'PRACUJE', { es: 'TIRA', fr: 'PORTE', de: 'ZIEHT', it: 'PORTA' });

  return (
    <PodCard compact={compact}>
      <PodLabel
        text={tp('ГРОТ', 'MAIN', 'GROT', {
          es: 'MAYOR',
          fr: 'GRAND-VOILE',
          de: 'GROSS',
          it: 'RANDA',
        })}
        compact={compact}
      />
      <PodSlider
        compact={compact}
        label={tp('Угол', 'Angle', 'Kat', {
          es: 'Angulo',
          fr: 'Angle',
          de: 'Winkel',
          it: 'Angolo',
        })}
        value={`${Math.round(ui.mainAngle)}°`}
        min={0}
        max={Math.round(params.mainMaxOff)}
        step={1}
        sliderValue={ui.mainAngle}
        onChange={(v) => setUi((p) => ({ ...p, mainAngle: v }))}
        tone={stalled ? 'danger' : 'cyan'}
      />
      <PodSegmented
        compact={compact}
        options={[
          {
            value: 0 as const,
            label: tp('Полный', 'Full', 'Pelny', {
              es: 'Entera',
              fr: 'Pleine',
              de: 'Voll',
              it: 'Piena',
            }),
          },
          { value: 1 as const, label: 'R1' },
          { value: 2 as const, label: 'R2' },
        ]}
        active={ui.reefLevel}
        onSelect={(v) => setUi((p) => ({ ...p, reefLevel: v as ReefLevel }))}
      />
      <StatusDot tone={tone} text={text} compact={compact} />
    </PodCard>
  );
}
