import type { BoatParams } from './types';

// ============================================================================
// Abstract 2-sail cruiser. Numbers chosen to represent a ~40 ft production
// cruiser (Bavaria / Beneteau / Jeanneau class) without committing to a
// specific hull. Tuned against ADR-0001 verification tests.
// ============================================================================

export const DEFAULT_BOAT: BoatParams = {
  displacement: 8000,   // kg, typical for 40 ft cruiser
  loa: 12.2,            // m (40 ft)
  lwl: 10.5,            // m. Hull speed = 1.34 * sqrt(lwl_ft) ~ 8.5 kn.
  mainArea: 45,         // m^2
  jibArea: 30,          // m^2 (100% jib, not full genoa)
  mainCOP: 7.5,         // m above waterline (center of pressure ~40% up the main)
  jibCOP: 4.5,          // m above waterline
  mainMaxOff: 85,       // deg (boom can swing ~85 deg to leeward)
  jibMaxOff: 55,        // deg
  jibMinOff: 5,         // deg (hard sheeted, cannot go fully on centerline)
  gm: 1.0,              // m. Metacentric height. Lower = tender, higher = stiff.
  hullDragK: 220,       // D = hullDragK * v^2 (v in m/s, D in N).
                        // Tuned so beam-reach steady state lands in [5, 6.5] kn.
  keelK: 1500,          // Effective keel/hull side-force constant.
                        // Used as: leeway_rad ~ F_side / (keelK * (bs_mps + 0.5)^2)
  surgeMass: 10000,     // kg. Added mass of water moving with the hull raises
                        // effective inertia above displacement alone.
};

/** Returns a fresh copy of the default boat params. */
export function getBoatParams(overrides: Partial<BoatParams> = {}): BoatParams {
  return { ...DEFAULT_BOAT, ...overrides };
}
