// ============================================================================
// sailModel - pure sailing physics for the V2 3D simulator.
//
// No React, no three.js: just numbers. Implements the approximate model from
// docs/design/SAILING_PHYSICS_REFERENCE.md (sections 2, 4, 5, 6) so the boat
// sails believably and teaches trim. Self-contained so the whole module can be
// lifted out and reused elsewhere.
//
// Conventions:
//  - Angles in degrees unless a name ends in Rad.
//  - heading: compass-like, 0..360, 0 = +Z world, increasing clockwise.
//  - windDir: the compass direction the TRUE wind blows FROM.
//  - twa (true wind angle): 0 = dead upwind (head to wind), 180 = dead downwind.
//    Signed: positive = wind on the starboard bow (starboard tack), negative = port.
// ============================================================================

export const KN_TO_MS = 0.514444;
const DEG = Math.PI / 180;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export interface BoatConfig {
  /** Waterline length, m (sets hull speed). */
  lwl: number;
  /** Total upwind sail area, m2 (main + jib). */
  sailArea: number;
  /** Centre of effort height above waterline, m. */
  ceHeight: number;
  /** Righting moment at 30 deg, N*m (displacement * GM * 0.5). */
  rm30: number;
  /** Heel calibration constant (tuned so 16 kn close-hauled ~ 19 deg). */
  heelK: number;
  /** No-go half-angle off the true wind, deg (sails luff inside this). */
  noGoDeg: number;
  /** Hull speed, kn = 2.43 * sqrt(LWL_m). */
  hullSpeedKn: number;
  /** Max rudder-driven turn rate, deg/s, at good boat speed. */
  turnRateMaxDegS: number;
}

/** Our ~13.9 m cruising sloop (from the science reference, section 11). */
export const DEFAULT_BOAT: BoatConfig = {
  lwl: 12.5,
  sailArea: 92,
  ceHeight: 8,
  rm30: 72000,
  // Calibrated with APPARENT wind (not true): gives ~19 deg heel at 16 kn
  // close-hauled and ~31 deg at 22 kn, matching the reference targets.
  heelK: 0.62,
  noGoDeg: 42,
  hullSpeedKn: 2.43 * Math.sqrt(12.5), // ~8.6 kn
  turnRateMaxDegS: 22,
};

// ---------------------------------------------------------------------------
// Apparent wind (section 2): the wind the sails actually feel.
// V_A = sqrt(W^2 + V^2 + 2 W V cos(twa)); beta = arccos((W cos twa + V)/V_A).
// ---------------------------------------------------------------------------
export function apparentWind(twsKn: number, twaDeg: number, boatKn: number) {
  const a = Math.abs(twaDeg) * DEG;
  const aws = Math.sqrt(twsKn * twsKn + boatKn * boatKn + 2 * twsKn * boatKn * Math.cos(a));
  const awa = aws < 1e-6 ? 0 : Math.acos(clamp((twsKn * Math.cos(a) + boatKn) / aws, -1, 1)) / DEG;
  return { awsKn: aws, awaDeg: awa };
}

// ---------------------------------------------------------------------------
// Speed polar (sections 2, 6): believable boat speed vs TWA, wind, trim, reef.
// 0 inside the no-go zone, rising to full by ~70 deg, holding to ~150, tapering
// toward a dead run; capped at hull speed.
// ---------------------------------------------------------------------------
export function angleEfficiency(cfg: BoatConfig, twaAbs: number) {
  if (twaAbs < cfg.noGoDeg) return 0;
  // A real beat (42-50 deg) must make useful speed, not ~11 percent of hull
  // speed: ramp from 0.35 just outside the no-go up to ~0.9 by ~8 deg past it.
  if (twaAbs < cfg.noGoDeg + 8) return clamp(0.35 + 0.55 * (twaAbs - cfg.noGoDeg) / 8, 0, 0.9);
  if (twaAbs <= 150) return 1;
  return clamp(1 - 0.45 * (twaAbs - 150) / 30, 0, 1);
}

export function targetSpeedKn(
  cfg: BoatConfig,
  twsKn: number,
  twaAbs: number,
  trimQuality: number,
  reef: number,
) {
  const angle = angleEfficiency(cfg, twaAbs);
  const windEff = clamp(twsKn / 14, 0.15, 1.25); // more breeze, more speed (until the cap)
  const reefPenalty = 1 - 0.35 * reef;
  const sp = cfg.hullSpeedKn * angle * windEff * (0.55 + 0.45 * trimQuality) * reefPenalty;
  return Math.min(sp, cfg.hullSpeedKn * 1.02);
}

