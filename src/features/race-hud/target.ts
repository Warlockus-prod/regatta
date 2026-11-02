// Target boat speed for the race HUD: what the force model's best trim makes
// at a given true wind angle (the polar). Solving it is too slow per frame, so
// a table every 5 degrees is solved once per wind strength and interpolated.

import { solvePolarPoint } from "@/lib/sailing-physics/polar";
import { CLASSIC_BOAT } from "@/lib/sailing-physics/boat";
import { bestVmg, type VmgOptimum } from "@/lib/upwind-vmg";

// The table serves the legacy race only (GameClient skips the metric trial),
// so it is solved on the boat that race sails: the classic profile (ADR-0021).

/** Below this true wind angle the boat cannot sail (the legacy race's no-go
 * zone, the same 30 deg as NO_GO in race-manoeuvres.ts). */
export const NO_GO_TWA = 30;
const STEP = 5;

export type PolarTable = number[];

/** Best speed (kn) at TWA 0, 5, ... 180 for this true wind speed (kn). */
export function polarTable(tws: number): PolarTable {
  const table: number[] = [];
  for (let twa = 0; twa <= 180; twa += STEP) table.push(twa < NO_GO_TWA ? 0 : solvePolarPoint(twa, tws, 0, CLASSIC_BOAT).speed);
  return table;
}

/** Target speed at a signed TWA (either tack), linear between table steps. */
export function targetSpeed(table: PolarTable, twa: number): number {
  const a = Math.min(180, Math.abs(twa));
  const i = Math.min(table.length - 2, Math.floor(a / STEP));
  const f = (a - i * STEP) / STEP;
  return table[i] + (table[i + 1] - table[i]) * f;
}

const cache = new Map<number, PolarTable>();
/** The table for a wind strength, solved on first use. */
export function polarFor(tws: number): PolarTable {
  const key = Math.round(tws * 10) / 10;
  let table = cache.get(key);
  if (!table) {
    table = polarTable(key);
    cache.set(key, table);
  }
  return table;
}

const upwindCache = new Map<number, VmgOptimum>();
/** The legacy race's best course to windward at this wind (package 7): the
 * one VMG solver (upwind-vmg.ts) on this race's own target table. The route
 * hint sails this angle on the beat and the skill bars and the coach grade
 * against the VMG it makes, so the advice and the grade are one number. */
export function raceUpwind(tws: number): VmgOptimum {
  const key = Math.round(tws * 10) / 10;
  let best = upwindCache.get(key);
  if (!best) {
    const table = polarFor(key);
    best = bestVmg((twa) => targetSpeed(table, twa), 1);
    upwindCache.set(key, best);
  }
  return best;
}
