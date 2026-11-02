import type { BoatParams } from './types';
import { SAIL_PLAN } from './sail-plan';

// ============================================================================
// Abstract 2-sail cruiser, not a certified model of a production class. Numbers chosen to represent a synthetic 45 ft
// cruiser (Bavaria / Beneteau / Jeanneau class) without committing to a
// specific hull. Tuned against ADR-0001 verification tests.
// ============================================================================

/** Classic profile: the ADR-0001 / ADR-0002 numbers, frozen. The legacy race
 * (`src/lib/race-physics.ts`), its server copy and every record, ghost, medal
 * and replay made on it keep sailing this boat (DECISIONS.md ADR-0021). */
export const CLASSIC_BOAT: BoatParams = Object.freeze({
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
  hullDragK: 240,       // D = hullDragK * v^2 (v in m/s, D in N).
                        // Tuned so beam-reach steady state lands in [5, 6.5] kn.
                        // Raised from 220 together with keelK: realistic leeway
                        // stops bleeding apparent wind, so hull drag now carries
                        // that resistance. Keeps the trimmed polar within 2% of
                        // the old speeds on average (worst cell 3.9%), so race
                        // times, missions and leaderboards do not move.
                        // DECISIONS.md ADR-0002.
  keelK: 6000,          // Effective keel/hull side-force constant.
                        // Used as: leeway_rad ~ F_side / (keelK * (bs_mps + 0.5)^2)
                        // At 1500 close-hauled leeway sat on the 12 deg clamp at
                        // every wind speed, so the clamp, not the keel, set it.
                        // With the heel term in balance.ts, 6000 gives 3.3-4.6
                        // deg close-hauled at normal heel, 1.1-1.8 on a beam reach
                        // and 0.2-0.3 running (Dedekam p. 5: marked leeway upwind,
                        // little or none downwind). Locked by polar.test.ts.
  surgeMass: 10000,     // kg. Added mass of water moving with the hull raises
                        // effective inertia above displacement alone.
}) as BoatParams;

/** Cruiser profile (DECISIONS.md ADR-0021): the same hull, rig, keel and
 * righting moment as the classic boat, with seamanlike resistance and sails.
 * Every trainer, lesson, polar, the metric race and the native trainer sail it. */
export const CRUISER_BOAT: BoatParams = Object.freeze({
  ...CLASSIC_BOAT,
  jibMinOff: 10,        // deg. A cruiser's genoa track sheets to about 9-12 deg;
                        // 5 deg was a racing barber hauler and let the jib
                        // draw at an apparent wind of 15 deg (expert A5).
  jibMaxOff: 65,        // deg. An eased genoa with the lead outboard; at 55 the
                        // jib sat stalled on a broad reach (TWA 120 was 9%
                        // slower than the beam reach, ORC cruisers are level).
  hullDragK: 55,        // N per (m/s)^2, FRICTION ONLY on this profile:
                        // 0.5 * 1025 * S 33 m^2 * Cf 0.0028 * form 1.15.
                        // Wave making is the residuary table below.
  model: Object.freeze({
    id: "cruiser-2026-11",
    residuary: Object.freeze([
      [0, 0], [0.15, 0.0002], [0.2, 0.0006], [0.25, 0.0015], [0.3, 0.004],
      [0.35, 0.013], [0.4, 0.036], [0.45, 0.09], [0.5, 0.15], [0.55, 0.2],
    ].map(row => Object.freeze(row as [number, number]))),
    heelDragK: 0.8,
    keelInducedShare: 0.4,
    turnSpanM: 1.8,
    windageCdA: 3,
    sailInducedK: 0.04,
    luffStartDeg: 1,
    luffFullDeg: 8,
    luffCd: 0.12,
    mainBackwindDeg: 6,
  }),
}) as BoatParams;

/** The default boat of the engine is the cruiser profile (ADR-0021). */
export const DEFAULT_BOAT: BoatParams = CRUISER_BOAT;

/** Returns a fresh copy of the default (cruiser) boat params. */
export function getBoatParams(overrides: Partial<BoatParams> = {}): BoatParams {
  return { ...DEFAULT_BOAT, ...overrides };
}

/** Returns a fresh copy of the classic boat params (legacy race, ADR-0021). */
export function getClassicBoatParams(overrides: Partial<BoatParams> = {}): BoatParams {
  return { ...CLASSIC_BOAT, ...overrides };
}
