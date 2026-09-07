'use client';

import { useId } from "react";
import { clamp, finite, REEF_VALUES, type SimulationModel, type TpFn, type UiState } from "./shared";
import { projectSailPoint, projectedSailPath } from "./sail-projection";

const MAIN = "#f3dfac";
const JIB = "#70cee0";

/** Deliberate orthographic teaching diagrams. Rear is a transom section;
 * side is a longitudinal profile. No fake perspective or mirrored sails. */
export function SceneElevation({ view, ui, sim, tp }: {
  view: "rear" | "side"; ui: UiState; sim: SimulationModel; tp: TpFn;
}) {
  const uid = useId().replace(/:/g, "");
  const rear = view === "rear";
  const heel = Math.abs(finite(sim.result.state.heel));
  const side = finite(sim.signedTwa) >= 0 ? -1 : 1;
  const roll = rear ? side * Math.min(heel, 45) : 0;
  const mainAngle = clamp(sim.liveMainAngle, 0, 90);
  const jibAngle = clamp(sim.liveJibAngle, 0, 90);
  const reef = REEF_VALUES[ui.reefLevel];
  const furl = clamp(ui.jibFurlPct / 100, 0, 1);
  const mainVisible = ui.sailsRaised !== "jib";
  const jibVisible = ui.sailsRaised !== "main" && furl > 0.05;
  const mainLuffing = finite(sim.result.diag.mainAoA) < 6;
  const jibLuffing = finite(sim.result.diag.jibAoA) < 6;
  const mainName = tp("Грот", "Main", "Grot", { es: "Mayor", fr: "Grand-voile", de: "Grosssegel", it: "Randa" });
  const jibName = tp("Стаксель", "Jib", "Fok", { es: "Foque", fr: "Foc", de: "Fock", it: "Fiocco" });
  const heelLabel = tp("Крен", "Heel", "Przechyl", { es: "Escora", fr: "Gite", de: "Krangung", it: "Sbandamento" });
  const title = rear
    ? tp("Вид с кормы", "View from astern", "Widok od rufy", { es: "Vista desde popa", fr: "Vue de poupe", de: "Blick von achtern", it: "Vista da poppa" })
    : tp("Вид сбоку", "Side profile", "Widok z boku", { es: "Vista lateral", fr: "Vue de profil", de: "Seitenansicht", it: "Vista laterale" });
  const hint = rear
    ? tp("Смотри, как кренится мачта и отклоняются паруса.", "Watch the mast heel and the sails open out.", "Obserwuj przechyl masztu i wychylenie zagli.", { es: "Observa la escora del mastil y la apertura de las velas.", fr: "Observe la gite du mat et l'ouverture des voiles.", de: "Beobachte Mastneigung und Segeloffnung.", it: "Osserva lo sbandamento e l'apertura delle vele." })
    : tp("Нос справа. Здесь хорошо видны рифление и раскрытие стакселя.", "Bow to the right. Compare reefing and jib furling here.", "Dziob po prawej. Porownuj refowanie i rozwijanie foka.", { es: "Proa a la derecha. Compara los rizos y el enrollado del foque.", fr: "Proue a droite. Compare les ris et l'enroulement du foc.", de: "Bug rechts. Vergleiche Reffen und Ausrollen der Fock.", it: "Prua a destra. Confronta terzaroli e avvolgimento del fiocco." });
  const note = rear
    ? tp("Паруса могут перекрываться. Выбери «Грот» или «Стакс.», чтобы рассмотреть один.", "Sails can overlap. Select Main or Jib to inspect one sail.", "Zagle moga sie nakladac. Wybierz Grot lub Fok, aby obejrzec jeden.", { es: "Las velas pueden solaparse. Selecciona Mayor o Foque para ver una.", fr: "Les voiles peuvent se superposer. Choisis Grand-voile ou Foc.", de: "Segel konnen sich uberdecken. Wahle Grosssegel oder Fock einzeln.", it: "Le vele possono sovrapporsi. Seleziona Randa o Fiocco." })
    : tp("Это боковая проекция: при потравливании паруса видны уже. Углы трима сравнивай сверху, крен с кормы.", "This is a side projection: eased sails look narrower. Compare trim angles from above and heel from astern.", "To rzut boczny: luzowane zagle wygladaja na wezsze. Katy trymu porownuj z gory, przechyl od rufy.", { es: "Las velas amolladas parecen mas estrechas. Compara los angulos desde arriba y la escora desde popa.", fr: "Les voiles choquees paraissent plus etroites. Compare les angles de dessus et la gite de poupe.", de: "Gefierte Segel wirken schmaler. Vergleiche Trimmwinkel von oben und Krangung von achtern.", it: "Le vele lascate appaiono piu strette. Confronta gli angoli dall'alto e lo sbandamento da poppa." });
  const mainTackX = rear ? 0 : 6.4;
  const boomEnd = projectSailPoint("main", 1, 0, mainAngle, side, 0, 0, rear);
  const mainPath = projectedSailPath("main", mainAngle, side, reef, 0, rear);
  const jibPath = projectedSailPath("jib", jibAngle, side, 0, 1 - furl, rear);
  const mainStatus = mainLuffing
    ? tp("полощет", "luffing", "lopocze", { es: "flamea", fr: "faseye", de: "killt", it: "fileggia" })
    : sim.result.diag.mainStalled
      ? tp("срыв потока", "stalled", "oderwanie strug", { es: "perdida", fr: "decrochage", de: "Stromungsabriss", it: "stallo" }) : "";
  const jibStatus = jibLuffing
    ? tp("полощет", "luffing", "lopocze", { es: "flamea", fr: "faseye", de: "killt", it: "fileggia" })
    : sim.result.diag.jibStalled
      ? tp("срыв потока", "stalled", "oderwanie strug", { es: "perdida", fr: "decrochage", de: "Stromungsabriss", it: "stallo" }) : "";
  return <div className="absolute inset-0 flex min-h-0 flex-col" style={{ background: "var(--bg-primary)" }}>
    <div className="flex items-start justify-between gap-4 px-5 pt-5">
      <div><h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h2>
        <p className="mt-1 hidden text-xs leading-relaxed sm:block" style={{ color: "var(--text-secondary)" }}>{hint}</p></div>
      <div className="shrink-0 text-right"><span className="block text-xs" style={{ color: "var(--text-secondary)" }}>{heelLabel}</span>
        <strong className="text-xl tabular-nums" style={{ color: heel > 28 ? "var(--danger)" : "var(--accent-cyan)" }}>{Math.round(heel)}°</strong></div>
    </div>
    <svg viewBox={rear ? "130 45 500 450" : "150 45 460 450"} role="img" aria-label={title} className="block min-h-0 w-full flex-1">
      <defs>
        <linearGradient id={`${uid}-main`}><stop stopColor="#9a977f" /><stop offset=".48" stopColor="#f6edcf" /><stop offset="1" stopColor="#d6d3b9" /></linearGradient>
        <linearGradient id={`${uid}-jib`}><stop stopColor="#6997a7" /><stop offset=".55" stopColor="#b3dce3" /><stop offset="1" stopColor="#7fa7b7" /></linearGradient>
        <clipPath id={`${uid}-mainclip`}><path d={mainPath} /></clipPath>
        <clipPath id={`${uid}-jibclip`}><path d={jibPath} /></clipPath>
      </defs>
      {/* Horizontal water reference, no inverted/reflected sails below it. */}
      <path d="M 65 397 H 695" stroke="#23445b" strokeWidth="1" />
      {rear && <path d="M 380 70 V 400" stroke="#557083" strokeDasharray="4 7" opacity=".65" />}
      <g transform={`translate(380 397) rotate(${roll})`}>
        {/* Underwater appendages: distinct from the sails, muted and correctly sized. */}
        <g transform={`scale(${rear ? 0.5 : 0.66} .66)`} opacity=".38" fill="#557185" stroke="#87a0b1" strokeWidth="1.5">
          {rear ? <path d="M -7 6 L -5 76 Q 0 83 5 76 L 7 6 Z" /> : <>
            <path d="M -23 1 L -14 62 L 10 62 L 19 1 Z" />
            <path d="M -139 -6 L -147 39 L -132 40 L -122 -4 Z" />
          </>}
        </g>
        <g transform={`scale(${rear ? 0.5 : 0.66} .66)`}>{rear ? <>
          {/* Transom seen end-on: beam, cockpit opening and centred wheel. */}
          <path d="M -67 -31 Q -74 -7 -48 12 Q 0 32 48 12 Q 74 -7 67 -31 Z" fill="#cedce2" stroke="#6c8799" strokeWidth="2" />
          <path d="M -55 -34 Q 0 -42 55 -34 L 42 -15 L -42 -15 Z" fill="#465e70" stroke="#9bb1bc" strokeWidth="2" />
          <path d="M -23 -48 H 23 L 32 -34 H -32 Z" fill="#a9bdc9" />
          <path d="M -15 -44 H 15 V -36 H -15 Z" fill="#183448" />
          <path d="M -63 -32 V -57 H -34 M 63 -32 V -57 H 34" fill="none" stroke="#9cb2bd" strokeWidth="2" />
          <circle cx="0" cy="-26" r="11" fill="none" stroke="#e1e9ed" strokeWidth="2" />
          <path d="M -11 -26 H 11 M 0 -37 V -15" stroke="#e1e9ed" />
          <path d="M -36 -5 H 36" stroke="#78929f" />
        </> : <>
          <path d="M -167 -29 Q -13 -20 169 -33 L 148 5 Q -9 32 -160 2 Z" fill="#d2e0e5" stroke="#7e98a8" strokeWidth="2" />
          <path d="M -100 -30 L -60 -47 H 51 L 86 -30 Z" fill="#b2c6d0" stroke="#8aa3b2" />
          <path d="M -52 -42 H 37 L 53 -33 H -62 Z" fill="#23475a" />
          <path d="M -162 -35 V -49 H -97 M 94 -36 L 156 -43 V -31" fill="none" stroke="#9cb2bd" strokeWidth="2" />
          <path d="M -166 -10 Q 0 1 155 -12" fill="none" stroke="#547589" strokeWidth="2" />
          <circle cx="-112" cy="-35" r="9" fill="none" stroke="#b6c7cf" strokeWidth="2" />
        </>}</g>
        {!rear && <path d="M -100 -20 L 4.8 -291.2 L 100.8 -24" fill="none" stroke="#607d8f" strokeWidth="1.2" />}
        {jibVisible && <g>
          <path d={jibPath} fill={`url(#${uid}-jib)`} stroke={JIB} strokeWidth="1.6" opacity={rear ? 0.7 : 0.9} />
          <g clipPath={`url(#${uid}-jibclip)`} stroke="#426d7d" opacity=".32">
            {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M -190 ${-70-i*38} Q 0 ${-62-i*38} 190 ${-70-i*38}`} fill="none" />)}
          </g>
        </g>}
        {mainVisible && <g>
          <path d={mainPath} fill={`url(#${uid}-main)`} stroke={MAIN} strokeWidth="1.8" />
          <g clipPath={`url(#${uid}-mainclip)`} stroke="#797d71" opacity=".35">
            {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M -170 ${-80-i*39} Q 0 ${-69-i*39} 170 ${-80-i*39}`} fill="none" />)}
          </g>
          <path d={`M ${mainTackX} -44 L ${boomEnd.x} -44`} stroke="#a6bac4" strokeWidth="4" strokeLinecap="round" />
        </g>}
        <path d={`M ${mainTackX} -20 V -318.4`} stroke="#aebfc9" strokeWidth="3" strokeLinecap="round" />
        {rear && <>
          <path d="M -55 -30 L 0 -329 L 55 -30 M -26 -205 H 26 M -20 -260 H 20" fill="none" stroke="#7e99a9" strokeWidth="1.2" />
          <path d="M -22 -33 V -62 H 22 V -33" fill="none" stroke="#90a9b7" strokeWidth="2" />
        </>}
      </g>
      <path d="M 100 397 H 660" stroke="#2c728c" strokeWidth="2" opacity=".75" />
      <path d="M 170 414 H 275 M 490 414 H 595" stroke="#23445b" />
    </svg>
    <div className="space-y-2 px-5 pb-4 text-xs leading-relaxed">
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {mainVisible && <span style={{ color: MAIN }}>● {mainName}: {Math.round(mainAngle)}°{mainStatus && ` · ${mainStatus}`}{ui.reefLevel > 0 && ` · R${ui.reefLevel}`}</span>}
        {jibVisible && <span style={{ color: JIB }}>● {jibName}: {Math.round(jibAngle)}° · {Math.round(furl * 100)}%{jibStatus && ` · ${jibStatus}`}</span>}
      </div>
      <p className="hidden sm:block" style={{ color: "var(--text-secondary)" }}>{note}</p>
      <details className="sm:hidden" style={{ color: "var(--text-secondary)" }}>
        <summary className="cursor-pointer">{tp("Как читать схему", "Read this view", "Jak czytac schemat", { es: "Como leer la vista", fr: "Lire cette vue", de: "Ansicht verstehen", it: "Leggere questa vista" })}</summary>
        <p className="mt-2 max-h-20 overflow-y-auto">{note}</p>
      </details>
    </div>
  </div>;
}
