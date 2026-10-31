'use client';

// Start flags over the race scene (M3-3). Information, not decoration: the
// class flag goes up with the countdown horn, flag P on the next second and
// down on the last one, the class flag comes down at the gun (RRS 26 order);
// flag X (individual recall, RRS 29.1) shows while the player is over early.
// Which flags show is decided by startFlags() in src/lib/race-start-signals.ts.
// Small inline SVG, no external asset, fixed signal-flag colours (never cyan),
// no animation: a flag simply appears and leaves, so prefers-reduced-motion
// needs nothing extra. No tap target. One name source per flag (aria-label, no
// <title>), so a screen reader says each flag once.

import { useI18n } from "@/lib/i18n";
import type { StartFlag } from "@/lib/race-start-signals";
import styles from "./RaceFeedbackLayer.module.css";

const NAVY = "#1f4e9c";
const WHITE = "#ffffff";

export function useStartFlagCopy(): { group: string } & Record<StartFlag, string> {
  const { tl } = useI18n();
  return {
    group: tl({ ru: "Сигналы старта", en: "Start signals", pl: "Sygnały startowe", es: "Señales de salida", fr: "Signaux de départ", de: "Startsignale", it: "Segnali di partenza" }),
    class: tl({ ru: "Флаг класса: предупреждающий сигнал", en: "Class flag: warning signal", pl: "Flaga klasy: sygnał ostrzeżenia", es: "Bandera de clase: señal de atención", fr: "Pavillon de classe : signal d'avertissement", de: "Klassenflagge: Ankündigungssignal", it: "Bandiera di classe: segnale di avviso" }),
    preparatory: tl({ ru: "Флаг P: подготовительный сигнал", en: "Flag P: preparatory signal", pl: "Flaga P: sygnał przygotowania", es: "Bandera P: señal de preparación", fr: "Pavillon P : signal préparatoire", de: "Flagge P: Vorbereitungssignal", it: "Bandiera P: segnale preparatorio" }),
    recall: tl({ ru: "Флаг X: индивидуальный отзыв, вернись за линию", en: "Flag X: individual recall, return behind the line", pl: "Flaga X: odwołanie indywidualne, wróć za linię", es: "Bandera X: llamada individual, vuelve detrás de la línea", fr: "Pavillon X : rappel individuel, repasse derrière la ligne", de: "Flagge X: Einzelrückruf, zurück hinter die Linie", it: "Bandiera X: richiamo individuale, torna dietro la linea" }),
  };
}

function FlagArt({ flag }: { flag: StartFlag }) {
  if (flag === "preparatory") return <><rect width={36} height={24} fill={NAVY} /><rect x={11} y={7} width={14} height={10} fill={WHITE} /></>;
  if (flag === "recall") return <><rect width={36} height={24} fill={WHITE} /><rect x={15} width={6} height={24} fill={NAVY} /><rect y={9} width={36} height={6} fill={NAVY} /></>;
  // Class flag: a white flag with a dark sail and hull, the class insignia of our one boat.
  return <><rect width={36} height={24} fill={WHITE} /><path d="M17 4v13h-8z" fill={NAVY} /><path d="M19 6v11h6z" fill={NAVY} /><path d="M8 18.5h20l-3 2.5H11z" fill={NAVY} /></>;
}

export function RaceStartFlags({ flags }: { flags: readonly StartFlag[] }) {
  const copy = useStartFlagCopy();
  if (!flags.length) return null;
  // A list, not a div: the scene stretches its direct div children to full height.
  return <ul className={styles.startFlags} aria-label={copy.group} data-testid="race-start-flags">
    {flags.map(flag => <li key={flag}><svg className={styles.startFlag} width={36} height={24} viewBox="0 0 36 24" role="img"
      aria-label={copy[flag]} data-flag={flag} data-testid={`race-start-flag-${flag}`} focusable="false">
      <FlagArt flag={flag} />
      <rect x={0.5} y={0.5} width={35} height={23} fill="none" stroke="rgb(0 0 0 / .45)" />
    </svg></li>)}
  </ul>;
}
