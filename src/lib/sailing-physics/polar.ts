import { createInitialState, tick } from "./simulate";
import { getBoatParams } from "./boat";
import type { BoatParams, BoatState, Controls } from "./types";

const defaultParams = getBoatParams();
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const baseControls = (reef: number): Controls => ({ mainSheet: .4, jibSheet: .2, mainTwist: .35, jibTwist: .4, reef, jibFurl: 0, jibSide: 1 });

/** What the crew trims for. Classic profile: sail drive at the current heel
 * (ADR-0001). Cruiser profile (ADR-0021): drive minus resistance once the boat
 * has heeled to what these sheets produce, so an overpowered boat is eased
 * instead of laid flat on its side. */
function trimObjective(state: BoatState, controls: Controls, params: BoatParams): number {
  if (!params.model) return tick(state, controls, params, 0).diag.drive;
  let probe = state;
  let result = tick(probe, controls, params, 0);
  for (let i = 0; i < 2; i++) {
    probe = { ...state, heel: result.diag.heelTarget ?? state.heel };
    result = tick(probe, controls, params, 0);
  }
  return result.diag.drive - (result.diag.resistance ?? 0);
}

/** Coordinate search of actual forward force, including the jib/main slot.
 * Uses current apparent wind, not a TWA-to-sheet table. */
export function trimForDrive(state: BoatState, initial: Controls, params: BoatParams = defaultParams): Controls {
  const controls = { ...initial };
  for (const step of [.125, .025]) {
    for (const key of ["jibSheet", "mainSheet"] as const) {
      const centre = controls[key];
      let best = -Infinity;
      for (let i = -4; i <= 4; i++) {
        const value = step === .125 ? (i + 4) * step : clamp(centre + i * step);
        const drive = trimObjective(state, { ...controls, [key]: value }, params);
        if (drive > best) { best = drive; controls[key] = value; }
      }
    }
  }
  return controls;
}

/** Warm-started, continuously retrimmed equilibrium. Stop on the measured
 * speed/heel/leeway residual, not an arbitrary short animation duration. */
export function solvePolarPoint(twa: number, tws: number, reef = 0, params: BoatParams = defaultParams) {
  let state = createInitialState({ twa, tws, boatSpeed: tws > 0 ? 7 : 0 });
  let controls = baseControls(reef);
  let stable = 0;
  let residual = Infinity;
  for (let seconds = 0; seconds < 900; seconds++) {
    if (seconds % 10 === 0) controls = trimForDrive(state, controls, params);
    const next = tick(state, controls, params, 1).state;
    residual = Math.max(Math.abs(next.boatSpeed - state.boatSpeed), Math.abs(next.heel - state.heel), Math.abs(next.leeway - state.leeway));
    state = next;
    stable = residual < .0001 ? stable + 1 : 0;
    if (stable >= 20) return { speed: state.boatSpeed, state, controls, converged: true, residual, seconds: seconds + 1 };
  }
  return { speed: state.boatSpeed, state, controls, converged: false, residual, seconds: 900 };
}
