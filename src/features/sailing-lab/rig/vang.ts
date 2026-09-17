import { boomPoint, distance, type BoomPose } from "./layout";
import { RIG_PASSPORT as P } from "./passport";

/** Endpoint separation, not tackle rope length or a tension setting. The
 * mast-axis lower attachment makes the limit independent of boom yaw. */
export function vangGeometry(pose: BoomPose) {
  const upper = boomPoint(pose, P.vangLayout.boomRadius, P.vangLayout.underBoom);
  const lower = P.vangLayout.base;
  return { upper, lower, span: distance(upper, lower) };
}
export const VANG_LIMITS = {
  min: vangGeometry({ yaw: 0, rise: 0 }).span,
  max: vangGeometry({ yaw: 0, rise: P.boom.maxRiseDegrees }).span + .15,
};
/** HTML range values may round arbitrary decimal endpoints. Keep its domain
 * integral, then convert here so Home/End use the exact physical constants. */
export function vangSpanFromPercent(percent: number): number {
  if (!Number.isFinite(percent)) throw new RangeError("Invalid vang setting");
  if (percent <= 0) return VANG_LIMITS.min;
  if (percent >= 100) return VANG_LIMITS.max;
  return VANG_LIMITS.min + (VANG_LIMITS.max - VANG_LIMITS.min) * percent / 100;
}
export const vangSpanPercent = (span: number) => 100 * (span - VANG_LIMITS.min) / (VANG_LIMITS.max - VANG_LIMITS.min);
export function vangRiseLimit(span: number): number {
  if (!Number.isFinite(span) || span < VANG_LIMITS.min || span > VANG_LIMITS.max) throw new RangeError("Invalid vang span");
  if (span >= vangGeometry({ yaw: 0, rise: P.boom.maxRiseDegrees }).span) return P.boom.maxRiseDegrees;
  let low = 0, high: number = P.boom.maxRiseDegrees;
  for (let i = 0; i < 30; i++) {
    const mid = (low + high) / 2;
    if (vangGeometry({ yaw: 0, rise: mid }).span > span) high = mid; else low = mid;
  }
  return low;
}
