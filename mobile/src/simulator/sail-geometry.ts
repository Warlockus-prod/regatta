/**
 * Pure-math helpers for the SkiaYacht sprite. No React, no Skia. Each
 * function is a small algebraic curve so the look stays predictable as
 * the user drags the sheets and the wind compass.
 *
 * Coordinate convention: the boat is drawn pointing UP in its local
 * group (+Y is the stern). AWA is signed degrees from the bow, positive
 * for wind on the starboard side. The boom angle returned here is the
 * angle of the boom in that local frame, signed the same way as AWA.
 *
 * Tuning constants below were picked to match the legacy inline boat
 * (sheet 1.0 -> boom near 8 deg, sheet 0 -> boom out near AWA - 30) so
 * the visual jump is small. Tweak with care; the simulator commentary
 * and the sail-feedback thresholds were tuned together with these.
 */

const DEG_TO_RAD = Math.PI / 180;

/** Hard limit on how far the boom can swing in either direction. */
const BOOM_MAX_DEG = 78;
/** Mainsail close-hauled minimum boom angle (matches legacy 8 deg). */
const BOOM_MIN_DEG = 8;
/** Subtract from |AWA| when the sheet is fully eased - the boom can never
 *  reach the apparent wind line itself or it would just luff. */
const BOOM_OFFSET_FROM_AWA_DEG = 30;
/** AWA below this magnitude = the boat is in the no-go zone, sails luff. */
const NO_GO_AWA_DEG = 28;
/** Sheet position considered "trimmed for upwind" near close-hauled. */
const UPWIND_OPT_SHEET = 0.85;
/** Sheet position considered "trimmed for a beam reach". */
const REACH_OPT_SHEET = 0.55;
/** Sheet position considered "trimmed for a broad reach / run". */
const RUN_OPT_SHEET = 0.25;

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

/** Pick the optimal sheet for a given AWA. Mirrors `optimalSheetFor` in
 *  sail-feedback but keyed off AWA so the geometry stays decoupled from
 *  TWA (we are picking what the sail SHOULD look like for the wind it
 *  actually sees). */
export function optimalSheetForAwa(awaDeg: number): number {
  const a = Math.abs(awaDeg);
  if (a < 50) return UPWIND_OPT_SHEET;
  if (a < 100) return REACH_OPT_SHEET;
  if (a < 150) return REACH_OPT_SHEET - 0.2;
  return RUN_OPT_SHEET;
}

/**
 * Boom angle in radians, signed in the LOCAL boat frame.
 * Positive boom angle = boom over the starboard side, matching the AWA sign.
 *
 * Behavior:
 * - sheet near 1 (hard sheeted) -> boom near +/- BOOM_MIN_DEG (centerline).
 * - sheet near 0 (eased)        -> boom near (|AWA| - BOOM_OFFSET) deg.
 * - In the no-go zone (|AWA| < NO_GO_AWA) the boom snaps to the centerline
 *   because there is no wind to push it out anyway.
 * - Capped at BOOM_MAX_DEG.
 */
export function boomAngleRad(awaDeg: number, sheet: number): number {
  const sign = awaDeg >= 0 ? 1 : -1;
  const a = Math.abs(awaDeg);
  if (a < NO_GO_AWA_DEG) return sign * BOOM_MIN_DEG * DEG_TO_RAD;
  const s = clamp(sheet, 0, 1);
  const easedTarget = Math.max(BOOM_MIN_DEG, a - BOOM_OFFSET_FROM_AWA_DEG);
  const blended = BOOM_MIN_DEG + (easedTarget - BOOM_MIN_DEG) * (1 - s);
  return sign * clamp(blended, BOOM_MIN_DEG, BOOM_MAX_DEG) * DEG_TO_RAD;
}

/**
 * 0..1 ratio describing how curved the sail looks. 0 = flat panel (over-
 * sheeted in light wind / no flow), 1 = full powered-up bulge.
 *
 * The curve peaks when the user is near the optimal sheet for the current
 * AWA and falls off symmetrically on either side. Returns 0 in the no-go
 * zone (luffing sails are drawn flat with the wavy edge instead).
 */
export function sailCurveRatio(awaDeg: number, sheet: number): number {
  const a = Math.abs(awaDeg);
  if (a < NO_GO_AWA_DEG) return 0;
  const opt = optimalSheetForAwa(awaDeg);
  const delta = clamp(sheet, 0, 1) - opt;
  // Smooth tent function: 1 at delta=0, 0 once |delta| >= 0.45.
  const fall = clamp(1 - Math.abs(delta) / 0.45, 0, 1);
  // Light puff on a run feels less curved even at the optimum, so bias by AWA.
  const awaBias = a > 150 ? 0.7 : 1;
  return fall * awaBias;
}

/**
 * True when the sail is luffing for a given AWA + sheet.
 * - Always luffs in the no-go zone.
 * - On a beam reach or beyond, a hard-sheeted sail also luffs (back-winded).
 *   We mark that case separately by returning true so the caller can draw
 *   the wavy edge.
 */
export function isLuffing(awaDeg: number, sheet: number): boolean {
  const a = Math.abs(awaDeg);
  if (a < NO_GO_AWA_DEG) return true;
  const opt = optimalSheetForAwa(awaDeg);
  // If the sheet is dramatically tighter than optimal upwind, the sail
  // pinches and starts to luff along the leading edge.
  if (a < 60 && sheet > opt + 0.18) return true;
  // Reaching: easing way past optimal causes the front of the sail to
  // collapse. Common beginner mistake.
  if (a >= 60 && a <= 150 && sheet < opt - 0.30) return true;
  return false;
}

/**
 * Pre-baked centerline offsets used by SkiaYacht to anchor sails on the
 * hull. Centralized here so the geometry helpers and the renderer stay in
 * sync if the hull length changes.
 */
export const HULL_LAYOUT = {
  bowY: -0.86,
  sternY: 0.94,
  mastY: -0.16,
  forestayY: -0.78,
  beam: 0.24,
  cabinFwdY: -0.26,
  cabinAftY: 0.42,
  cabinBeam: 0.13,
} as const;

/** Convert a |length| value (px) into the local-frame scale for the layout. */
export function hullScale(length: number): number {
  // The layout above is normalized to a hull HALF-length of 1. The
  // legacy boat used 54 px from center to bow, so the default
  // `length=36` maps to a scale of ~36 (good readable size on a phone).
  return length;
}

export const SAIL_TUNING = {
  NO_GO_AWA_DEG,
  BOOM_MIN_DEG,
  BOOM_MAX_DEG,
  BOOM_OFFSET_FROM_AWA_DEG,
} as const;
