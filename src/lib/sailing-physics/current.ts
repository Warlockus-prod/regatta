// ============================================================================
// Ocean / tidal current - velocity over ground.
//
// Phase 3 of docs/design/live-weather/DESIGN.md. ADDITIVE and pure: this file
// is a standalone vector helper. It does NOT touch the VPP tick, BoatState,
// Controls, or any existing physics. A null or zero current reproduces the
// boat's through-water velocity exactly, so nothing in the engine changes
// unless a caller deliberately opts in.
//
// Through water vs over ground:
//   - The VPP engine solves the boat's motion through the WATER (speed +
//     heading). That is unchanged.
//   - A current is the water itself moving over the ground. The boat's track
//     over the ground is the vector sum of its through-water velocity and the
//     current. The current "sets" the boat: course over ground (COG) differs
//     from heading, and speed over ground (SOG) differs from boat speed.
// ============================================================================

import { DEG_TO_RAD, RAD_TO_DEG } from './wind';

export interface Current {
  /** Current speed in knots. */
  setKn: number;
  /** Compass direction the current flows TOWARD, degrees true (0-360). */
  dirDeg: number;
}

export interface OverGround {
  /** Speed over ground, knots. */
  sogKn: number;
  /** Course over ground, compass degrees true, normalized to [0, 360). */
  cogDeg: number;
}

/** Normalize an angle in degrees to [0, 360). */
function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Vector-sum the boat's through-water velocity with the current to get the
 * boat's velocity over the ground.
 *
 * Inputs are compass-frame: a velocity "toward bearing B at speed S" has
 * components (East = S*sin(B), North = S*cos(B)). The boat moves through the
 * water toward `headingDeg` at `speedKn`; the current carries the water toward
 * `current.dirDeg` at `current.setKn`.
 *
 * Pure and deterministic. If `current` is null OR its setKn is 0, returns the
 * through-water velocity unchanged: { sogKn: speedKn, cogDeg: normalized
 * heading }. This is the guarantee that keeps the engine's existing output
 * identical when no current is applied.
 */
export function velocityOverGround(
  speedKn: number,
  headingDeg: number,
  current: Current | null,
): OverGround {
  if (!current || current.setKn === 0) {
    return { sogKn: speedKn, cogDeg: norm360(headingDeg) };
  }

  const hRad = headingDeg * DEG_TO_RAD;
  const cRad = current.dirDeg * DEG_TO_RAD;

  // Compass components: East = sin(bearing), North = cos(bearing).
  const east = speedKn * Math.sin(hRad) + current.setKn * Math.sin(cRad);
  const north = speedKn * Math.cos(hRad) + current.setKn * Math.cos(cRad);

  const sogKn = Math.hypot(east, north);
  // atan2(East, North) -> compass bearing measured clockwise from North.
  const cogDeg = norm360(Math.atan2(east, north) * RAD_TO_DEG);

  return { sogKn, cogDeg };
}
