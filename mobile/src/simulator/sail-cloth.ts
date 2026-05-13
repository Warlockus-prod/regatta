/**
 * Cloth / wave helpers for the SkiaYacht sprite. These are the small
 * pure-math knobs that decide WHEN the sail looks "alive" (gentle wave
 * along the leech) versus locked-in (no wave, the user is on the edge
 * of the no-go or has the sail reefed flat) versus luffing (handled by
 * `sail-geometry#isLuffing` and rendered as a wavy LUFF, not a leech
 * wave).
 *
 * Keep this file PURE: no React, no Skia, no globals. The renderer in
 * SkiaYacht consumes the booleans and amplitudes and decides what to do
 * with them.
 */

/** AWA window where the sail is "powered up" enough that the cloth
 *  wiggles in the flow. Below 35 deg the boat is too close to the wind
 *  for stable flow (the leading edge starts to shake instead) and above
 *  120 deg the spinnaker / running setup takes over - the main sail
 *  collapses against the rig and stops rippling. */
const POWERED_UP_AWA_MIN_DEG = 35;
const POWERED_UP_AWA_MAX_DEG = 120;

/** Reef depth at which the sail is too short / stiff to ripple. */
const CLOTH_WAVE_REEF_CUTOFF = 0.6;

/** Default amplitude of the wave on the leech, expressed as a fraction
 *  of the leech length. 0.018 looks like a real cloth ripple at the
 *  default boat scale (length=36 px); larger feels cartoony. */
const CLOTH_WAVE_AMPLITUDE_FRAC = 0.018;

/** Number of full wavelengths along the leech. 2 reads as "alive"
 *  without becoming a flag-flutter. */
const CLOTH_WAVE_WAVELENGTHS = 2;

/** Speed multiplier vs the luff flutter clock. The luff flutter is
 *  alarming (luffing = lost flow) so the cloth wave is HALF that rate
 *  to read as relaxed instead. */
const CLOTH_WAVE_RATE = 0.5;

export const SAIL_CLOTH_TUNING = {
  POWERED_UP_AWA_MIN_DEG,
  POWERED_UP_AWA_MAX_DEG,
  CLOTH_WAVE_REEF_CUTOFF,
  CLOTH_WAVE_AMPLITUDE_FRAC,
  CLOTH_WAVE_WAVELENGTHS,
  CLOTH_WAVE_RATE,
} as const;

/**
 * Decide whether the cloth-wave animation should be drawn on a sail
 * given its luff state, reef depth, and the current AWA. The wave is a
 * "the sail is alive" cue, NOT a warning - it should only render when
 * the sail is genuinely powered up, not luffing, not reefed flat.
 */
export function shouldRenderClothWave(args: {
  luffing: boolean;
  reef: number;
  awaDeg: number;
}): boolean {
  if (args.luffing) return false;
  if (args.reef >= CLOTH_WAVE_REEF_CUTOFF) return false;
  const a = Math.abs(args.awaDeg);
  if (a < POWERED_UP_AWA_MIN_DEG) return false;
  if (a > POWERED_UP_AWA_MAX_DEG) return false;
  return true;
}

/**
 * Sample one point of a sin-wave displacement perpendicular to a base
 * line, used to deform the sail leech. `t` is the 0..1 position along
 * the leech (head -> clew), `clock` is the running animation phase
 * (typically `tickN * CLOTH_WAVE_RATE * 0.22`), `lengthPx` is the
 * full leech length used to scale the amplitude.
 *
 * Returns the displacement in pixels to add along the perpendicular
 * direction. The base point itself is not returned - callers compute
 * `(baseX + perpX * dispPx, baseY + perpY * dispPx)`.
 */
export function clothWaveDisplacement(args: {
  t: number;
  clock: number;
  lengthPx: number;
}): number {
  const t = Math.max(0, Math.min(1, args.t));
  // Damp the wave at both ends so head and clew stay attached to the
  // boom / mast and the cloth does not "detach" visibly.
  const ends = Math.sin(t * Math.PI);
  const phase = t * Math.PI * 2 * CLOTH_WAVE_WAVELENGTHS + args.clock;
  return Math.sin(phase) * args.lengthPx * CLOTH_WAVE_AMPLITUDE_FRAC * ends;
}
