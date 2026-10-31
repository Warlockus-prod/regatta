import { raceTrim, WIND_DIRECTION_BASE } from "@/lib/race-physics";
import { createInitialState, trimForDrive, type Controls } from "@/lib/sailing-physics";

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

/** Sheets a Pro player starts the race with when they do not touch them:
 * the drive-optimal trim (the same search the automatic crew uses) for a boat
 * close-hauled on the start heading at a quarter of the wind speed, main up,
 * jib unrolled, no reef. Engine constants and the solver are unchanged. */
export function raceStartTrim(windStrengthMul: number, heading: number): Controls {
  const tws = RACE_BASE_TWS * (Number.isFinite(windStrengthMul) && windStrengthMul > 0 ? windStrengthMul : 1);
  const state = createInitialState({ tws, trueWindDir: WIND_DIRECTION_BASE, heading, boatSpeed: START_TRIM_SPEED_SHARE * tws });
  return raceTrim({ ...trimForDrive(state, raceTrim({})), mainHoisted: true, jibFurl: 0, reef: 0 });
}
