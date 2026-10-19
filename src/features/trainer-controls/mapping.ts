// Pure mappings from a wheel turn to the inputs the trainers already have.
// Nothing here touches the physics: the helm wheel feeds a course target
// (Basics, Trainer) or the session's rudder -1..1 (3D boat), the sheet wheels
// feed the same 0..1 ease the sliders use. Numbers are the owner-approved
// concept (docs/design/trainer-controls-concept.md, section 4).

/** Wheel degrees per one degree of course change: one full turn = 90 degrees of course. */
export const WHEEL_DEG_PER_COURSE_DEG = 4;
/** One full turn either way puts the rudder at its stop (rudder -1..1). */
export const RUDDER_WHEEL_LOCK_DEG = 360;
/** Wheel play around center that leaves the rudder at zero. */
export const RUDDER_DEAD_ZONE_DEG = 10;
/** One turn of a sheet wheel moves the sheet a quarter of its travel, like a winch. */
export const SHEET_TRAVEL_PER_TURN = 0.25;
/** Click every 5 degrees of course or rudder, every 5% of sheet travel. */
export const COURSE_TICK_DEG = 5;
export const RUDDER_TICK_DEG = 5;
export const SHEET_TICK = 0.05;
/** Displayed rudder angle at rudder = 1 (matches the 3D boat readout). */
export const RUDDER_DISPLAY_MAX_DEG = 35;

export type Sensitivity = 0.5 | 1 | 2;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Shortest signed difference between two pointer angles, in (-180, 180]. */
export function angleDelta(fromDeg: number, toDeg: number): number {
  let d = (toDeg - fromDeg) % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

/** Course change for a wheel turn. Clockwise (positive) turns the bow to starboard. */
export function wheelToCourseDelta(wheelDeg: number, sensitivity: Sensitivity = 1): number {
  return (wheelDeg / WHEEL_DEG_PER_COURSE_DEG) * sensitivity;
}

/** Rudder -1..1 for a wheel angle (clockwise positive = rudder to starboard). */
export function wheelAngleToRudder(wheelDeg: number): number {
  const a = clamp(wheelDeg, -RUDDER_WHEEL_LOCK_DEG, RUDDER_WHEEL_LOCK_DEG);
  const live = Math.max(0, Math.abs(a) - RUDDER_DEAD_ZONE_DEG);
  return (Math.sign(a) * live) / (RUDDER_WHEEL_LOCK_DEG - RUDDER_DEAD_ZONE_DEG);
}

/** Inverse of wheelAngleToRudder, used to draw the wheel for a rudder set elsewhere. */
export function rudderToWheelAngle(rudder: number): number {
  const r = clamp(rudder, -1, 1);
  if (r === 0) return 0;
  return Math.sign(r) * (RUDDER_DEAD_ZONE_DEG + Math.abs(r) * (RUDDER_WHEEL_LOCK_DEG - RUDDER_DEAD_ZONE_DEG));
}

/** Sheet ease change for a wheel turn: clockwise sheets in (ease goes down), like a winch. */
export function wheelToEaseDelta(wheelDeg: number, sensitivity: Sensitivity = 1): number {
  return -(wheelDeg / 360) * SHEET_TRAVEL_PER_TURN * sensitivity;
}

/** How many tick boundaries a value crossed between two readings (0 when it stayed inside one step). */
export function ticksCrossed(prev: number, next: number, step: number): number {
  return Math.abs(Math.floor(next / step + 1e-9) - Math.floor(prev / step + 1e-9));
}

/**
 * Signed course to the wind for the Trainer: positive = starboard tack.
 * The Trainer stores |TWA| 0..180 plus a tack; a wheel turn moves the bow,
 * and passing head to wind or dead downwind changes the tack (a tack or a gybe).
 */
export function applyCourseDelta(
  twa: number,
  tack: "port" | "starboard",
  courseDelta: number,
): { twa: number; tack: "port" | "starboard"; crossed: "tack" | "gybe" | null } {
  const signed = tack === "starboard" ? twa : -twa;
  // Bow to starboard (positive delta) brings a starboard-tack boat closer to the wind.
  let next = signed - courseDelta;
  let crossed: "tack" | "gybe" | null = null;
  if (Math.sign(next) !== Math.sign(signed) && signed !== 0 && Math.abs(next) < 90) crossed = "tack";
  if (next > 180) { next -= 360; crossed = "gybe"; }
  if (next <= -180) { next += 360; crossed = "gybe"; }
  const nextTack = next > 0 || (next === 0 && tack === "starboard") ? "starboard" : "port";
  return { twa: Math.abs(next), tack: nextTack, crossed };
}

/** Heading 0..360 after a course change, for surfaces that steer by compass heading (Basics). */
export function applyHeadingDelta(heading: number, courseDelta: number): number {
  return ((heading + courseDelta) % 360 + 360) % 360;
}
