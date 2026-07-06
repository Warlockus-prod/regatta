// ============================================================================
// sailModel - slim visual/coach helpers for the 3D boat.
//
// HISTORY: until 2026-07-06 this file was a full scripted physics stand-in
// (polar lookup, kinematic turn, algebraic heel). Sailing mode now runs the
// GOLDEN VPP engine (src/lib/sailing-physics) - see useSailingSim.ts - so the
// scripted model was deleted (recoverable from git history). What remains is
// the thin layer the 3D view still owns: UI control/wind types, the optimal
// sheet-angle heuristics used for the optimal-trim solves, and the coach key
// vocabulary the HUD labels map onto.
// ============================================================================

export const DEG = Math.PI / 180;

export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Normalize any angle to [-180, 180). */
export function norm180(a: number) {
  return ((a + 540) % 360) - 180;
}

/** Signed TWA (deg) from boat heading and the direction the wind blows FROM. */
export function signedTwa(headingDeg: number, windFromDeg: number) {
  return norm180(headingDeg - windFromDeg);
}

// ---------------------------------------------------------------------------
// Optimal sheet angles (sections 2, 3 of the physics reference): for a given
// apparent wind angle there is an optimal boom/clew angle. Used to build the
// "optimal trim" engine controls for TGT / best-VMG solves.
// ---------------------------------------------------------------------------

/** Optimal main boom angle off centerline (deg) for a given apparent wind angle. */
export function optimalBoomAngle(awaDeg: number) {
  // Boom roughly tracks AWA minus the sail's angle of attack (~15-18 deg).
  return clamp(Math.abs(awaDeg) - 16, 0, 85);
}

/** Optimal jib sheet angle (deg): the headsail trims slightly tighter than the main. */
export function optimalJibAngle(awaDeg: number) {
  return clamp(Math.abs(awaDeg) - 18, 0, 70);
}

// ---------------------------------------------------------------------------
// UI-facing types (the control panel's semantics, not the engine's).
// ---------------------------------------------------------------------------

export interface WindState {
  /** True wind speed, knots. */
  twsKn: number;
  /** Direction the true wind blows FROM, compass deg. */
  fromDeg: number;
}

export interface Controls {
  /** Helm, -1 (hard a-port) .. 1 (hard a-starboard). */
  rudder: number;
  /** Main sheet, 0 (hard in) .. 1 (fully eased). */
  mainSheet: number;
  /** Jib sheet, 0 (hard in) .. 1 (fully eased). */
  jibSheet: number;
  /** Reef, 0 .. 1. */
  reef: number;
}

/** Coach hint vocabulary; labels for each key live in SimLabels.coach. */
export type CoachKey =
  | 'inIrons'
  | 'luffEaseIn'
  | 'stallEaseOut'
  | 'pinching'
  | 'good'
  | 'reachOn'
  | 'run';
