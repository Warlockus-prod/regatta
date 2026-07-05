import type { Lang } from '@/lib/languages';
import { DEFAULT_UI, type UiState } from '../ui/shared';

// ---------------------------------------------------------------------------
// Scenario and drill catalogue for V3's product loop (PR-4).
//
// A SCENARIO is a named starting condition: wind + trim + course. Picking one
// reseeds the sim so the user can feel a specific situation without having to
// dial it in by hand. Purely a UiState template; no win/fail logic.
//
// A DRILL wraps a scenario with a goal: "keep trim above 85% for 10 seconds".
// The page evaluates the goal each tick and transitions to win/fail. Drills
// teach a single concept each; copy is short and language-specific.
//
// Both live as plain data so the UI (ModeBar, ScenarioPicker, DrillCard) is
// purely presentational.
// ---------------------------------------------------------------------------

export type TriLangText = {
  ru: string;
  en: string;
  pl: string;
  es?: string;
  fr?: string;
  de?: string;
  it?: string;
};

/**
 * Read a TriLangText for the active language with an EN fallback. Every UI
 * read site must go through this - indexing `t[lang]` directly renders an
 * empty node for any language whose string is missing (the ES/FR/DE/IT
 * blank-card bug).
 */
export function pickText(t: TriLangText, lang: Lang): string {
  return t[lang] ?? t.en;
}

export interface ScenarioPreset {
  id: string;
  title: TriLangText;
  summary: TriLangText;
  ui: UiState;
}

export interface DrillEvalInput {
  /** Current trim score in [0, 100]. */
  trimScore: number;
  /** Signed heel in deg. Callers usually care about abs(). */
  heel: number;
  /** Slot health in [0, 1]. */
  slotHealth: number;
  /** Engine's stall flag for the main. */
  mainStalled: boolean;
  /** Engine's stall flag for the jib. */
  jibStalled: boolean;
}

export interface DrillDefinition {
  id: string;
  title: TriLangText;
  goal: TriLangText;
  /** Scenario to reset to at drill start. */
  initialUi: UiState;
  /** How long the drill lasts overall (seconds). Fail if holdDuration not
   *  reached by then. */
  timeLimit: number;
  /** How long the evaluate(...) condition must be continuously true for a
   *  win. Drops back to 0 the moment the condition breaks. */
  holdDuration: number;
  evaluate: (sim: DrillEvalInput) => boolean;
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'beam-healthy',
    title: {
      ru: 'Галф, спокойно',
      en: 'Beam reach, clean',
      pl: 'Polwiatr, spokojnie',
      es: 'Través, tranquilo',
      fr: 'Travers, tranquille',
      de: 'Halbwind, ruhig',
      it: 'Traverso, tranquillo',
    },
    summary: {
      ru: '12 узлов, оптимум. Почувствуй, как должно быть.',
      en: '12 kt beam reach, optimum trim. Feel the baseline.',
      pl: '12 wezlow, optymalny trym. Wyczuj baze.',
      es: '12 nudos de través, trimado optimo. Siente la referencia.',
      fr: '12 noeuds au travers, réglage optimal. Sens la référence.',
      de: '12 kn Halbwind, optimaler Trimm. Spuere die Basis.',
      it: '12 nodi al traverso, trim ottimale. Senti la base.',
    },
    ui: { ...DEFAULT_UI },
  },
  {
    id: 'overpowered',
    title: {
      ru: 'Перегруз',
      en: 'Overpowered',
      pl: 'Za duzo mocy',
      es: 'Sobrecargado',
      fr: 'Surpuissance',
      de: 'Ueberpowert',
      it: 'Sovrapotenza',
    },
    summary: {
      ru: '20 узлов, острый курс, риф не взят. Что будешь делать?',
      en: '20 kt close-hauled, no reef. Too much sail up - your move.',
      pl: '20 wezlow na orce, bez refa. Co zrobisz?',
      es: '20 nudos en ceñida, sin rizo. Demasiada vela arriba: tu decides.',
      fr: '20 noeuds au près, pas de ris. Trop de toile: à toi de jouer.',
      de: '20 kn am Wind, kein Reff. Zu viel Segel oben: dein Zug.',
      it: '20 nodi di bolina, senza terzaroli. Troppa tela a riva: tocca a te.',
    },
    ui: {
      ...DEFAULT_UI,
      windSpeed: 20,
      twa: 42,
      mainAngle: 18,
      jibAngle: 22,
      reefLevel: 0,
    },
  },
  {
    id: 'main-overtrim',
    title: {
      ru: 'Грот перебран',
      en: 'Main overtrimmed',
      pl: 'Grot przebrany',
      es: 'Mayor sobretrimada',
      fr: 'GV surbordée',
      de: 'Gross zu dicht',
      it: 'Randa sovratesata',
    },
    summary: {
      ru: '12 узлов галф. Грот выбран слишком сильно, поток сорвётся.',
      en: '12 kt beam reach. Main sheeted hard - flow is about to stall.',
      pl: '12 wezlow polwiatr. Grot za mocno przyciagniety.',
      es: '12 nudos de través. Mayor cazada a tope: el flujo va a desprenderse.',
      fr: "12 noeuds au travers. GV bordée à bloc: l'écoulement va décrocher.",
      de: '12 kn Halbwind. Gross zu dicht geholt: die Stroemung reisst gleich ab.',
      it: '12 nodi al traverso. Randa cazzata a ferro: il flusso sta per staccarsi.',
    },
    ui: {
      ...DEFAULT_UI,
      mainAngle: 14,
    },
  },
  {
    id: 'bad-slot',
    title: {
      ru: 'Плохой слот',
      en: 'Bad slot',
      pl: 'Zly slot',
      es: 'Mal slot',
      fr: 'Mauvais slot',
      de: 'Schlechter Slot',
      it: 'Slot sbagliato',
    },
    summary: {
      ru: '14 узлов, стаксель душит грот. Открой слот.',
      en: '14 kt, jib is choking the main. Open the slot.',
      pl: '14 wezlow, fok dusi grota. Otworz slot.',
      es: '14 nudos, el foque ahoga la mayor. Abre el slot.',
      fr: '14 noeuds, le foc étouffe la GV. Ouvre le slot.',
      de: '14 kn, die Fock erstickt das Gross. Oeffne den Slot.',
      it: '14 nodi, il fiocco soffoca la randa. Apri lo slot.',
    },
    ui: {
      ...DEFAULT_UI,
      windSpeed: 14,
      twa: 60,
      jibAngle: 8,
      jibFurlPct: 100,
      mainAngle: 32,
    },
  },
];

