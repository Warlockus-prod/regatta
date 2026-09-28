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
      ? tp("УБРАН", "LOWERED", "OPUSZCZONY", { es: "ARRIADA", fr: "AFFALÉE", de: "GEBORGEN", it: "AMMAINATA" })
      : state === 'stall'
      ? tp('СРЫВ', 'STALL', 'ODERWANIE PRZEPŁYWU', { es: 'FLUJO DESPRENDIDO', fr: 'DÉCROCHÉ', de: 'STRÖMUNGSABRISS', it: 'STALLO' })
      : state === 'edge'
      ? tp('НА ГРАНИ', 'EDGE', 'NA GRANICY', { es: 'AL LÍMITE', fr: 'À LA LIMITE', de: 'AN DER GRENZE', it: 'AL LIMITE' })
      : state === 'luffing'
      ? tp('ПОЛОЩЕТ', 'LUFFING', 'ŁOPOCZE', { es: 'FLAMEA', fr: 'FASEYE', de: 'KILLT', it: 'FILEGGIA' })
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
        label={tp('Угол', 'Angle', 'Kąt', {
          es: 'Ángulo',
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
            label: tp('Полный', 'Full', 'Pełny', {
              es: 'Entera',
              fr: 'Haute',
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
        <summary className="min-h-11 cursor-pointer py-3 text-sm text-[var(--accent-cyan)]">{tp("Изучить снасти", "Study rig controls", "Poznaj obsługę lin", { es: "Estudiar la maniobra", fr: "Étudier les réglages", de: "Trimmleinen erkunden", it: "Studiare le manovre" })}</summary>
        <p className="mb-3 text-xs leading-relaxed text-[var(--text-secondary)]">{tp("Начнется новая сессия: длина гротшкота и каретка вместо ползунка угла. Курс удерживает помощник. Это исследование, не экзамен.", "Starts a new session: sheet length and traveler replace the angle slider. An assistant holds course. Exploration, not an exam.", "Nowa sesja: długość szota i wózek zamiast suwaka kąta. Pomocnik utrzymuje kurs. To obserwacja, nie egzamin.", { es: "Empieza una sesión nueva: la longitud de la escota de mayor y el carro sustituyen al control de ángulo. Un ayudante mantiene el rumbo. Es exploración, no un examen.", fr: "Une nouvelle session démarre : la longueur d'écoute de GV et le chariot remplacent le curseur d'angle. Un assistant tient le cap. C'est une exploration, pas un examen.", de: "Eine neue Sitzung startet: Großschotlänge und Traveller ersetzen den Winkelregler. Ein Helfer hält den Kurs. Erkundung, keine Prüfung.", it: "Si apre una nuova sessione: lunghezza della scotta randa e carrello al posto del cursore dell'angolo. Un assistente tiene la rotta. È un'esplorazione, non un esame." })}</p>
        <button className="min-h-11 rounded-md border border-[var(--accent-cyan)] px-3 text-sm text-[var(--accent-cyan)]" onClick={props.startRigStudy}>{tp("Начать со снастями", "Start with rig controls", "Zacznij z szotem i wózkiem", { es: "Empezar con escota y carro", fr: "Commencer avec écoute et chariot", de: "Mit Schot und Traveller starten", it: "Inizia con scotta e carrello" })}</button>
      </details>}
    </PodCard>
  );
}
