// ============================================================================
// Wind vector math.
//
// True wind -> apparent wind is a pure vector subtraction done in the boat
// frame. We do not need the world (N/E/S/W) frame at all for sail forces:
// everything is relative to the boat.
//
// Ported verbatim from web src/lib/sailing-physics/wind.ts.
// ============================================================================

export const KN_TO_MPS = 0.514444;
export const MPS_TO_KN = 1 / KN_TO_MPS;
export const DEG_TO_RAD = Math.PI / 180;
export const RAD_TO_DEG = 180 / Math.PI;

export interface WindVec {
  /** Boat-frame x component of apparent wind velocity (m/s). Positive = blowing
   *  toward starboard side of boat. */
  x: number;
  /** Boat-frame y component of apparent wind velocity (m/s). Positive = blowing
   *  toward bow. */
  y: number;
}

export interface ApparentWind {
  /** Velocity vector in boat frame (m/s). Points where wind flows TO. */
  vec: WindVec;
  /** Apparent wind speed, knots. */
  aws: number;
  /** Apparent wind angle from bow, degrees. Sign matches TWA (positive = from
   *  starboard). */
  awa: number;
}

/** Compute TWA from compass: TWA = signed angle from bow to wind-from-direction.
 *  Positive TWA means wind comes from starboard of bow. Range [-180, 180].
 */
export function twaFromCompass(trueWindDir: number, heading: number): number {
  let twa = trueWindDir - heading;
  while (twa > 180) twa -= 360;
  while (twa <= -180) twa += 360;
  return twa;
}

/** Compute apparent wind in the boat frame given true wind, heading, boat
 *  speed. All inputs in user units (knots, degrees); returns ApparentWind
 *  with m/s vector and knot speed.
 *
 *  Convention: TWA = signed angle from bow to the direction the wind COMES FROM.
 *  Wind flows TOWARD direction (TWA + 180) measured from bow.
 */
export function apparentWind(
  trueWindSpeedKn: number,
  twa: number,
  boatSpeedKn: number,
  leewayDeg = 0,
): ApparentWind {
  const tws = trueWindSpeedKn * KN_TO_MPS;
  const bs = boatSpeedKn * KN_TO_MPS;
  const twaRad = twa * DEG_TO_RAD;

  const windX = -tws * Math.sin(twaRad);
  const windY = -tws * Math.cos(twaRad);

  const leewayRad = leewayDeg * DEG_TO_RAD;
  const boatX = bs * Math.sin(leewayRad);
  const boatY = bs * Math.cos(leewayRad);

  const awX = windX - boatX;
  const awY = windY - boatY;

  const awsMps = Math.hypot(awX, awY);

  const awaRad = Math.atan2(-awX, -awY);
  const awa = awaRad * RAD_TO_DEG;

  return {
    vec: { x: awX, y: awY },
    aws: awsMps * MPS_TO_KN,
    awa,
  };
}

/** Velocity made good toward the wind (VMG upwind). Positive = making progress
 *  into the wind. For downwind legs, you can negate the sign to get VMG downwind.
 */
export function vmg(boatSpeedKn: number, twa: number): number {
  return boatSpeedKn * Math.cos(twa * DEG_TO_RAD);
}
