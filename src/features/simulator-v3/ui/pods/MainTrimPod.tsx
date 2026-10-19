'use client';

import { PodCard, PodLabel, PodSlider, type SimulationModel, type TpFn, type UiState } from "../shared";
import { MAIN_TRIM_LIMITS } from "../../../sailing-lab/rig/main-trim";
import type { MainTrimCommand } from "../../../sailing-lab/rig/main-trim";
import { ShapeTrimControls } from "./ShapeTrimControls";

export function MainTrimPod({ ui, setUi, sim, tp, children, studyActive = false }: { ui: UiState; setUi: React.Dispatch<React.SetStateAction<UiState>>; sim: SimulationModel; tp: TpFn; children?: React.ReactNode; studyActive?: boolean }) {
  const rig = sim.session.mainTrim, target = ui.mainTrim;
  if (!rig || !target) return null;
  const put = (key: keyof MainTrimCommand, value: number) => setUi(p => ({ ...p, mainTrim: { ...p.mainTrim!, [key]: value } }));
  return <PodCard>
    <PodLabel text={tp("ГИКА-ШКОТ И КАРЕТКА", "MAINSHEET AND TRAVELER", "SZOT GROTA I WÓZEK", { es: "ESCOTA DE MAYOR Y CARRO", fr: "ÉCOUTE DE GRAND-VOILE ET CHARIOT", de: "GROSSSCHOT UND TRAVELLER", it: "SCOTTA DELLA RANDA E CARRELLO" })} />
    <PodSlider label={tp("Гика-шкот: выданная рабочая длина", "Mainsheet: paid-out working length", "Szot grota: wydana długość robocza", { es: "Escota de mayor: longitud de trabajo largada", fr: "Écoute de grand-voile : longueur utile filée", de: "Großschot: ausgegebene Arbeitslänge", it: "Scotta della randa: lunghezza di lavoro filata" })}
      value={`${target.workingLength.toFixed(1)} m`} min={MAIN_TRIM_LIMITS.minLength} max={MAIN_TRIM_LIMITS.maxLength} step={.1} sliderValue={target.workingLength} onChange={v => put("workingLength", v)} />
    <PodSlider label={tp("Каретка гика-шкота: - левый, + правый борт", "Mainsheet traveler: - port, + starboard", "Wózek szotu grota: - lewa, + prawa burta", { es: "Carro de mayor: - babor, + estribor", fr: "Chariot de grand-voile : - bâbord, + tribord", de: "Großschot-Traveller: - Backbord, + Steuerbord", it: "Carrello della randa: - sinistra, + dritta" })}
      value={`${target.traveler.toFixed(2)} m`} min={-.8} max={.8} step={.05} sliderValue={target.traveler} onChange={v => put("traveler", v)} />
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm tabular-nums text-[var(--text-primary)]">
      <dt>{tp("Гик", "Boom", "Bom", { es: "Botavara", fr: "Bôme", de: "Baum", it: "Boma" })}</dt><dd>{Math.abs(rig.pose.yaw).toFixed(1)}°</dd>
      <dt>{tp("Подъем гика", "Boom rise", "Uniesienie bomu", { es: "Elevación", fr: "Montée", de: "Anstieg", it: "Salita" })}</dt><dd>{rig.pose.rise.toFixed(1)}°</dd>
      <dt>{tp("Раскрытие верха (twist)", "Top opening (twist)", "Otwarcie góry (twist)", { es: "Apertura alta (torsión)", fr: "Ouverture haute (vrillage)", de: "Öffnung oben (Twist)", it: "Apertura alta (svergolamento)" })}</dt><dd>{(rig.twist * 20).toFixed(1)}°</dd>
      <dt>{tp("Слабина", "Slack", "Luz", { es: "Holgura", fr: "Mou", de: "Lose", it: "Lasco" })}</dt><dd>{rig.slack.toFixed(2)} m</dd>
    </dl>
    <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{tp("Меньше длина: выбрать. Больше: потравить. Указаны шесть рабочих ветвей, не весь трос. Помощник работает со снастью; лебедка и стопор пока не моделируются. Это учебное приближение.", "Shorter: trim in. Longer: ease out. Length covers six moving spans, not the whole rope. An assistant handles the line; winch and clutch are not simulated yet. This is a teaching approximation.", "Krócej: wybierz. Dłużej: poluzuj. Długość obejmuje sześć odcinków, nie całą linę. Pomocnik obsługuje linę; kabestan i stoper nie są jeszcze modelowane. To przybliżenie szkoleniowe.", { es: "Menos longitud: cazar. Más: lascar. Se miden seis tramos de trabajo, no todo el cabo. Un ayudante maneja la escota; el winche y la mordaza aún no se simulan. Es una aproximación didáctica.", fr: "Plus court : border. Plus long : choquer. Six brins, pas tout le cordage. Un assistant manœuvre ; winch et bloqueur non simulés. Modèle pédagogique.", de: "Kürzer: dichtholen. Länger: fieren. Sechs Parten, nicht die ganze Leine. Ein Helfer bedient sie; Winsch und Stopper noch ohne Simulation. Lernmodell.", it: "Più corto: cazzare. Più lungo: lascare. Sei tratti, non tutta la cima. Un assistente manovra; winch e stopper non simulati. Modello didattico." })}</p>
    {children}
    <ShapeTrimControls rig={rig} target={target} put={put} locked={studyActive} tp={tp} />
  </PodCard>;
}
