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
//     F_keel = keelK * (v + v0)^2 * leeway_rad    (for small leeway)
//   Balance sets the leeway.
// ============================================================================

const G = 9.80665;

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
  const absSide = Math.abs(fSideMainN) + Math.abs(fSideJibN);
  const hEff = absSide > 1e-3
    ? (Math.abs(fSideMainN) * mainCop + Math.abs(fSideJibN) * jibCop) / absSide
    : 0;

  const heelingMoment = absSide * hEff;
  const rightingCoeff = params.displacement * G * params.gm;
  const tanHeel = heelingMoment / Math.max(rightingCoeff, 1);
  const heelSign = (fSideMainN + fSideJibN) >= 0 ? 1 : -1;
  const heelEquilibrium = Math.atan(tanHeel) * RAD_TO_DEG * heelSign;

  // Leeway from keel balance.
  // Sign convention: leeway in the SAME sign as side force. If sails push the
  // boat to port (side < 0), boat drifts port (leeway < 0 in our x-axis sense,
  // where +x = starboard). The wind.ts apparentWind() uses boatX = bs *
  // sin(leeway), so negative leeway = drift to port = correct.
  const vMps = Math.max(boatSpeedKn * KN_TO_MPS, 0);
  const denom = params.keelK * (vMps + 0.5) * (vMps + 0.5);
  const totalSide = fSideMainN + fSideJibN;
  const leewayRadRaw = totalSide / denom;
  const leewayDegRaw = leewayRadRaw * RAD_TO_DEG;
  const leewayEquilibrium = Math.max(-12, Math.min(12, leewayDegRaw));

  void DEG_TO_RAD;
  return { heelEquilibrium, leewayEquilibrium };
}