export const DRILLS: DrillDefinition[] = [
  {
    id: 'hold-trim',
    title: {
      ru: 'Держи трим',
      en: 'Hold trim',
      pl: 'Utrzymaj trym',
      es: 'Mantén el trim',
      fr: 'Maintiens le trim',
      de: 'Halte den Trimm',
      it: 'Tieni il trim',
    },
    goal: {
      ru: 'Держи трим не ниже 85% десять секунд подряд.',
      en: 'Keep trim at 85% or above for ten straight seconds.',
      pl: 'Utrzymaj trym 85% lub wyzej przez 10 sekund.',
      es: 'Mantén el trim al 85% o más durante diez segundos seguidos.',
      fr: 'Garde le trim à 85% ou plus pendant dix secondes de suite.',
      de: 'Halte den Trimm zehn Sekunden am Stueck bei 85% oder mehr.',
      it: "Tieni il trim all'85% o più per dieci secondi di fila.",
    },
    initialUi: {
      ...DEFAULT_UI,
      // Off by ~10 deg on each sail so the user has to move, not just sit.
      mainAngle: 40,
      jibAngle: 40,
    },
    timeLimit: 40,
    holdDuration: 10,
    evaluate: (s) => s.trimScore >= 85,
  },
  {
    id: 'recover-stall',
    title: {
      ru: 'Выход из срыва',
      en: 'Recover from stall',
      pl: 'Wyjscie ze zerwania',
      es: 'Sal del stall',
      fr: 'Sors du décrochage',
      de: 'Raus aus dem Stall',
      it: 'Esci dallo stallo',
    },
    goal: {
      ru: 'Выведи грот из срыва и удерживай трим 70%+ пять секунд.',
      en: 'Recover the main from stall and hold trim 70%+ for 5 seconds.',
      pl: 'Wyprowadz grota ze zerwania, trzymaj 70%+ przez 5 s.',
      es: 'Saca la mayor del stall y mantén el trim en 70%+ durante 5 segundos.',
      fr: 'Sors la GV du décrochage et maintiens le trim à 70%+ pendant 5 secondes.',
      de: 'Hol das Gross aus dem Stall und halte den Trimm 5 Sekunden bei 70%+.',
      it: 'Riporta la randa fuori dallo stallo e tieni il trim al 70%+ per 5 secondi.',
    },
    initialUi: {
      ...DEFAULT_UI,
      mainAngle: 8,
      jibAngle: 14,
    },
    timeLimit: 30,
    holdDuration: 5,
    evaluate: (s) => !s.mainStalled && s.trimScore >= 70,
  },
  {
    id: 'reduce-heel',
    title: {
      ru: 'Убери крен',
      en: 'Reduce heel',
      pl: 'Zmniejsz przechyl',
      es: 'Reduce la escora',
      fr: 'Réduis la gîte',
      de: 'Kraengung senken',
      it: 'Riduci lo sbandamento',
    },
    goal: {
      ru: 'Удержи крен меньше 20° пять секунд. Риф или ослабление?',
      en: 'Hold heel under 20° for 5 seconds. Reef or ease?',
      pl: 'Przechyl ponizej 20° przez 5 s. Ref czy luzowanie?',
      es: 'Mantén la escora bajo 20° durante 5 segundos. Rizar o lascar?',
      fr: 'Garde la gîte sous 20° pendant 5 secondes. Ris ou choquer?',
      de: 'Halte die Kraengung 5 Sekunden unter 20°. Reffen oder fieren?',
      it: 'Tieni lo sbandamento sotto i 20° per 5 secondi. Terzarolare o lascare?',
    },
    initialUi: {
      ...DEFAULT_UI,
      windSpeed: 20,
      twa: 50,
      mainAngle: 28,
      jibAngle: 30,
      reefLevel: 0,
    },
    timeLimit: 35,
    holdDuration: 5,
    evaluate: (s) => Math.abs(s.heel) < 20,
  },
];
