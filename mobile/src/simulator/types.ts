/**
 * Simulator types for the mobile preview.
 *
 * The legacy stub fields (`heading`, `speed`, `x`, `y`, `targetHeading`,
 * `throttle`, `maxSpeed`, `turnRate`, `drag`) stay in place so the existing
 * stub `tick()` and its jest suite keep working unchanged. Sprint 3 layers
 * the real VPP physics on top of them via the new `physics/*` modules; the
 * extra fields below carry the new state the screen consumes.
 *
 * Convention notes (RN / Skia, screen-space):
 * - `heading` is in radians, 0 = north (canvas -Y), increases clockwise.
 *   The physics engine uses degrees compass-bearing internally; the
 *   `use-sim-loop` hook is the single boundary that converts.
 * - `speed` here remains canvas-pixels-per-second (legacy stub uses it).
 *   Real-knots speed lives on `boatSpeedKn` of `BoatStateExt`.
 */

export interface BoatState {
  /** Heading in radians. 0 = north (up), increases clockwise. */
  heading: number;
  /** Forward speed, canvas-pixels-per-second. */
  speed: number;
  /** Position in canvas-pixel space. */
  x: number;
  y: number;
}

export interface Controls {
  /** Target heading in radians. The boat turns toward it at `turnRate`. */
  targetHeading: number;
  /** Throttle, 0..1. Multiplies `maxSpeed` to get the speed setpoint. */
  throttle: number;
}

export interface SimParams {
  /** Top forward speed, canvas-pixels-per-second. */
  maxSpeed: number;
  /** Maximum heading change per second, radians. */
  turnRate: number;
  /** Acceleration toward the speed setpoint, exponential time constant 1/s. */
  drag: number;
}

/**
 * Wind state exposed by the simulator hook. The user can rotate
 * `trueWindDirRad` via the wind compass and cycle `trueWindSpeedKts`
 * through preset values.
 */
export interface WindState {
  /** True wind FROM-direction, radians. 0 = wind from north. CW positive. */
  trueWindDirRad: number;
  /** True wind speed, knots. */
  trueWindSpeedKts: number;
}

/**
 * Extended boat state surfaced alongside the legacy `BoatState`. Driven by
 * the ported VPP engine; consumed by the HUD and the apparent-wind arrow.
 */
export interface BoatStateExt {
  /** Real boat speed through water, knots (signed positive). */
  boatSpeedKn: number;
  /** Heel angle, degrees. Positive = leeward. */
  heelDeg: number;
  /** Leeway angle, degrees. */
  leewayDeg: number;
  /** True wind angle from bow, degrees, signed (matches engine). */
  twaDeg: number;
  /** Apparent wind angle from bow, degrees, signed. */
  awaDeg: number;
  /** Apparent wind speed, knots. */
  awsKn: number;
  /** Velocity made good upwind, knots. */
  vmgKn: number;
  /** Currently selected sail set, for UI hints / future trim panels. */
  sailSet: SailSet;
}

/** High-level sail picker. The hook auto-selects this from TWA. */
export type SailSet = 'mainOnly' | 'mainJib' | 'spinnaker';
