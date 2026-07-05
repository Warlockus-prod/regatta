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
