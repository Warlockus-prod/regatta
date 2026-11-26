// Helm assist, the angle solver (package 13, ADR-0022): which true wind angle
// the boat should sail, read from the polar of the boat being sailed. Pure, no
// physics import: the caller passes `speedAt` (boat speed in knots at an
// absolute true wind angle), the legacy race its classic table, the metric
// race and the Trainer the cruiser one (features/race-hud/target.ts). The best
// angles are the one VMG solver (upwind-vmg.ts bestVmg), never a fork of it,
// so BEST VMG, the route hint and the skill bars agree on the beat.
//
// Signs follow the race (race-physics.ts calcTWA): twa = heading - wind
// direction, in -180..180; positive is wind on the port side.

import { bestVmg, type VmgOptimum } from "./upwind-vmg";

export type SpeedAt = (absTwa: number) => number;

export interface PolarAngles {
  /** Best VMG to windward. */
  readonly upwind: VmgOptimum;
  /** Best VMG downwind. */
  readonly downwind: VmgOptimum;
}

/** The best angles to windward and downwind of a polar. */
export function polarAngles(speedAt: SpeedAt): PolarAngles {
  return { upwind: bestVmg(speedAt, 1), downwind: bestVmg(speedAt, -1) };
}

/** Which kind of leg the next mark makes: beat, run or a reach in between. */
export type HelmLeg = "upwind" | "downwind" | "reach";

/** Degrees the bearing must move past a border before the leg changes, so a
 * mark right on the close-hauled or the running angle does not flip the leg
 * with every wind wobble. */
export const LEG_HYSTERESIS_DEG = 5;

/**
 * The leg by the direction to the next mark, not by the current angle: the
 * mark's bearing closer to the wind than the best upwind angle is a beat,
 * further off than the best downwind angle a run, anything between a reach.
 * `markTwa` is the signed TWA of the bearing to the mark.
 */
export function legOf(markTwa: number, angles: PolarAngles, previous?: HelmLeg | null): HelmLeg {
  const a = Math.abs(markTwa);
  const up = angles.upwind.twa, down = angles.downwind.twa, h = LEG_HYSTERESIS_DEG;
  if (previous === "upwind" && a < up + h) return "upwind";
  if (previous === "downwind" && a > down - h) return "downwind";
  if (previous === "reach" && a >= up - h && a <= down + h) return "reach";
  if (a < up) return "upwind";
  if (a > down) return "downwind";
  return "reach";
}

export interface LegTarget {
  readonly leg: HelmLeg;
  /** Signed true wind angle to sail, whole degrees. */
  readonly twa: number;
  /** What the best angle makes good: VMG along the wind on a beat or a run,
   * VMC towards the mark on a reach; knots. */
  readonly targetKn: number;
}

/** Side of the wind the boat is on: 1 port (twa > 0), -1 starboard. A boat
 * right head to wind or dead downwind takes the mark's side. */
export function sideOf(twa: number, markTwa = 1): 1 | -1 {
  if (Math.abs(twa) >= 1 && Math.abs(twa) <= 179) return twa > 0 ? 1 : -1;
  return markTwa < 0 ? -1 : 1;
}

/**
 * The angle BEST VMG sails on this leg. It always keeps the side the boat is
 * on: it never tacks or gybes by itself, that is the player's button. On a
 * beat or a run that is the best VMG angle; on a reach the best VMC towards
 * the mark between the best upwind and the best downwind angles (on the
 * mark's side that is about the bearing of the mark).
 */
export function legTarget(speedAt: SpeedAt, angles: PolarAngles, markTwa: number, twa: number, previous?: HelmLeg | null): LegTarget {
  const leg = legOf(markTwa, angles, previous);
  const side = sideOf(twa, markTwa);
  if (leg === "upwind") return { leg, twa: side * angles.upwind.twa, targetKn: angles.upwind.vmgKn };
  if (leg === "downwind") return { leg, twa: side * angles.downwind.twa, targetKn: angles.downwind.vmgKn };
  let best = { twa: angles.upwind.twa, vmc: -Infinity };
  for (let a = angles.upwind.twa; a <= angles.downwind.twa; a++) {
    const v = speedAt(a);
    const vmc = (Number.isFinite(v) && v > 0 ? v : 0) * Math.cos((side * a - markTwa) * Math.PI / 180);
    if (vmc > best.vmc) best = { twa: a, vmc };
  }
  return { leg, twa: side * best.twa, targetKn: Math.max(0, best.vmc) };
}

/** Speed made good on this leg: along the wind on a beat (positive towards
 * it) or a run (positive away from it), towards the mark on a reach. */
export function madeGood(speedKn: number, twa: number, leg: HelmLeg, markTwa: number): number {
  if (!Number.isFinite(speedKn) || !Number.isFinite(twa)) return 0;
  const rad = (d: number) => d * Math.PI / 180;
  if (leg === "upwind") return speedKn * Math.cos(rad(twa));
  if (leg === "downwind") return -speedKn * Math.cos(rad(twa));
  return speedKn * Math.cos(rad(twa - markTwa));
}
