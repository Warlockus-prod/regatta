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

export type TriLangText = { ru: string; en: string; pl: string; es?: string; fr?: string; de?: string; it?: string };

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
    },
    summary: {
      ru: '12 узлов, оптимум. Почувствуй, как должно быть.',
      en: '12 kt beam reach, optimum trim. Feel the baseline.',
      pl: '12 wezlow, optymalny trym. Wyczuj baze.',
    },
    ui: { ...DEFAULT_UI },
  },
  {
    id: 'overpowered',
    title: {
      ru: 'Перегруз',
      en: 'Overpowered',
      pl: 'Za duzo mocy',
    },
    summary: {
      ru: '20 узлов, острый курс, риф не взят. Что будешь делать?',
      en: '20 kt close-hauled, no reef. Too much sail up - your move.',
      pl: '20 wezlow na orce, bez refa. Co zrobisz?',
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
    },
    summary: {
      ru: '12 узлов галф. Грот выбран слишком сильно, поток сорвётся.',
      en: '12 kt beam reach. Main sheeted hard - flow is about to stall.',
      pl: '12 wezlow polwiatr. Grot za mocno przyciagniety.',
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
    },
    summary: {
      ru: '14 узлов, стаксель душит грот. Открой слот.',
      en: '14 kt, jib is choking the main. Open the slot.',
      pl: '14 wezlow, fok dusi grota. Otworz slot.',
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
    },
    goal: {
      ru: 'Держи трим не ниже 85% десять секунд подряд.',
      en: 'Keep trim at 85% or above for ten straight seconds.',
      pl: 'Utrzymaj trym 85% lub wyzej przez 10 sekund.',
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
    },
    goal: {
      ru: 'Выведи грот из срыва и удерживай трим 70%+ пять секунд.',
      en: 'Recover the main from stall and hold trim 70%+ for 5 seconds.',
      pl: 'Wyprowadz grota ze zerwania, trzymaj 70%+ przez 5 s.',
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
    },
    goal: {
      ru: 'Удержи крен меньше 20° пять секунд. Риф или ослабление?',
      en: 'Hold heel under 20 deg for 5 seconds. Reef or ease?',
      pl: 'Przechyl ponizej 20 stopni przez 5 s. Ref czy luzowanie?',
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
