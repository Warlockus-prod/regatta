// Speed the race HUD shows (M0-5). stepBoat moves a legacy boat by
// speed * UNITS_PER_KNOT_SECOND * dt and then clamps it at the world bounds,
// so a boat pressed against the edge keeps its full water speed while it does
// not move: the HUD said 6 kn at a standstill. This helper compares the path
// the boat actually covered over a short window with the path its speed asked
// for, and scales the shown speed by that share. In open water the two are
// equal and the HUD shows the boat speed; pinned it shows about 0; sliding
// along the wall it shows the sliding part. race-physics is not changed.

import { UNITS_PER_KNOT_SECOND, type Vec2 } from "./race-physics";

/** Window the share is taken over, seconds: long enough to smooth one
 * collision nudge, short enough that leaving the wall shows within a HUD tick or two. */
export const GROUND_SPEED_WINDOW_SEC = 0.5;

interface GroundStep { dt: number; travelled: number; expected: number }

export interface GroundSpeedWindow {
  steps: readonly GroundStep[];
}

export function createGroundSpeedWindow(): GroundSpeedWindow {
  return { steps: [] };
}

/** Add one simulation step: where the boat was, where it is after the world
 * clamp and collisions, and the speed (knots) the model moved it with. M5:
 * `unitsPerKnotSecond` is the race's scale (race-scale.ts); the metric race
 * moves a boat at real speed, the legacy race 8 units per knot second. */
export function recordGroundStep(window: GroundSpeedWindow, prevPos: Vec2, pos: Vec2, speedKn: number, dt: number,
  unitsPerKnotSecond: number = UNITS_PER_KNOT_SECOND): GroundSpeedWindow {
  if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(speedKn)) return window;
  const travelled = Math.hypot(pos.x - prevPos.x, pos.y - prevPos.y);
  if (!Number.isFinite(travelled)) return window;
  const steps = [...window.steps, { dt, travelled, expected: Math.max(0, speedKn) * unitsPerKnotSecond * dt }];
  let span = 0, first = steps.length;
  while (first > 0 && span < GROUND_SPEED_WINDOW_SEC) span += steps[--first].dt;
  return { steps: first > 0 ? steps.slice(first) : steps };
}

/** The speed to show: the boat speed times the share of its expected path it
 * really covered in the window, never more than the boat speed. */
export function displayedBoatSpeed(window: GroundSpeedWindow, speedKn: number, unitsPerKnotSecond: number = UNITS_PER_KNOT_SECOND): number {
  if (!Number.isFinite(speedKn) || speedKn <= 0) return Math.max(0, speedKn || 0);
  let travelled = 0, expected = 0;
  for (const step of window.steps) { travelled += step.travelled; expected += step.expected; }
  // Nearly stopped over the whole window: nothing to compare, trust the boat.
  if (expected < 0.05 * unitsPerKnotSecond * GROUND_SPEED_WINDOW_SEC) return speedKn;
  return speedKn * Math.min(1, travelled / expected);
}
