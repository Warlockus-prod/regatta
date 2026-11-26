// Helm assist, the sheet solver (package 13 stage D, ADR-0022): which sheets
// the crew holds for the wind and the course the boat has. Pure, no React.
// The sheets come from the race crew's solver (sailing-physics/polar.ts
// trimForDrive: a coordinate search of the force model's forward drive at the
// boat's own apparent wind, the one the race crew and the polar tables run),
// never from a table of angles. The Trainer's auto-trim, its "Best" button,
// its course presets, "Best VMG" and the ghost of the best trim all read this
// module, so they cannot disagree with each other or with the polar that BEST
// VMG sails (helm-angles.ts).

import { trimForDrive } from "./sailing-physics/polar";
import { createInitialState, settle } from "./sailing-physics/simulate";
import type { BoatParams, BoatState, Controls, TickResult } from "./sailing-physics/types";

/** Seconds between two solves of the auto-trim: the race crew's cadence
 * (race-physics.ts raceCrewTrim). */
export const AUTO_TRIM_PERIOD_S = 0.5;

/** Seconds the boat is left to settle between two solves of `restingTrim`. */
const SETTLE_S = 45;
const MAX_PASSES = 24;
/** Where the resting solve starts its sheets, whatever the learner holds now,
 * so the answer depends on the wind, the course and the sails only (the same
 * start as sailing-physics/polar.ts solvePolarPoint). */
const START_SHEETS = { mainSheet: 0.4, jibSheet: 0.2 } as const;

/** Twist set with the sheets: more in a breeze to spill the top of the sails.
 * The solver searches the sheets only, as the race crew does, so the twist
 * is this wind table (the Trainer's former heuristic: main 10 / 20 / 34%, jib
 * 8 / 16 / 26% at 8 kn or less, in between, 18 kn or more). */
export function trimTwist(tws: number): { mainTwist: number; jibTwist: number } {
  if (tws >= 18) return { mainTwist: 0.34, jibTwist: 0.26 };
  if (tws <= 8) return { mainTwist: 0.1, jibTwist: 0.08 };
  return { mainTwist: 0.2, jibTwist: 0.16 };
}

/** One solve of the crew on the boat as it is now: the sheets that drive it
 * hardest at its current apparent wind and heel, twist from the wind table,
 * every other control (reef, furl, hoist, jib side) kept. The auto-trim runs
 * this every AUTO_TRIM_PERIOD_S on the live boat. `tws` is the set wind, not
 * a gust, so the twist does not jump with every puff. */
export function crewTrim(state: BoatState, controls: Controls, params: BoatParams, tws: number): Controls {
  return trimForDrive(state, { ...controls, ...trimTwist(tws) }, params);
}

export interface RestingTrim {
  /** The sheets (and the twist) the auto-trim comes to rest on. */
  readonly controls: Controls;
  /** The settled boat on them: the reference speed of a 100% trim. */
  readonly result: TickResult;
  readonly passes: number;
}

const sameSheets = (a: Controls, b: Controls) =>
  Math.abs(a.mainSheet - b.mainSheet) < 1e-9 && Math.abs(a.jibSheet - b.jibSheet) < 1e-9;

/**
 * The auto-trim run to rest on a course: settle the boat, solve the crew,
 * repeat until the sheets stop moving. The Trainer's "Best" button and the
 * course presets apply it, and its speed is what a 100% trim makes. `twa` is
 * the true wind angle (either sign), `controls` give the sails (reef, furl,
 * hoist); their sheets and twist are replaced.
 */
export function restingTrim(twa: number, tws: number, controls: Controls, params: BoatParams): RestingTrim {
  let sheets: Controls = { ...controls, ...START_SHEETS, ...trimTwist(tws) };
  const start = createInitialState({ tws, twa, boatSpeed: Math.max(3, tws * 0.45) });
  let result = settle(start, sheets, params, SETTLE_S, 0.1);
  let passes = 0;
  while (passes < MAX_PASSES) {
    passes++;
    const next = crewTrim(result.state, sheets, params, tws);
    const speed = result.state.boatSpeed;
    result = settle(result.state, next, params, SETTLE_S, 0.1);
    const settled = sameSheets(next, sheets) && Math.abs(result.state.boatSpeed - speed) < 0.001;
    sheets = next;
    if (settled) break;
  }
  return { controls: sheets, result, passes };
}