// ---------------------------------------------------------------------------
// VMG (velocity made good): the component of boat speed straight up- or down-
// wind. vmgTarget brute-forces the |TWA| that maximizes it on this boat's own
// polar, at optimal trim. mode -1 = upwind (scan no-go..90), +1 = downwind
// (scan 90..180). Feeds the wind-dial target arc and future laylines.
// ---------------------------------------------------------------------------
export function vmgTarget(cfg: BoatConfig, twsKn: number, mode: -1 | 1): number {
  const lo = mode < 0 ? cfg.noGoDeg : 90;
  const hi = mode < 0 ? 90 : 180;
  let best = lo;
  let bestV = -Infinity;
  for (let a = lo; a <= hi; a += 1) {
    const v = targetSpeedKn(cfg, twsKn, a, 1, 0) * Math.abs(Math.cos((a * Math.PI) / 180));
    if (v > bestV) {
      bestV = v;
      best = a;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Heel (section 5): phi = atan(k * pointFactor * trimFactor * A * h * V_A^2 / (2 RM30)).
// pointFactor ~ how much of the force heels rather than drives (high upwind).
// ---------------------------------------------------------------------------
export function pointFactor(twaAbs: number) {
  // 1.0 close-hauled/beam, ~0.4 broad reach, ~0.12 run.
  if (twaAbs <= 90) return 1.0;
  if (twaAbs <= 150) return lerp(1.0, 0.4, (twaAbs - 90) / 60);
  return lerp(0.4, 0.12, (twaAbs - 150) / 30);
}

export function heelAngleDeg(
  cfg: BoatConfig,
  awsKn: number,
  twaAbs: number,
  trimQuality: number,
  reef: number,
) {
  const A = cfg.sailArea * (1 - 0.5 * reef);
  const h = cfg.ceHeight * (1 - 0.2 * reef);
  const VA = awsKn * KN_TO_MS;
  const H =
    (cfg.heelK * pointFactor(twaAbs) * (0.5 + 0.5 * trimQuality) * A * h * VA * VA) /
    (2 * cfg.rm30);
  return clamp(Math.atan(H) / DEG, 0, 38);
}

// ---------------------------------------------------------------------------
// Trim model (sections 2, 3): for a given apparent wind angle there is an
// optimal sheet (boom angle). The user's sheet is scored against it. Sheeting
// too far in upwind stalls; easing too far makes the sail luff.
// ---------------------------------------------------------------------------

/** Optimal main boom angle off centerline (deg) for a given apparent wind angle. */
export function optimalBoomAngle(awaDeg: number) {
  // Boom roughly tracks AWA minus the sail's angle of attack (~15-18 deg).
  return clamp(Math.abs(awaDeg) - 16, 0, 85);
}

/**
 * Trim quality 0..1 from how close the actual boom angle is to optimal, and a
 * flag for the failure mode. luffing when eased well past optimal (or in no-go);
 * stalling when sheeted well inside optimal.
 */
export function evaluateTrim(awaDeg: number, boomAngle: number, twaAbs: number, noGoDeg: number) {
  const opt = optimalBoomAngle(awaDeg);
  const err = boomAngle - opt; // + = eased too much, - = over-sheeted
  const inNoGo = twaAbs < noGoDeg;
  const luffing = inNoGo || err > 14;
  const stalled = !inNoGo && err < -14;
  // quality peaks at err=0, falls off over ~25 deg either side.
  const quality = inNoGo ? 0 : clamp(1 - Math.abs(err) / 25, 0, 1);
  return { quality, luffing, stalled, optimalBoomAngle: opt, error: err };
}

// ---------------------------------------------------------------------------
// Leeway (section 7): the boat slips sideways; keel lift balances sail side
// force. Larger at low speed and when pinching, near 0 reaching/running.
// ---------------------------------------------------------------------------
export function leewayDeg(twaAbs: number, boatKn: number) {
  const upwind = clamp((90 - twaAbs) / 50, 0, 1); // 1 close-hauled, 0 at/after beam
  const slow = clamp(2.5 / Math.max(boatKn, 0.5), 0, 2); // more slip when slow
  return clamp(upwind * (1.5 + slow), 0, 7);
}

// ---------------------------------------------------------------------------
// Coaching feedback (section 11.b telltale logic).
// ---------------------------------------------------------------------------
export type CoachKey =
  | 'inIrons'
  | 'luffEaseIn'
  | 'stallEaseOut'
  | 'pinching'
  | 'good'
  | 'reachOn'
  | 'run';

export function coachHint(
  twaAbs: number,
  trim: ReturnType<typeof evaluateTrim>,
  noGoDeg: number,
): CoachKey {
  if (twaAbs < noGoDeg) return 'inIrons';
  if (trim.luffing) return 'luffEaseIn';
  if (trim.stalled) return 'stallEaseOut';
  if (twaAbs < noGoDeg + 8) return 'pinching';
  if (twaAbs > 150) return 'run';
  if (trim.quality > 0.85) return 'good';
  return 'reachOn';
}

// ---------------------------------------------------------------------------
// Geometry helpers for heading / wind angle.
// ---------------------------------------------------------------------------

/** Signed true wind angle (deg) given boat heading and the dir the wind blows FROM. */
export function signedTwa(headingDeg: number, windFromDeg: number) {
  // Wind-from direction relative to the bow, folded to -180..180.
  // 0 = wind dead ahead (head to wind); + = wind on the starboard bow.
  let rel = (((windFromDeg - headingDeg) % 360) + 360) % 360;
  if (rel > 180) rel -= 360;
  return rel;
}

export interface BoatState {
  /** World position, meters (x East-ish, z North-ish). */
  x: number;
  z: number;
  /** Compass heading, 0..360. */
  heading: number;
  /** Speed over water, knots. */
  speedKn: number;
  /** Heel, deg (>0 = heeled to leeward). */
  heel: number;
}

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

export interface StepResult {
  boat: BoatState;
  twaSigned: number;
  awaDeg: number;
  awsKn: number;
  boomAngle: number;
  jibAngle: number;
  trimQuality: number;
  luffing: boolean;
  leeway: number;
  coach: CoachKey;
}

/**
 * Advance the boat one timestep. Pure: returns the next state and telemetry.
 * The 3D view maps boomAngle/jibAngle/heel/luffing onto the rig + morphs.
 */
export function stepBoat(
  cfg: BoatConfig,
  boat: BoatState,
  wind: WindState,
  controls: Controls,
  dt: number,
): StepResult {
  const twaSigned = signedTwa(boat.heading, wind.fromDeg);
  const twaAbs = Math.abs(twaSigned);
  const side = twaSigned >= 0 ? -1 : 1; // sails set to leeward

  const { awsKn, awaDeg } = apparentWind(wind.twsKn, twaAbs, boat.speedKn);

  // Visual boom angle from the main sheet (0 in .. 85 out).
  const boomAngle = controls.mainSheet * 85;
  const jibAngle = controls.jibSheet * 70;

  const trim = evaluateTrim(awaDeg, boomAngle, twaAbs, cfg.noGoDeg);

  // Speed: ease toward the polar target (time constant ~ a few seconds).
  const targetSpeed = targetSpeedKn(cfg, wind.twsKn, twaAbs, trim.quality, controls.reef);
  const speedKn = lerp(boat.speedKn, targetSpeed, clamp(dt / 2.5, 0, 1));

  // Heading: rudder authority scales with speed, with a small floor so a boat
  // stalled head-to-wind can still slowly fall off (back the helm to escape
  // irons) instead of freezing forever.
  const speedAuth = Math.max(0.12, clamp(speedKn / 3, 0, 1));
  const turnRate = controls.rudder * cfg.turnRateMaxDegS * speedAuth;
  const heading = (boat.heading + turnRate * dt + 360) % 360;

  // Heel: target from the model, eased with a ~2 s lag.
  const targetHeel = heelAngleDeg(cfg, awsKn, twaAbs, trim.quality, controls.reef);
  const heel = lerp(boat.heel, targetHeel, clamp(dt / 2, 0, 1));

  // Leeway: course over water slips to leeward (side = -1 on starboard tack,
  // where leeward is to port, so the course rotates the correct way).
  const leeway = leewayDeg(twaAbs, speedKn);
  const courseDeg = heading + side * leeway;

  // Integrate position (knots -> m/s).
  const v = speedKn * KN_TO_MS;
  const cr = courseDeg * DEG;
  const x = boat.x + Math.sin(cr) * v * dt;
  const z = boat.z + Math.cos(cr) * v * dt;

  return {
    boat: { x, z, heading, speedKn, heel },
    twaSigned,
    awaDeg,
    awsKn,
    boomAngle, // magnitude; the lee side is applied in the view from twaSigned
    jibAngle,
    trimQuality: trim.quality,
    luffing: trim.luffing,
    leeway,
    coach: coachHint(twaAbs, trim, cfg.noGoDeg),
  };
}
