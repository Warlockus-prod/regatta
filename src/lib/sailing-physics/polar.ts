import { createInitialState, tick } from "./simulate";
import { getBoatParams } from "./boat";
import type { BoatState, Controls } from "./types";

const params = getBoatParams();
const clamp = (v: number) => Math.max(0, Math.min(1, v));
const baseControls = (reef: number): Controls => ({ mainSheet: .4, jibSheet: .2, mainTwist: .35, jibTwist: .4, reef, jibFurl: 0, jibSide: 1 });

/** Coordinate search of actual forward force, including the jib/main slot.
 * Uses current apparent wind, not a TWA-to-sheet table. */
export function trimForDrive(state: BoatState, initial: Controls): Controls {
  const controls = { ...initial };
  for (const step of [.125, .025]) {
    for (const key of ["jibSheet", "mainSheet"] as const) {
      const centre = controls[key];
      let best = -Infinity;
      for (let i = -4; i <= 4; i++) {
        const value = step === .125 ? (i + 4) * step : clamp(centre + i * step);
        const drive = tick(state, { ...controls, [key]: value }, params, 0).diag.drive;
        if (drive > best) { best = drive; controls[key] = value; }
      }
    }
  }
  return controls;
}

/** Warm-started, continuously retrimmed equilibrium. Stop on the measured
 * speed/heel/leeway residual, not an arbitrary short animation duration. */
export function solvePolarPoint(twa: number, tws: number, reef = 0) {
  let state = createInitialState({ twa, tws, boatSpeed: tws > 0 ? 7 : 0 });
  let controls = baseControls(reef);
  let stable = 0;
  let residual = Infinity;
  for (let seconds = 0; seconds < 900; seconds++) {
    if (seconds % 10 === 0) controls = trimForDrive(state, controls);
    const next = tick(state, controls, params, 1).state;
    residual = Math.max(Math.abs(next.boatSpeed - state.boatSpeed), Math.abs(next.heel - state.heel), Math.abs(next.leeway - state.leeway));
    state = next;
    stable = residual < .0001 ? stable + 1 : 0;
    if (stable >= 20) return { speed: state.boatSpeed, state, controls, converged: true, residual, seconds: seconds + 1 };
  }
  return { speed: state.boatSpeed, state, controls, converged: false, residual, seconds: 900 };
}
