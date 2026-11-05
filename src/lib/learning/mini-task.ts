// In-lesson mini task: pure rules shared by the site and the app. No React and no
// platform code. A target counts only when the boat has stayed on it for
// MINI_TASK_HOLD_MS, so sweeping the handle past every mark awards nothing, and
// targets count in order. Opening the step never counts.

import type { Label } from "../product/catalog";
import { NO_GO_HALF_DEG } from "../sailing-physics/constants";

export const MINI_TASK_HOLD_MS = 600;

export interface MiniTaskTarget { angle: number; tolerance: number; prompt: Label }
export interface MiniTask { min: number; max: number; start: number; targets: MiniTaskTarget[]; done: Label }

/** Heading as a signed angle off the wind, in (-180, 180]. */
export function signedWindAngle(angle: number): number {
  const wrapped = ((angle % 360) + 360) % 360;
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

/** What the learner reads: 0 to 180, whichever side the wind is on. */
export const shownWindAngle = (angle: number) => Math.abs(signedWindAngle(angle));

export const inNoGoZone = (angle: number) => shownWindAngle(angle) < NO_GO_HALF_DEG;

export function onTarget(task: MiniTask, step: number, angle: number): boolean {
  const target = task.targets[step];
  if (!target) return false;
  // A sailing mark at the edge of the no-go zone is never met from inside the zone.
  if (!inNoGoZone(target.angle) && inNoGoZone(angle)) return false;
  return Math.abs(angle - target.angle) <= target.tolerance;
}

export const isTaskFinished = (task: MiniTask, step: number) => step >= task.targets.length;

// Sheet out as the bow leaves the wind (the same values as the points of sail
// drawing: 22, 48 and 75 degrees at 45, 90 and 135). Inside the no-go zone the
// sail flaps on the centreline.
const BOOM_BY_ANGLE: readonly (readonly [number, number])[] = [[NO_GO_HALF_DEG, 20], [45, 22], [90, 48], [135, 75], [180, 85]];

/** Boom angle off the aft centreline: positive to starboard, always to leeward. */
export function boomForAngle(angle: number): number {
  const signed = signedWindAngle(angle);
  const shown = Math.abs(signed);
  if (shown < NO_GO_HALF_DEG) return 0;
  const side = signed > 0 ? 1 : -1;
  for (let i = 1; i < BOOM_BY_ANGLE.length; i++) {
    const [a0, b0] = BOOM_BY_ANGLE[i - 1];
    const [a1, b1] = BOOM_BY_ANGLE[i];
    if (shown <= a1) return side * (b0 + ((b1 - b0) * (shown - a0)) / (a1 - a0));
  }
  return side * 85;
}
