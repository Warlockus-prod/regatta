// F2 (TestFlight 74 feedback): the race wind dial shows where the wind comes
// from relative to the boat's bow, as a sailor feels it on deck. The dial is
// bow-up: the boat points to the top, starboard is on the right, port on the
// left. Pure geometry, no React, so the side and the arrow are unit tested.

/** Where the wind comes from, seen from the helm. */
export type WindSide = "ahead" | "astern" | "port" | "starboard";

export interface BowRelativeWind {
  /** Signed angle from the bow to where the wind comes from, -180..180.
   * Positive = from starboard (right), as in the shared trainer (TWA sign). */
  readonly angle: number;
  /** Rounded size of the angle, 0..180: the TWA number shown to the player. */
  readonly degrees: number;
  readonly side: WindSide;
  /** Where the arrow starts on the rim and where its head points (toward the boat), in dial units.
   * The dial draws exactly these points, so the tested geometry is the drawn one. */
  readonly tail: Readonly<{ x: number; y: number }>;
  readonly head: Readonly<{ x: number; y: number }>;
  /** The two barbs of the arrow head, each joined to `head`. */
  readonly barbs: readonly [Readonly<{ x: number; y: number }>, Readonly<{ x: number; y: number }>];
}

/** The dial's drawing box: a 100 x 100 viewBox, centre 50/50. */
export const WIND_DIAL = Object.freeze({ centre: 50, rim: 40, headRadius: 18, barb: 8 });

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Normalise any finite angle to -180..180 (180 stays 180, never -180). */
export function signedAngle(value: number): number {
  let a = value % 360;
  if (a > 180) a -= 360;
  if (a <= -180) a += 360;
  return a;
}

/**
 * Bow-relative wind from the signed true wind angle (TWA, positive from
 * starboard). Rounded 0 and 180 readings are "ahead" and "astern" without a
 * port or starboard side, matching the number the player reads. Returns null
 * for a missing or broken reading, never a made-up zero.
 */
export function bowRelativeWind(twaSigned: number | null | undefined): BowRelativeWind | null {
  if (typeof twaSigned !== "number" || !Number.isFinite(twaSigned)) return null;
  const angle = signedAngle(twaSigned);
  const degrees = Math.round(Math.abs(angle));
  const side: WindSide = degrees === 0 ? "ahead" : degrees === 180 ? "astern" : angle < 0 ? "port" : "starboard";
  const rad = angle * Math.PI / 180;
  // Screen coordinates: x to the right, y down; the bow is up, so a positive
  // (starboard) angle puts the point right of the centre line.
  const sin = Math.sin(rad), cos = Math.cos(rad);
  const at = (r: number, across = 0) => Object.freeze({
    x: round1(WIND_DIAL.centre + r * sin + across * cos),
    y: round1(WIND_DIAL.centre - r * cos + across * sin),
  });
  // Barbs sit one barb length back toward the rim and one to each side.
  const back = WIND_DIAL.headRadius + WIND_DIAL.barb;
  const barbs = Object.freeze([at(back, -WIND_DIAL.barb), at(back, WIND_DIAL.barb)] as const);
  return Object.freeze({ angle, degrees, side, tail: at(WIND_DIAL.rim), head: at(WIND_DIAL.headRadius), barbs });
}
