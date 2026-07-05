import {
  createInitialState,
  getBoatParams,
  settle,
  type Controls,
} from '@/lib/sailing-physics';
import { REEF_VALUES, toJibSheet, toMainSheet, type UiState } from '../ui/shared';
import { type RuntimeState } from './runtime-types';
import { createWindState } from './wind-dynamics';

// ---------------------------------------------------------------------------
// Build the engine-facing Controls from the UI state. Mapping lives in one
// place so the main page and the runtime hook agree on every envelope.
// ---------------------------------------------------------------------------

export function uiToControls(ui: UiState, params: ReturnType<typeof getBoatParams>): Controls {
  const jibFurlEff = ui.sailsRaised === 'main' ? 1 : 1 - ui.jibFurlPct / 100;
  const reefEff = ui.sailsRaised === 'jib' ? 1 : REEF_VALUES[ui.reefLevel];
  return {
    mainSheet: toMainSheet(ui.mainAngle, params.mainMaxOff),
    jibSheet: toJibSheet(ui.jibAngle, params.jibMinOff, params.jibMaxOff),
    mainTwist: ui.mainTwistPct / 100,
    jibTwist: ui.jibTwistPct / 100,
    reef: reefEff,
    jibFurl: jibFurlEff,
    jibSide: 1,
  };
}

// ---------------------------------------------------------------------------
// createRuntimeState: deterministic factory used both on mount and on reset.
//
// We pre-settle the boat for ~45 ticks so the opening frame already shows a
// healthy, moving state (Contract 1). Without this, the live loop would
// start from boatSpeed seed and the scene would look dead for the first
// second or so.
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
    // Boat starts aimed where it is - no spurious turn on mount.
    targetHeading: settled.state.heading,
    lastDiag: settled.diag,
    // Wind base = whatever the settle produced (slider TWS, settled dir).
    // Modulation starts neutral; the fixed seed keeps gust timing
    // deterministic across resets and tests.
    wind: createWindState({
      baseTws: ui.windSpeed,
      baseDir: settled.state.trueWindDir,
    }),
  };
}
