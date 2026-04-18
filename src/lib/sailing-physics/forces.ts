import { DEG_TO_RAD, RAD_TO_DEG, type WindVec } from './wind';
import { sailCl, sailCd, stallOnsetWithTwist, peakClWithTwist, isStalled } from './aero';

// ============================================================================
// Sail forces: given a sail configuration and apparent wind in boat frame,
// compute lift + drag and express them as (drive, side) force components in
// the boat's (x=starboard, y=forward) frame.
// ============================================================================

const RHO_AIR = 1.225; // kg/m^3 at sea level standard conditions

export interface SailConfig {
  /** Sail area, m^2 (after reef / furl reduction if applicable). */
  area: number;
  /** Sail angle off centerline, degrees, absolute value. */
  angleOff: number;
  /** Side the sail is set on. +1 = port (normal for starboard tack),
   *  -1 = starboard (normal for port tack). On wing-on-wing, jib is opposite. */
  side: 1 | -1;
  /** Twist in [0, 1]. */
  twist: number;
}

export interface SailForce {
  /** Forward component (drive), N. */
  drive: number;
  /** Side component (starboard positive), N. */
  side: number;
  /** Angle of attack in degrees. */
  aoa: number;
  /** Stall flag. */
  stalled: boolean;
}

/** Compute sail force on the boat from one sail.
 *
 *  Geometry: on starboard tack (wind from starboard, TWA>0), sails sit on port
 *  (side = +1 in our convention... actually let me align: positive y = forward,
 *  positive x = starboard; sails on port tack = negative x hemisphere so
 *  sailSide = -1 for port-of-boat). We'll encode:
 *     sailSide = -1 means sail hangs to port (leeward on starboard tack).
 *     sailSide = +1 means sail hangs to starboard (leeward on port tack, or
 *                     wing-on-wing jib on starboard tack).
 *
 *  Chord vector (from luff/mast at origin toward leech/clew):
 *    chord.x = sailSide * sin(angleOff)
 *    chord.y = -cos(angleOff)    (always aft)
 */
