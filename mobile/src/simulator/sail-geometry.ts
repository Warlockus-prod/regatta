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

/**
 * Sprint 8 visual-physics extensions. These are pure-math helpers consumed
 * by the renderer so the same numbers drive the side / rear projections
 * and the SkiaYacht top-down view. Keep all of them PURE (no React, no
 * Skia, no globals) so they stay testable.
 */

/** Max additional rotation, radians, the sail HEAD gets relative to the
 *  boom when twist is fully open. ~22 deg matches a powered-up dinghy
 *  twist photograph well enough for the schematic view. */
const TWIST_HEAD_OFFSET_MAX_DEG = 22;
/** Visibility threshold for twist - below this we return 0 so the renderer
 *  can keep the head locked to the boom and avoid jitter. */
const TWIST_VISIBLE_THRESHOLD = 0.05;
/** Reef depth past which twist is suppressed entirely (less area, less
 *  fabric to twist). */
const TWIST_REEF_CUTOFF = 0.5;

/** Sail-area multiplier at full reef (reef = 1). 0.4 keeps the sprite
 *  visible while telling the user "deep reef = a lot less power". */
const REEF_AREA_AT_FULL = 0.4;

const HEEL_VISUAL_CLAMP_DEG = 25;
const LEEWAY_VISUAL_CLAMP_DEG = 10;

/**
 * Radians the sail HEAD is offset from the BOOM angle, signed the same
 * way as the boom. Visible only when `twist > TWIST_VISIBLE_THRESHOLD`.
 * Returns 0 when reefed past `TWIST_REEF_CUTOFF` because there is less
 * fabric to twist when the sail is rolled / dropped down.
 *
 * The sign is independent of AWA: the head twists OFF in the same
 * direction the boom is swung, just further. The renderer can read the
 * boom angle and add this offset to derive the head angle.
 *
 * Tuning: at twist = 1 and reef = 0 the head opens by ~22 deg, which is
 * what a well-twisted main looks like in light air on a beam reach.
 */
export function twistOffsetRad(twist: number, sheet: number): number {
  void sheet;
  const t = clamp(twist, 0, 1);
  if (t < TWIST_VISIBLE_THRESHOLD) return 0;
  const reefScale = 1;
  const eased = (t - TWIST_VISIBLE_THRESHOLD) / (1 - TWIST_VISIBLE_THRESHOLD);
  return eased * reefScale * TWIST_HEAD_OFFSET_MAX_DEG * DEG_TO_RAD;
}

/**
 * Same as `twistOffsetRad` but takes the reef value into account. Pulled
 * out so callers that already gate on reef themselves can use the cheap
 * version. `reef >= TWIST_REEF_CUTOFF` => 0.
 */
export function twistOffsetReefedRad(
  twist: number,
  sheet: number,
  reef: number,
): number {
  if (clamp(reef, 0, 1) >= TWIST_REEF_CUTOFF) return 0;
  return twistOffsetRad(twist, sheet);
}

/**
 * Multiplier in [0, 1] for visible sail area as a function of reef depth.
 * `reef = 0` returns 1.0 (full sail), `reef = 1` returns
 * `REEF_AREA_AT_FULL` (deep reef leaves ~40% of the area visible). The
 * curve is linear because the reef slider step is coarse (0.25) and a
 * straight ramp matches the user's mental model "more reef = less sail".
 */
export function reefedAreaScale(reef: number): number {
  const r = clamp(reef, 0, 1);
  return 1 - r * (1 - REEF_AREA_AT_FULL);
}

/**
 * Visual heel angle in degrees, clamped to a sensible draw range so the
 * SVG / Skia projections do not flip the sprite around. Reads
 * `boatExt.heelDeg` directly. Sign convention is preserved: positive =
 * leeward, negative = windward.
 */
export function heelAngleDeg(boatExt: { heelDeg: number }): number {
  return clamp(boatExt.heelDeg, -HEEL_VISUAL_CLAMP_DEG, HEEL_VISUAL_CLAMP_DEG);
}

/**
 * Visual leeway angle in degrees, clamped to the small range a cruiser
 * actually drifts (typically 0-10 deg, rarely past 8). The arrow that
 * consumes this should be hidden when `Math.abs(leewayAngleDeg(...)) <= 1`
 * because a 1-deg arrow is just visual noise.
 */
export function leewayAngleDeg(boatExt: { leewayDeg: number }): number {
  return clamp(
    boatExt.leewayDeg,
    -LEEWAY_VISUAL_CLAMP_DEG,
    LEEWAY_VISUAL_CLAMP_DEG,
  );
}

export const VISUAL_TUNING = {
  TWIST_HEAD_OFFSET_MAX_DEG,
  TWIST_VISIBLE_THRESHOLD,
  TWIST_REEF_CUTOFF,
  REEF_AREA_AT_FULL,
  HEEL_VISUAL_CLAMP_DEG,
  LEEWAY_VISUAL_CLAMP_DEG,
} as const;
