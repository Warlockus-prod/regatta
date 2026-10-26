import type { UiState, ReefLevel } from "../ui/shared";
import {
  DRILLS,
  SCENARIO_PRESETS,
  type DrillDefinition,
  type ScenarioPreset,
} from './scenario-presets';

// ---------------------------------------------------------------------------
// Lesson deep-links into the Trainer (docs/design/SIMULATORS.md roadmap #4).
//
// `/simulator-v3?drill=<id>` opens the page in Drills mode with that drill
// already running; `?scenario=<id>` opens Scenario mode with that preset
// applied. Bootcamp lessons (src/data/bootcamp.ts) and the iOS app
// (`?embed=1&drill=...`) link here.
//
// Resolution is a pure function so it can be unit-tested without mounting
// the page. Precedence when both params are present: drill wins; an unknown
// drill id falls through to the scenario; unknown ids resolve to null and
// are ignored silently (the page then applies plain share-state params).
// ---------------------------------------------------------------------------

export type TrainerDeepLink =
  | { kind: 'drill'; drill: DrillDefinition }
  | { kind: 'scenario'; scenario: ScenarioPreset };

export function resolveTrainerDeepLink(params: URLSearchParams): TrainerDeepLink | null {
  const drillId = params.get('drill');
  if (drillId) {
    const drill = DRILLS.find((d) => d.id === drillId);
    if (drill) return { kind: 'drill', drill };
  }
  const scenarioId = params.get('scenario');
  if (scenarioId) {
    const scenario = SCENARIO_PRESETS.find((s) => s.id === scenarioId);
    if (scenario) return { kind: 'scenario', scenario };
  }
  return null;
}


/** A lesson entry changes only its local camera, never saved control preferences. */
export function resolveWindObservationEntry(params: URLSearchParams): { boatView: "whole" } | null {
  if (params.get("fromLesson") !== "wind-direction" || resolveTrainerDeepLink(params)) return null;
  if (["twist", "depth"].includes(params.get("assessment") ?? "") || ["mainsheet", "shape"].includes(params.get("study") ?? "")) return null;
  return { boatView: "whole" };
}

export function readTrainerSetupFromSearch(search: string): Partial<UiState> | null {
  const p = new URLSearchParams(search);
  if (!p.toString()) return null;
  const out: Partial<UiState> = {};
  const num = (k: string) => {
    const v = p.get(k);
    if (v === null || !v.trim()) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const twa = num('twa');
  if (twa !== undefined && twa >= 0 && twa <= 180) out.twa = Math.round(twa);
  const tws = num('tws');
  if (tws !== undefined && tws >= 4 && tws <= 25) out.windSpeed = Math.round(tws);
  const main = num('main');
  if (main !== undefined && main >= 0 && main <= 85) out.mainAngle = main;
  const jib = num('jib');
  if (jib !== undefined && jib >= 5 && jib <= 55) out.jibAngle = jib;
  const reef = p.get('reef');
  if (reef === '0' || reef === '1' || reef === '2') {
    out.reefLevel = Number(reef) as ReefLevel;
  }
  const tack = p.get('tack');
  if (tack === 'p') out.tack = 'port';
  if (tack === 's') out.tack = 'starboard';
  return Object.keys(out).length ? out : null;
}
