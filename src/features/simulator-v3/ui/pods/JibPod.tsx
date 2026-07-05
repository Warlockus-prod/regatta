'use client';

import { type getBoatParams } from '@/lib/sailing-physics';
import {
  PodCard,
  PodLabel,
  PodSlider,
  StatusDot,
  type SimulationModel,
  type TpFn,
  type UiState,
} from '../shared';

export function JibPod(props: {
  ui: UiState;
  setUi: React.Dispatch<React.SetStateAction<UiState>>;
  params: ReturnType<typeof getBoatParams>;
  sim: SimulationModel;
  tp: TpFn;
  compact?: boolean;
}) {
  const { ui, setUi, params, sim, tp, compact } = props;
  // Same 4-state gradient as main pod, plus a prefix "FURLED" state
  // when the jib is rolled up below 10%.
  const aoa = sim.result.diag.jibAoA;
  const stalled = sim.result.diag.jibStalled;
  let state: 'furled' | 'luffing' | 'attached' | 'edge' | 'stall';
  if (ui.jibFurlPct < 10) state = 'furled';
  else if (stalled) state = 'stall';
  else if (aoa < 5) state = 'luffing';
  else if (aoa >= 15) state = 'edge';
  else state = 'attached';
  const tone: 'good' | 'warn' | 'danger' =
    state === 'stall' ? 'danger' : state === 'attached' ? 'good' : 'warn';
  const text =
    state === 'furled'
      ? tp('УБРАН', 'FURLED', 'ZWINIETY', { es: 'ENROLLADO', fr: 'ENROULE', de: 'GEROLLT', it: 'AVVOLTO' })
      : state === 'stall'
      ? tp('СРЫВ', 'STALL', 'STALL', { es: 'STALL', fr: 'DECROCHE', de: 'STALL', it: 'STALLO' })
      : state === 'edge'
      ? tp('НА ГРАНИ', 'EDGE', 'KRAWEDZ', { es: 'AL LIMITE', fr: 'A LA LIMITE', de: 'GRENZE', it: 'AL LIMITE' })
      : state === 'luffing'
      ? tp('ПОЛОЩЕТ', 'LUFFING', 'LOPOCZE', { es: 'FLAMEA', fr: 'FASEYE', de: 'KILLT', it: 'FILEGGIA' })
      : tp('ТЯНЕТ', 'ATTACHED', 'PRACUJE', { es: 'TIRA', fr: 'PORTE', de: 'ZIEHT', it: 'PORTA' });

  return (
    <PodCard compact={compact}>
      <PodLabel
        text={tp('СТАКСЕЛЬ', 'JIB', 'FOK', {
          es: 'FOQUE',
          fr: 'FOC',
          de: 'FOCK',
          it: 'FIOCCO',
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
        value={`${Math.round(ui.jibAngle)}°`}
        min={Math.round(params.jibMinOff)}
        max={Math.round(params.jibMaxOff)}
        step={1}
        sliderValue={ui.jibAngle}
        onChange={(v) => setUi((p) => ({ ...p, jibAngle: v }))}
        tone={stalled ? 'danger' : 'cyan'}
      />
      <PodSlider
        compact={compact}
        label={tp('Раскрытие', 'Furl', 'Zwiniecie', {
          es: 'Enrollador',
          fr: 'Enrouleur',
          de: 'Rollanlage',
          it: 'Avvolgitore',
        })}
        value={`${ui.jibFurlPct}%`}
        min={0}
        max={100}
        step={5}
        sliderValue={ui.jibFurlPct}
        onChange={(v) => setUi((p) => ({ ...p, jibFurlPct: v }))}
      />
      <StatusDot tone={tone} text={text} compact={compact} />
    </PodCard>
  );
}
