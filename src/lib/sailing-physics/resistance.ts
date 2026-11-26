import { DEG_TO_RAD } from './wind';
import type { BoatParams, CruiserModel } from './types';

// ============================================================================
// Water resistance of the cruiser profile (DECISIONS.md ADR-0021).
//
//   R = (k_f v^2 + Rr(Fn) m g) * (1 + k_h heel^2)   hull: friction + waves
//     + share * |F_side| * |tan(leeway)|           keel induced drag
//     + (m v r)^2 / (0.5 rho_w (v + 0.5)^2 pi b^2)  lateral force of a turn
//
// k_f is BoatParams.hullDragK on this profile. Fn = v / sqrt(g LWL). The
// residuary table has the shape of the Delft series for a moderate cruiser:
// almost nothing below Fn 0.25, a steep wall from Fn 0.35, so speed creeps up
// to hull speed instead of hitting a cap. The classic profile does not use
// this file (simulate.ts keeps the ADR-0002 D = 240 v^2 and the 1.25 cap).
// ============================================================================

const G = 9.80665;
const RHO_WATER = 1025;

/** Rr / (m g) at a Froude number, linear in the table, last slope above it. */
export function residuaryShare(fn: number, table: CruiserModel['residuary']): number {
  if (!(fn > 0) || table.length === 0) return 0;
  if (fn <= table[0][0]) return table[0][1] * fn / Math.max(table[0][0], 1e-9);
  for (let i = 1; i < table.length; i++) {
    const [f1, r1] = table[i];
    if (fn <= f1) {
      const [f0, r0] = table[i - 1];
      return r0 + (r1 - r0) * (fn - f0) / (f1 - f0);
    }
  }
  const [fa, ra] = table[table.length - 2] ?? [0, 0];
  const [fb, rb] = table[table.length - 1];
  return rb + (rb - ra) / Math.max(fb - fa, 1e-9) * (fn - fb);
}

export interface ResistanceParts {
  friction: number;
  residuary: number;
  heel: number;
  keelInduced: number;
  turn: number;
  total: number;
}

/** Water resistance on the cruiser profile, N, opposing the motion. */
export function cruiserResistance(args: {
  speedMps: number;
  heelDeg: number;
  sideN: number;
  leewayDeg: number;
  yawRateDegPerS: number;
  params: BoatParams;
  model: CruiserModel;
}): ResistanceParts {
  const { params, model } = args;
  const v = Math.max(0, args.speedMps);
  const fn = v / Math.sqrt(G * params.lwl);
  const friction = params.hullDragK * v * v;
  const residuary = residuaryShare(fn, model.residuary) * params.displacement * G;
  const heelRad = Math.abs(args.heelDeg) * DEG_TO_RAD;
  const heel = (friction + residuary) * model.heelDragK * heelRad * heelRad;
  // Induced drag needs flow: it fades out at rest, where leeway is only the
  // low-speed clamp and no lift is being made.
  const keelInduced = model.keelInducedShare * Math.abs(args.sideN)
    * Math.abs(Math.tan(args.leewayDeg * DEG_TO_RAD)) * v / (v + 0.5);
  const r = Math.abs(args.yawRateDegPerS) * DEG_TO_RAD;
  const lateral = params.surgeMass * v * r;
  const turn = r > 0
    ? lateral * lateral / (0.5 * RHO_WATER * (v + 0.5) * (v + 0.5) * Math.PI * model.turnSpanM * model.turnSpanM)
    : 0;
  const total = friction + residuary + heel + keelInduced + turn;
  return { friction, residuary, heel, keelInduced, turn, total };
}
