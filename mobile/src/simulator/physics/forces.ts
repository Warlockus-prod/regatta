// ============================================================================
// Sail forces: given a sail configuration and apparent wind in boat frame,
// compute lift + drag and express them as (drive, side) force components in
// the boat's (x=starboard, y=forward) frame.
//
// Ported verbatim from web src/lib/sailing-physics/forces.ts.
// ============================================================================

import { DEG_TO_RAD, RAD_TO_DEG, type WindVec } from './wind';
import { sailCl, sailCd, stallOnsetWithTwist, peakClWithTwist, isStalled } from './aero';

const RHO_AIR = 1.225;

export interface SailConfig {
  /** Sail area, m^2 (after reef / furl reduction if applicable). */
  area: number;
  /** Sail angle off centerline, degrees, absolute value. */
  angleOff: number;
  /** Side the sail is set on. */
  side: 1 | -1;
  /** Twist in [0, 1]. */
  twist: number;
}

export interface SailForce {
  drive: number;
  side: number;
  aoa: number;
  stalled: boolean;
}

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

  const flowX = aw.x / awsMps;
  const flowY = aw.y / awsMps;

  let cosAngle = chordX * flowX + chordY * flowY;
  if (cosAngle > 1) cosAngle = 1;
  if (cosAngle < -1) cosAngle = -1;
  const aoa = Math.acos(cosAngle) * RAD_TO_DEG;

  let leewardX: number;
  let leewardY: number;
  if (cfg.side < 0) {
    leewardX = chordY;
    leewardY = -chordX;
  } else {
    leewardX = -chordY;
    leewardY = chordX;
  }

  const flowDotLeeward = flowX * leewardX + flowY * leewardY;
  const backed = flowDotLeeward < 0;

  const stallOnset = stallOnsetWithTwist(20, cfg.twist);
  const peakCl = peakClWithTwist(1.5, cfg.twist);

  const clRaw = sailCl(aoa, peakCl) * clMultiplier;
  const cl = backed ? -clRaw * 0.5 : clRaw;
  const cd = sailCd(aoa);
  const stalled = isStalled(aoa, stallOnset);

  const q = 0.5 * RHO_AIR * awsMps * awsMps;

  const liftMag = q * cfg.area * cl;
  const dragMag = q * cfg.area * cd;

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

  const fx = liftMag * liftHatX + dragMag * flowX;
  const fy = liftMag * liftHatY + dragMag * flowY;

  return {
    drive: fy,
    side: fx,
    aoa,
    stalled,
  };
}

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
  if (jibSide !== mainSide) return { mult: 1.0, health: 0 };
  if (jibStalled) return { mult: 0.92, health: 0.2 };
  const a = Math.abs(jibAoA);
  if (a < 3) return { mult: 0.95, health: 0.3 };
  if (a < 20) {
    const peakness = 1 - Math.abs(a - 12) / 12;
    const mult = 1.0 + 0.15 * peakness;
    return { mult, health: 0.5 + 0.5 * peakness };
  }
  return { mult: 0.95, health: 0.2 };
}
