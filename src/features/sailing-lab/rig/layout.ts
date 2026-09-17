import { RIG_PASSPORT as P, type RigPoint } from "./passport";

export interface BoomPose { yaw: number; rise: number }
const radians = Math.PI / 180;
function finite(value: number, min: number, max: number, name: string) {
  if (!Number.isFinite(value) || value < min || value > max) throw new RangeError(`Invalid ${name}`);
}
export function validateBoomPose(pose: BoomPose) {
  finite(pose.yaw, -P.boom.maxYawDegrees, P.boom.maxYawDegrees, "boom yaw");
  finite(pose.rise, 0, P.boom.maxRiseDegrees, "boom rise");
}
export function travelerPoint(starboard: number): RigPoint {
  finite(starboard, -P.traveler.halfTravel, P.traveler.halfTravel, "traveler position");
  return { starboard, forward: P.traveler.forward, up: P.traveler.up };
}
/** Positive yaw is starboard. Rise is positive upwards. Applying pitch does
 * not tilt the mast or luff. The render adapter must pitch only the boom and
 * displace the clew; never rotate the whole MainRig about a horizontal axis.
 */
export function boomPoint(pose: BoomPose, radius: number = P.mainsheet.boomRadius, below: number = P.mainsheet.underBoom): RigPoint {
  validateBoomPose(pose);
  finite(radius, 0, P.boom.length, "boom radius");
  finite(below, -.3, .3, "boom offset");
  const yaw = pose.yaw * radians, rise = pose.rise * radians;
  const aft = radius * Math.cos(rise) - below * Math.sin(rise);
  return { starboard: P.mainPivot.starboard + aft * Math.sin(yaw),
    forward: P.mainPivot.forward - aft * Math.cos(yaw),
    up: P.mainPivot.up + radius * Math.sin(rise) + below * Math.cos(rise) };
}
export const distance = (a: RigPoint, b: RigPoint) => Math.hypot(a.starboard - b.starboard, a.forward - b.forward, a.up - b.up);

/** Six ideal parallel moving spans. Dead end and tail are both at the car.
 * Sheave-wrap lengths and the free tail are excluded: they do not change the
 * kinematic constraint. Offset sheaves make the same path readable in 2D/3D.
 * This is a proposed synthetic 6:1 tackle, not a surveyed production fitting.
 */
export function mainsheetPath(pose: BoomPose, traveler: number): RigPoint[] {
  const upper = boomPoint(pose), lower = travelerPoint(traveler);
  const path: RigPoint[] = [];
  for (let span = 0; span < P.mainsheet.parts; span++) {
    const offset = (span - (P.mainsheet.parts - 1) / 2) * P.mainsheet.sheaveSpacing;
    const bottom = { ...lower, forward: lower.forward + offset };
    const top = { ...upper, forward: upper.forward + offset };
    path.push(...(span % 2 === 0 ? [bottom, top] : [top, bottom]));
  }
  return path;
}

/** Length of variable spans only, not total rope on board. The unit direction
 * is the pull ON the boom. Components are proportions, never Newtons or kg.
 * Neither geometry nor payout is a measurement of line tension.
 */
export function mainsheetGeometry(pose: BoomPose, traveler: number) {
  const boom = boomPoint(pose), car = travelerPoint(traveler);
  const span = distance(boom, car);
  return { boom, car, span, workingLength: P.mainsheet.parts * span,
    pull: { starboard: (car.starboard - boom.starboard) / span,
      forward: (car.forward - boom.forward) / span, up: (car.up - boom.up) / span } };
}

/** Solve the taut-sheet constraint at a specified yaw. This is NOT a boom
 * equilibrium solver: wind, gravity, leech and vang still decide which of the
 * admissible poses is reached. In particular, paying out cannot push the boom.
 * On this layout span length increases monotonically with rise, verified over
 * the entire permitted yaw/traveler domain in tests.
 */
export function riseLimitAtYaw(yaw: number, traveler: number, workingLength: number):
  { feasible: false; minimumLength: number } | { feasible: true; rise: number; slackAtUpperStop: number } {
  finite(workingLength, 0, 100, "mainsheet working length");
  const minimumLength = mainsheetGeometry({ yaw, rise: 0 }, traveler).workingLength;
  if (workingLength < minimumLength - 1e-9) return { feasible: false, minimumLength };
  const upper = mainsheetGeometry({ yaw, rise: P.boom.maxRiseDegrees }, traveler).workingLength;
  if (workingLength >= upper) return { feasible: true, rise: P.boom.maxRiseDegrees, slackAtUpperStop: workingLength - upper };
  let low = 0, high: number = P.boom.maxRiseDegrees;
  for (let i = 0; i < 40; i++) {
    const middle = (low + high) / 2;
    if (mainsheetGeometry({ yaw, rise: middle }, traveler).workingLength > workingLength) high = middle;
    else low = middle;
  }
  return { feasible: true, rise: (low + high) / 2, slackAtUpperStop: 0 };
}
