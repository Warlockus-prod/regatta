// ============================================================================
// Heel and leeway from the sail force balance.
//
// Ported verbatim from web src/lib/sailing-physics/balance.ts.
// ============================================================================

import { DEG_TO_RAD, RAD_TO_DEG, KN_TO_MPS } from './wind';
import type { BoatParams } from './types';

const G = 9.80665;

export interface BalanceResult {
  /** Steady-state heel angle this tick is balancing toward, degrees. */
  heelEquilibrium: number;
  /** Steady-state leeway this tick is balancing toward, degrees. */
  leewayEquilibrium: number;
}

export function computeBalance(args: {
  fSideMainN: number;
  fSideJibN: number;
  mainCop: number;
  jibCop: number;
  boatSpeedKn: number;
  params: BoatParams;
}): BalanceResult {
  const { fSideMainN, fSideJibN, mainCop, jibCop, boatSpeedKn, params } = args;

  const absSide = Math.abs(fSideMainN) + Math.abs(fSideJibN);
  const hEff = absSide > 1e-3
    ? (Math.abs(fSideMainN) * mainCop + Math.abs(fSideJibN) * jibCop) / absSide
    : 0;

  const heelingMoment = absSide * hEff;
  const rightingCoeff = params.displacement * G * params.gm;
  const tanHeel = heelingMoment / Math.max(rightingCoeff, 1);
  const heelSign = (fSideMainN + fSideJibN) >= 0 ? 1 : -1;
  const heelEquilibrium = Math.atan(tanHeel) * RAD_TO_DEG * heelSign;

  const vMps = Math.max(boatSpeedKn * KN_TO_MPS, 0);
  const denom = params.keelK * (vMps + 0.5) * (vMps + 0.5);
  const totalSide = fSideMainN + fSideJibN;
  const leewayRadRaw = totalSide / denom;
  const leewayDegRaw = leewayRadRaw * RAD_TO_DEG;
  const leewayEquilibrium = Math.max(-12, Math.min(12, leewayDegRaw));

  void DEG_TO_RAD;
  return { heelEquilibrium, leewayEquilibrium };
}
