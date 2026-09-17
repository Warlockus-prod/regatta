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
  startRigStudy?: () => void;
}) {
  const { ui, setUi, params, sim, tp, compact } = props;
  // 4-state gradient (more pedagogically honest than binary stall):
  //   AoA < 5   : LUFFING   - sail flapping, no lift
  //   5-15      : ATTACHED  - healthy lift
  //   15-20     : EDGE      - flow starting to separate, close to stall
  //   >= 20     : STALL     - flow fully detached
  const aoa = sim.result.diag.mainAoA;
  const lowered = ui.sailsRaised === "jib";
  const stalled = !lowered && sim.result.diag.mainStalled;
  const state: 'lowered' | 'luffing' | 'attached' | 'edge' | 'stall' = lowered
    ? 'lowered'
    : stalled
    ? 'stall'
    : aoa < 5
    ? 'luffing'
    : aoa >= 15
    ? 'edge'
    : 'attached';
  const tone: 'good' | 'warn' | 'danger' =
    state === 'stall' ? 'danger' : state === 'attached' || state === 'lowered' ? 'good' : 'warn';
  const text =
    state === 'lowered'
      ? tp("УБРАН", "LOWERED", "OPUSZCZONY", { es: "ARRIADA", fr: "AFFALEE", de: "GEBORGEN", it: "AMMAINATA" })
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
      {props.startRigStudy && <details>
        <summary className="min-h-11 cursor-pointer py-3 text-sm text-[var(--accent-cyan)]">{tp("Изучить снасти", "Study rig controls", "Poznaj obsługę lin", { es: "Estudiar los cabos", fr: "Étudier les commandes", de: "Leinen untersuchen", it: "Studiare le manovre" })}</summary>
        <p className="mb-3 text-xs leading-relaxed text-[var(--text-secondary)]">{tp("Начнется новая сессия: длина гротшкота и каретка вместо ползунка угла. Курс удерживает помощник. Это исследование, не экзамен.", "Starts a new session: sheet length and traveler replace the angle slider. An assistant holds course. Exploration, not an exam.", "Nowa sesja: długość szota i wózek zamiast suwaka kąta. Pomocnik utrzymuje kurs. To obserwacja, nie egzamin.", { es: "Nueva sesión: longitud y carro, no ángulo. Ayudante mantiene rumbo. Exploración, no examen.", fr: "Nouvelle session : longueur et chariot, pas l'angle. Cap maintenu. Exploration, pas examen.", de: "Neue Sitzung: Schotlänge und Traveller statt Winkel. Kurshilfe aktiv. Erkundung, keine Prüfung.", it: "Nuova sessione: lunghezza e carrello, non angolo. Aiuto sulla rotta. Esplorazione, non esame." })}</p>
        <button className="min-h-11 rounded-md border border-[var(--accent-cyan)] px-3 text-sm text-[var(--accent-cyan)]" onClick={props.startRigStudy}>{tp("Начать со снастями", "Start with rig controls", "Zacznij z linami", { es: "Empezar con cabos", fr: "Commencer avec les commandes", de: "Mit Leinen beginnen", it: "Inizia con le manovre" })}</button>
      </details>}
    </PodCard>
  );
}
