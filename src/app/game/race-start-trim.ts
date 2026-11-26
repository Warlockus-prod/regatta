import { LEGACY_RACE_BOAT, raceTrim, WIND_DIRECTION_BASE } from "@/lib/race-physics";
import { createInitialState, trimForDrive, type BoatParams, type Controls } from "@/lib/sailing-physics";

/** Base true wind of the solo race in knots; the race setup scales it (0.65 / 1 / 1.3). */
const RACE_BASE_TWS = 12;

/** Speed, as a share of the true wind, at which the starting sheets are solved.
 * The boat starts at rest, so a fixed trim has to work from 0 kn up to the
 * close-hauled speed. Solved at rest (the pre-fix behaviour) the sheets are
 * over-eased as soon as the boat moves: the Pro coach reads "luff" and a
 * trimmed bot astern runs into the player. Solved at the close-hauled polar
 * speed they stall from rest and the boat never gets going. A quarter of the
 * true wind sits on a plateau between the two: the same sheets in light,
 * medium and heavy wind, never luffing or stalling while the boat holds
 * course, and the coach calls the trim good once the bow is out of the
 * pinching zone (race-spawn.test.ts, "Pro starting trim"). */
export const START_TRIM_SPEED_SHARE = 0.25;

/** The same share for the metric race's cruiser profile (ADR-0021). Its sails
 * luff below an 8 deg angle of attack, so sheets solved at a quarter of the
 * wind are too eased once the boat moves: 73-93% of the close-hauled polar
 * and an extra tack for the route hint in some winds. At 0.45 the held
 * sheets make 92-100% of the polar on the beat; the price is a slower start
 * from rest (2 kn after 44 / 18 / 12 s at x0.65 / x1 / x1.3, was 22 / 10 /
 * 6 s). Measured 2026-11-02 with the shared boat and in
 * race-physical-human-fleet.test.ts (pro-assist and hint cells). */
export const CRUISER_START_TRIM_SPEED_SHARE = 0.45;

/** Sheets a Pro player starts the race with when they do not touch them:
 * the drive-optimal trim (the same search the automatic crew uses) for a boat
 * close-hauled on the start heading at a quarter of the wind speed, main up,
 * jib unrolled, no reef. Engine constants and the solver are unchanged. */
export function raceStartTrim(windStrengthMul: number, heading: number, params: BoatParams = LEGACY_RACE_BOAT): Controls {
  const tws = RACE_BASE_TWS * (Number.isFinite(windStrengthMul) && windStrengthMul > 0 ? windStrengthMul : 1);
  const state = createInitialState({ tws, trueWindDir: WIND_DIRECTION_BASE, heading, boatSpeed: (params.model ? CRUISER_START_TRIM_SPEED_SHARE : START_TRIM_SPEED_SHARE) * tws });
  // The boat of the race being started: classic for the legacy race, the
  // cruiser profile for the metric race (ADR-0021).
  return raceTrim({ ...trimForDrive(state, raceTrim({}), params), mainHoisted: true, jibFurl: 0, reef: 0 });
}
