// The one VMG solver (package 7, audit K3): the best course to windward or
// downwind of a polar, given as boat speed at an absolute true wind angle.
// The race's suggested course on the beat (race-guidance.ts), the skill bars
// that grade the beat (race-skill-metrics.ts) and the coach that grades the
// close-hauled speed (fallback-coach.ts) all read this function on the polar
// of the boat being sailed, so the hint and the grade cannot disagree
// (upwind-vmg.test.ts). Pure, whole degrees, no physics import.

export interface VmgOptimum {
  /** Absolute true wind angle of the optimum, whole degrees. */
  readonly twa: number;
  /** Boat speed there, knots. */
  readonly speedKn: number;
  /** Speed made good along the wind there, knots (positive both ways). */
  readonly vmgKn: number;
}

/** Best VMG upwind (along = 1, TWA 0..90) or downwind (along = -1, TWA
 * 90..180) of `speedAt`. Non-finite or negative speeds count as 0; the
 * first of equal optima wins, so the result is deterministic. */
export function bestVmg(speedAt: (absTwa: number) => number, along: 1 | -1 = 1): VmgOptimum {
  const [from, to] = along > 0 ? [0, 90] : [90, 180];
  let best: VmgOptimum = { twa: along > 0 ? from : to, speedKn: 0, vmgKn: 0 };
  for (let a = from; a <= to; a++) {
    const v = speedAt(a);
    const speedKn = Number.isFinite(v) && v > 0 ? v : 0;
    const vmgKn = speedKn * along * Math.cos(a * Math.PI / 180);
    if (vmgKn > best.vmgKn) best = { twa: a, speedKn, vmgKn };
  }
  return best;
}
