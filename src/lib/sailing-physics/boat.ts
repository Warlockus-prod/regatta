import type { BoatParams } from './types';
import { SAIL_PLAN } from './sail-plan';

// ============================================================================
// Abstract 2-sail cruiser, not a certified model of a production class. Numbers chosen to represent a synthetic 45 ft
// cruiser (Bavaria / Beneteau / Jeanneau class) without committing to a
// specific hull. Tuned against ADR-0001 verification tests.
// ============================================================================

export const DEFAULT_BOAT: BoatParams = {
  displacement: 8000,   // kg, typical for 40 ft cruiser
  loa: 13.8554,            // m, measured GLB hull length in metre units
  lwl: 12.2,            // m. Hull speed = 1.34 * sqrt(lwl_ft) ~ 8.5 kn.
  mainArea: SAIL_PLAN.main.area,
  jibArea: SAIL_PLAN.jib.area,
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
