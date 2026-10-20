/**
 * Which tack a boat is on, from its heading relative to the wind.
 *
 * The angle is measured clockwise from the direction the wind comes FROM, the
 * convention of the points-of-sail wheel: wind from the top, boats on the right
 * half have positive angles and head right, boats on the left half head left.
 *
 * A boat is on the tack of her windward side. Wind from the north: heading west
 * (270) puts the wind over the starboard side, so starboard tack; heading east
 * (90) is port tack. The screen side and the boat's side are opposite words
 * here: the left half of the wheel is starboard tack.
 *
 * Exactly head to wind (0) and dead downwind (180) return null. There the
 * racing rules take the windward side from where the mainsail lies (or lay),
 * not from the angle; so does sailing by the lee just past 180. This helper
 * assumes the usual case of the mainsail on the leeward side and must not be
 * used to guess the boundary cases.
 */
export type Tack = 'port' | 'starboard';

export function tackForHeading(angleDeg: number): Tack | null {
  const a = ((angleDeg % 360) + 360) % 360;
  if (a === 0 || a === 180) return null;
  return a < 180 ? 'port' : 'starboard';
}
