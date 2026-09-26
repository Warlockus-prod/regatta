import { DEG_TO_RAD, RAD_TO_DEG, KN_TO_MPS } from './wind';
import type { BoatParams } from './types';

// ============================================================================
// Heel and leeway from the sail force balance.
//
// Heel:
//   Heeling moment (from sail side force) acts at an effective height above
//   the waterline. Righting moment (from boat's GM) acts to restore.
//   Equilibrium:  F_side * h_eff * cos(heel) = disp * g * GM * sin(heel)
//   -> tan(heel) = F_side * h_eff / (disp * g * GM)
//
// Leeway:
//   Side force pushes hull sideways. Keel lift resists via:
//     F_keel = keelK * cos^2(heel) * (v + v0)^2 * leeway_rad    (small leeway)
//   Balance sets the leeway. The cos^2 is the keel losing grip as the boat
//   heels: its projected lateral area shrinks with cos(heel), and the part of
//   its lift that still acts sideways shrinks with cos(heel) again.
// ============================================================================

const G = 9.80665;
// Exponent of the keel's heel penalty (see the header). Without it an
// overpowered boat kept full keel grip at any heel, and once leeway stopped
// sitting on its clamp (ADR-0002) nothing slowed a boat laid over at 40 deg:
// reefing in 22 kn stopped paying off (ADR-0001 Test 4). cos^2 makes the
// overpowered boat slide, which is the physical reason to reef.
const KEEL_HEEL_EXP = 2;

export interface BalanceResult {
  /** Steady-state heel angle this tick is balancing toward, degrees. */
  heelEquilibrium: number;
  /** Steady-state leeway this tick is balancing toward, degrees. */
  leewayEquilibrium: number;
}

/** Compute instantaneous equilibrium heel and leeway from the current sail
 *  forces and boat speed. The real system has inertia, so the simulate.tick
 *  will relax toward these equilibrium values rather than jumping to them. */
export function computeBalance(args: {
  fSideMainN: number;  // N, side force contribution from main (signed)
  fSideJibN: number;   // N, side force contribution from jib (signed)
  mainCop: number;     // m
  jibCop: number;      // m
  boatSpeedKn: number;
  params: BoatParams;
}): BalanceResult {
  const { fSideMainN, fSideJibN, mainCop, jibCop, boatSpeedKn, params } = args;

  // For a real boat, heel is driven by the component of sail side force
  // perpendicular to the mast. At rest upright, that is simply the horizontal
  // side force. At non-zero heel, the lever arm is h_eff * cos(heel), which we
  // bake into the tan-form below.
  // Opposing forces cancel their signed moments, not their magnitudes.
  const heelingMoment = fSideMainN * mainCop + fSideJibN * jibCop;
  const rightingCoeff = params.displacement * G * params.gm;
  const tanHeel = heelingMoment / Math.max(rightingCoeff, 1);
  const heelEquilibrium = Math.atan(tanHeel) * RAD_TO_DEG;

  // Leeway from keel balance.
  // Sign convention: leeway in the SAME sign as side force. If sails push the
  // boat to port (side < 0), boat drifts port (leeway < 0 in our x-axis sense,
  // where +x = starboard). The wind.ts apparentWind() uses boatX = bs *
  // sin(leeway), so negative leeway = drift to port = correct.
  const vMps = Math.max(boatSpeedKn * KN_TO_MPS, 0);
  const keelGrip = Math.pow(Math.max(Math.cos(heelEquilibrium * DEG_TO_RAD), 0.2), KEEL_HEEL_EXP);
  const denom = params.keelK * keelGrip * (vMps + 0.5) * (vMps + 0.5);
  const totalSide = fSideMainN + fSideJibN;
  const leewayRadRaw = totalSide / denom;
  const leewayDegRaw = leewayRadRaw * RAD_TO_DEG;
  // The clamp only guards near-zero boat speed, where the denominator is tiny.
  // It must never bind while sailing: when it did (keelK 1500), close-hauled
  // leeway read 12 deg at every wind speed. Math.max/min pass NaN straight
  // through, so a non-finite force is caught explicitly instead of propagating
  // into heading, position and every later tick.
  const leewayEquilibrium = Number.isFinite(leewayDegRaw)
    ? Math.max(-12, Math.min(12, leewayDegRaw))
    : 0;

  return { heelEquilibrium, leewayEquilibrium };
}
