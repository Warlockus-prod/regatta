import {
  createInitialState,
  getBoatParams,
  settle,
  type Controls,
} from '@/lib/sailing-physics';
import { createInitialOpponents } from '../race/opponents';
import { initialRaceState } from '../race/race-state';
import { type RuntimeState } from './runtime-types';

// ---------------------------------------------------------------------------
// V2 UI state shape.
//
// TWA here is unsigned (0-180); sign lives in `tack`. The scene expects
// signed TWA, the hook re-signs for both the heading derivation and for
// the scene props.
// ---------------------------------------------------------------------------

export interface UiState {
  twa: number;
  tack: 'starboard' | 'port';
  windSpeed: number;
  mainOn: boolean;
  jibOn: boolean;
  reefLevel: 0 | 1 | 2;
  autoRotate: boolean;
}

export const REEF_VALUES: Record<0 | 1 | 2, number> = { 0: 0, 1: 0.45, 2: 0.85 };

// ---------------------------------------------------------------------------
// Auto-trim: V2 is the race surface, not a trim trainer. Given the current
// TWA intent, pick sail angles that approximate a healthy trim for that
// point of sail. These match the same heuristic the pre-runtime page was
// using, just pulled into one place so create and step agree.
//
// The 10-degree offset between TWA and AWA estimate is a rule-of-thumb
// for the apparent wind shift a moving boat sees upwind. It is only used
// for auto-trim targets; the physics diagnostics still report the real
// AWA based on boat speed.
// ---------------------------------------------------------------------------

export function uiToControls(
  ui: UiState,
  params: ReturnType<typeof getBoatParams>,
): Controls {
  const awaEstimate = Math.max(20, ui.twa - 10);
  const mainAngle = Math.max(0, Math.min(params.mainMaxOff, awaEstimate - 14));
  const jibAngle = Math.max(
    params.jibMinOff,
    Math.min(params.jibMaxOff, awaEstimate - 12),
  );
  const mainSheet = Math.max(0, Math.min(1, 1 - mainAngle / params.mainMaxOff));
  const jibSheet = Math.max(
    0,
    Math.min(1, 1 - (jibAngle - params.jibMinOff) / (params.jibMaxOff - params.jibMinOff)),
  );
  return {
    mainSheet,
    jibSheet,
    mainTwist: 0.15,
    jibTwist: 0.12,
    reef: ui.mainOn ? REEF_VALUES[ui.reefLevel] : 1,
    jibFurl: ui.jibOn ? 0 : 1,
    jibSide: 1,
  };
}

// ---------------------------------------------------------------------------
// createRuntimeState: deterministic factory for mount and reset. Pre-settles
// the boat for ~45 ticks so the opening frame already shows a moving boat
// instead of ramping up from the seed speed visibly.
// ---------------------------------------------------------------------------

export function createRuntimeState(args: {
  ui: UiState;
  params: ReturnType<typeof getBoatParams>;
}): RuntimeState {
  const { ui, params } = args;
  const signedTwa = ui.tack === 'starboard' ? ui.twa : -ui.twa;
  const controls = uiToControls(ui, params);
  const init = createInitialState({
    tws: ui.windSpeed,
    twa: signedTwa,
    boatSpeed: Math.max(3, ui.windSpeed * 0.45),
  });
  const settled = settle(init, controls, params, 45, 0.1);
  return {
    simTime: 0,
    boat: settled.state,
    live: controls,
    target: controls,
    targetHeading: settled.state.heading,
    lastDiag: settled.diag,
    // Start the boat roughly on the start line (slightly behind the pin
    // so the first maneuver after the gun is crossing it).
    position: { x: 0, z: 8 },
    race: initialRaceState(0),
    opponents: createInitialOpponents(),
  };
}
