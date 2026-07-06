import type { Lang } from '@/lib/languages';
import { trainerCatalog } from '@/data/drills';
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
// Ids and localized title/goal text come from the cross-platform trainer
// catalog (src/data/drills.ts, SIMULATORS.md roadmap #5). This module keeps
// what is web-runtime-specific: UiState templates, time limits and the
// evaluate() predicates. Both live as plain data so the UI (ModeBar,
// ScenarioPicker, DrillCard) is purely presentational.
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

/** Title + goal text for one catalog id. Throws on a missing id so a typo
 *  fails loudly at module load (and in vitest) instead of rendering blanks. */
function catalogText(id: string): { title: TriLangText; goal: TriLangText } {
  const entry = trainerCatalog.find((e) => e.id === id);
  if (!entry) {
    throw new Error(`[simulator-v3] src/data/drills.ts has no catalog entry "${id}"`);
  }
  return { title: entry.title, goal: entry.goal };
}

/** Same lookup, shaped for ScenarioPreset (catalog `goal` = scenario summary). */
function scenarioText(id: string): { title: TriLangText; summary: TriLangText } {
  const { title, goal } = catalogText(id);
  return { title, summary: goal };
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
    ...scenarioText('beam-healthy'),
    ui: { ...DEFAULT_UI },
  },
  {
    id: 'overpowered',
    ...scenarioText('overpowered'),
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
    ...scenarioText('main-overtrim'),
    ui: {
      ...DEFAULT_UI,
      mainAngle: 14,
    },
  },
  {
    id: 'bad-slot',
    ...scenarioText('bad-slot'),
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
    ...catalogText('hold-trim'),
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
    ...catalogText('recover-stall'),
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
    ...catalogText('reduce-heel'),
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