export function computeSailForce(
  aw: WindVec,
  awsMps: number,
  cfg: SailConfig,
  clMultiplier = 1.0,
): SailForce {
  if (awsMps < 1e-4 || cfg.area < 1e-4) {
    return { drive: 0, side: 0, aoa: 0, stalled: false };
  }

  const angleRad = cfg.angleOff * DEG_TO_RAD;
  const chordX = cfg.side * Math.sin(angleRad);
  const chordY = -Math.cos(angleRad);

  // Flow direction (unit vector, direction wind flows toward)
  const flowX = aw.x / awsMps;
  const flowY = aw.y / awsMps;

  // Angle between chord direction and flow direction, in [0, 180] deg.
  // This is the angle of attack for our simple 2D sail model.
  let cosAngle = chordX * flowX + chordY * flowY;
  if (cosAngle > 1) cosAngle = 1;
  if (cosAngle < -1) cosAngle = -1;
  const aoa = Math.acos(cosAngle) * RAD_TO_DEG;

  // If the sail is backed (wind pushes on wrong side), Cl direction flips.
  // In our flat-plate model we detect this via: the "leeward-facing" normal
  // should be on the opposite side from flow. If flow is on the leeward side
  // of the sail (wrong side), sail is backed.
  //
  // Leeward normal (from chord, pointing to leeward side of sail, i.e. away
  // from the wind):
  //   - Sail on port (sailSide = -1): leeward = port (-x direction).
  //     Rotate chord 90 deg CW gives leeward normal.
  //   - Sail on starboard (sailSide = +1): leeward = starboard (+x direction).
  //     Rotate chord 90 deg CCW gives leeward normal.
  // Rotation 90 CW:  (x, y) -> (y, -x).
  // Rotation 90 CCW: (x, y) -> (-y, x).
  // Sanity: at alpha=0, chord=(0,-1). Sail-on-port expects leewardN=(-1,0).
  //         CW: (y, -x) = (-1, 0). Correct.
  let leewardX: number;
  let leewardY: number;
  if (cfg.side < 0) {
    // Sail on port; rotate 90 CW
    leewardX = chordY;
    leewardY = -chordX;
  } else {
    // Sail on starboard; rotate 90 CCW
    leewardX = -chordY;
    leewardY = chordX;
  }

  // Flow should hit windward side (opposite of leeward normal).
  // Windward hit means flow vector points roughly into the leeward side of
  // sail (i.e., flow aligns with leeward normal).
  // dot(flow, leewardNormal) > 0 means flow is going to the leeward side =
  // normal case, sail is making lift toward leeward.
  // dot < 0 means flow is hitting the leeward side and pushing it windward =
  // backed sail.
  const flowDotLeeward = flowX * leewardX + flowY * leewardY;
  const backed = flowDotLeeward < 0;

  // Twist-adjusted stall and peak
  const stallOnset = stallOnsetWithTwist(20, cfg.twist);
  const peakCl = peakClWithTwist(1.5, cfg.twist);

  // Compute Cl, Cd. If backed, Cl is negative (pushes sail windward instead).
  const clRaw = sailCl(aoa, peakCl) * clMultiplier;
  const cl = backed ? -clRaw * 0.5 : clRaw;
  const cd = sailCd(aoa);
  const stalled = isStalled(aoa, stallOnset);

  // Dynamic pressure
  const q = 0.5 * RHO_AIR * awsMps * awsMps;

  // Lift magnitude, direction = perpendicular to flow, toward leeward (suction
  // side). Drag magnitude, direction = along flow direction.
  const liftMag = q * cfg.area * cl;
  const dragMag = q * cfg.area * cd;

  // Lift unit vector = leeward normal rotated from flow, which we've already
  // computed conceptually. Precisely: lift is perpendicular to flow in the
  // plane, toward the leeward side. We rotate flow vector 90 toward the same
  // side as leewardNormal.
  //
  // Equivalent: lift_hat = perpendicular(flow) chosen so dot(lift_hat,
  // leewardNormal) > 0.
  //
  // Rotating flow 90 CW: (flowY, -flowX). Rotating 90 CCW: (-flowY, flowX).
  const liftCwX = flowY;
  const liftCwY = -flowX;
  const dotCw = liftCwX * leewardX + liftCwY * leewardY;
  let liftHatX: number;
  let liftHatY: number;
  if (dotCw >= 0) {
    liftHatX = liftCwX;
    liftHatY = liftCwY;
  } else {
    liftHatX = -flowY;
    liftHatY = flowX;
  }

  // Total sail force components in boat frame
  const fx = liftMag * liftHatX + dragMag * flowX;
  const fy = liftMag * liftHatY + dragMag * flowY;

  return {
    drive: fy,
    side: fx,
    aoa,
    stalled,
  };
}

/** Compute slot-effect multiplier on the main Cl from the jib state.
 *
 *  Real effect: a well-set jib accelerates flow over the main's leeward side,
 *  delays its stall, and boosts its lift a little. A backed, furled, or
 *  stalled jib does none of this. Keep it soft and bounded.
 *
 *  Returns a multiplier in [0.9, 1.15]:
 *  - 1.15 when jib is at healthy AoA (5-20 deg) and set on same side as main
 *  - 1.0 when jib is absent / furled / on opposite side (wing-on-wing)
 *  - 0.9 when jib is severely over-sheeted (backed or flapping back onto main)
 */
export function slotMultiplier(args: {
  jibAoA: number;
  jibStalled: boolean;
  jibFurl01: number;
  jibAreaEffective: number;
  jibSide: 1 | -1;
  mainSide: 1 | -1;
}): { mult: number; health: number } {
  const { jibAoA, jibStalled, jibFurl01, jibAreaEffective, jibSide, mainSide } = args;

  if (jibAreaEffective < 1 || jibFurl01 > 0.8) return { mult: 1.0, health: 0.3 };
  if (jibSide !== mainSide) return { mult: 1.0, health: 0 }; // wing-on-wing: no slot
  if (jibStalled) return { mult: 0.92, health: 0.2 };
  const a = Math.abs(jibAoA);
  if (a < 3) return { mult: 0.95, health: 0.3 }; // luffing jib doesn't help
  if (a < 20) {
    // Healthy window. Peak slot effect at ~12 deg, softer at the edges.
    const peakness = 1 - Math.abs(a - 12) / 12; // 0..1 peaking at 12 deg
    const mult = 1.0 + 0.15 * peakness;
    return { mult, health: 0.5 + 0.5 * peakness };
  }
  return { mult: 0.95, health: 0.2 };
}
