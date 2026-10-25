'use client';

import { PodCard, PodLabel, PodSlider, type SimulationModel, type TpFn, type UiState } from "../shared";
import { MAIN_TRIM_LIMITS } from "../../../sailing-lab/rig/main-trim";
import type { MainTrimCommand } from "../../../sailing-lab/rig/main-trim";
import { ShapeTrimControls } from "./ShapeTrimControls";
import type { SheetTarget } from "../../../trainer-controls/WheelDeck";

/** Wheel travel changes the same real line command as the metres slider. */
export function mainTrimWheelTarget(target: MainTrimCommand, angle: number, putLength: (length: number) => void): SheetTarget {
  const { minLength, maxLength } = MAIN_TRIM_LIMITS;
  const span = maxLength - minLength;
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  return { ease: clamp((target.workingLength - minLength) / span), setEase: value => putLength(minLength + clamp(value) * span),
    valueText: `${target.workingLength.toFixed(1)} m (${Math.abs(angle).toFixed(1)}°)`,
    ariaNow: target.workingLength, ariaMin: minLength, ariaMax: maxLength, stepEase: .1 / span };
}

export function MainTrimTraveler({ target, onChange, tp }: { target: MainTrimCommand; onChange: (value: number) => void; tp: TpFn }) {
  return <PodSlider comfortable label={tp("Каретка", "Traveler", "Wózek", { es: "Carro", fr: "Chariot", de: "Traveller", it: "Carrello" })}
    value={`${target.traveler.toFixed(2)} m`} min={-.8} max={.8} step={.05} sliderValue={target.traveler} onChange={onChange} />;
}

export function MainTrimPod({ ui, setUi, sim, tp, children, goal, studyActive = false }: { ui: UiState; setUi: React.Dispatch<React.SetStateAction<UiState>>; sim: SimulationModel; tp: TpFn; children?: React.ReactNode; goal?: React.ReactNode; studyActive?: boolean }) {
  const rig = sim.session.mainTrim, target = ui.mainTrim;
  if (!rig || !target) return null;
  const put = (key: keyof MainTrimCommand, value: number) => setUi(p => ({ ...p, mainTrim: { ...p.mainTrim!, [key]: value } }));
  return <PodCard>
    <PodLabel text={tp("ГИКА-ШКОТ И КАРЕТКА", "MAINSHEET AND TRAVELER", "SZOT GROTA I WÓZEK", { es: "ESCOTA DE MAYOR Y CARRO", fr: "ÉCOUTE DE GRAND-VOILE ET CHARIOT", de: "GROSSSCHOT UND TRAVELLER", it: "SCOTTA DELLA RANDA E CARRELLO" })} />
    {goal}
    <div className="grid grid-cols-2 gap-3" data-testid="main-trim-primary">
    <PodSlider comfortable label={tp("Гика-шкот", "Mainsheet", "Szot grota", { es: "Escota de mayor", fr: "Écoute de grand-voile", de: "Großschot", it: "Scotta della randa" })}
      value={`${target.workingLength.toFixed(1)} m`} min={MAIN_TRIM_LIMITS.minLength} max={MAIN_TRIM_LIMITS.maxLength} step={.1} sliderValue={target.workingLength} onChange={v => put("workingLength", v)} />
    <MainTrimTraveler target={target} onChange={v => put("traveler", v)} tp={tp} />
    </div>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm tabular-nums text-[var(--text-primary)]">
      <dt>{tp("Гик", "Boom", "Bom", { es: "Botavara", fr: "Bôme", de: "Baum", it: "Boma" })}</dt><dd>{Math.abs(rig.pose.yaw).toFixed(1)}°</dd>
      <dt>{tp("Подъем гика", "Boom rise", "Uniesienie bomu", { es: "Elevación", fr: "Montée", de: "Anstieg", it: "Salita" })}</dt><dd>{rig.pose.rise.toFixed(1)}°</dd>
      <dt>{tp("Раскрытие верха (twist)", "Top opening (twist)", "Otwarcie góry (twist)", { es: "Apertura alta (torsión)", fr: "Ouverture haute (vrillage)", de: "Öffnung oben (Twist)", it: "Apertura alta (svergolamento)" })}</dt><dd>{(rig.twist * 20).toFixed(1)}°</dd>
      <dt>{tp("Слабина", "Slack", "Luz", { es: "Holgura", fr: "Mou", de: "Lose", it: "Imbando" })}</dt><dd>{rig.slack.toFixed(2)} m</dd>
    </dl>
    {children}
    <details className="border-t border-[var(--border-subtle)] text-sm text-[var(--text-secondary)]">
      <summary className="min-h-11 cursor-pointer py-3">{tp("Как работают снасти", "How the lines work", "Jak działają liny", { es: "Cómo funcionan los cabos", fr: "Fonctionnement des cordages", de: "So wirken die Leinen", it: "Come funzionano le cime" })}</summary>
      <p className="leading-relaxed">{tp("Меньше длина: выбрать. Больше: потравить. Каретка: минус на левый борт, плюс на правый. Указаны шесть рабочих ветвей, не весь трос. Помощник работает со снастью; лебедка и стопор пока не моделируются. Это учебное приближение.", "Shorter: trim in. Longer: ease out. Traveler: minus to port, plus to starboard. Length covers six moving spans, not the whole rope. An assistant handles the line; winch and clutch are not simulated yet. This is a teaching approximation.", "Krócej: wybierz. Dłużej: poluzuj. Wózek: minus na lewą, plus na prawą burtę. Długość obejmuje sześć odcinków, nie całą linę. Pomocnik obsługuje linę; kabestan i stoper nie są jeszcze modelowane. To przybliżenie szkoleniowe.", { es: "Menos longitud: cazar. Más: lascar. Carro: menos a babor, más a estribor. Se miden seis tramos de trabajo, no todo el cabo. Un ayudante maneja la escota; el winch y el stopper aún no se simulan. Es una aproximación didáctica.", fr: "Plus court : border. Plus long : choquer. Chariot : moins à bâbord, plus à tribord. Six brins, pas tout le cordage. Un assistant manœuvre ; winch et bloqueur non simulés. Modèle pédagogique.", de: "Kürzer: dichtholen. Länger: fieren. Traveller: minus nach Backbord, plus nach Steuerbord. Sechs Parten, nicht die ganze Leine. Ein Helfer bedient sie; Winsch und Stopper noch ohne Simulation. Lernmodell.", it: "Più corto: cazzare. Più lungo: lascare. Carrello: meno a sinistra, più a dritta. Sei tratti, non tutta la cima. Un assistente manovra; winch e stopper non simulati. Modello didattico." })}</p>
    </details>
    <ShapeTrimControls rig={rig} target={target} put={put} locked={studyActive} tp={tp} />
  </PodCard>;
}
