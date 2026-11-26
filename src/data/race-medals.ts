// M4-5 medal thresholds of the solo race, per race class, fleet difficulty and
// wind. One source for the website and the iOS app (the race WebView reads it;
// the app's Race hub may read it later through Metro, hence relative imports).
//
// PROVISIONAL. There is no data from beginners yet (that is M1-8, the owner's
// test with people), so the numbers come from the bots of the same race:
//   - bronze: finishing at all (decision #8: a course can always be passed);
//     the race ends at 300 s, so bronzeSec is that limit, and a finish that
//     penalties push past it is still bronze;
//   - silver: faster than the race time of the slowest bot that sailed at
//     race pace, the median of five fixed fleet spreads (you are usually not
//     last). A bot more than 1.3 times the winner's time, or one that did not
//     finish, was tangled or stuck at a mark, not slow by pace (bot speeds
//     differ by only 3 percent), so it does not set silver;
//   - gold: faster than the race time of the fastest bot, the same median
//     (you usually win), AND without route and trim hints (decision #8);
//   - then a harder fleet is never easier than the level below in the same
//     wind (the player's boat is the same on every level): a number above the
//     easier level's is lowered to it (medium fleet, strong wind gold).
// Seconds are penalty-adjusted race time, rounded down to a whole second.
// race-medals.test.ts sails the bots again (the live 30 Hz engine, the solo
// race wind, the fair echelon start) and fails when a number here no longer
// matches them, checks gold < silver < bronze on every course and that a
// harder fleet never makes silver or gold easier. Known gaps, kept as
// measured: Easy bots in light wind sail far slower than Medium ones (the
// cause is not studied), so Easy light has the most generous gold; and in
// strong wind the Medium bots finish within a second or two of each other,
// so silver there is barely slower than gold. Bots tangling at the marks is
// a separate defect of the bot fleet, not a part of these numbers.
//
// Venues do not change the course (every venue sails makeStandardCourse), so
// the venue is not part of a medal course. The race class carries its own
// version (`legacy-race-v1:standard:r1`) and every stored medal keeps it, so
// legacy medals stay apart from the medals of another class. A new revision
// of the numbers within a class regrades from the stored best times and never
// takes a medal away (src/lib/race-medals.ts). When the race switches to
// metres in M5, the metric class needs its own rows here and starts without
// medals: carrying legacy medals over would need an explicit migration, which
// does not exist. A class without rows here never awards a medal: the
// physical trial (`/game?race=`, PHYSICAL_RACE_EMISSION_ENABLED = false) has none.

import type { RaceClassId } from "../lib/race-context";
import type { Difficulty } from "./race-difficulty";

export type MedalWind = "light" | "medium" | "heavy";
export interface MedalThresholds {
  /** Gold: finish at or under this, with route and trim hints off. */
  readonly goldSec: number;
  /** Silver: finish at or under this. */
  readonly silverSec: number;
  /** Bronze: any finish; the race time limit, for display and the order check. */
  readonly bronzeSec: number;
}

/** Bumped whenever a number below changes; stored next to every medal. */
export const MEDAL_THRESHOLDS_REVISION = 2;
/** The solo race time limit (useRaceLoop, race-completion.ts): bronze is a finish. */
export const MEDAL_BRONZE_LIMIT_SEC = 300;

const row = (goldSec: number, silverSec: number): MedalThresholds =>
  Object.freeze({ goldSec, silverSec, bronzeSec: MEDAL_BRONZE_LIMIT_SEC });

export const RACE_MEDAL_THRESHOLDS: Readonly<Partial<Record<RaceClassId, Readonly<Record<Difficulty, Readonly<Record<MedalWind, MedalThresholds>>>>>>> = Object.freeze({
  "legacy-race-v1:standard:r1": Object.freeze({
    easy: Object.freeze({ light: row(240, 261), medium: row(102, 115), heavy: row(79, 92) }),
    medium: Object.freeze({ light: row(125, 143), medium: row(96, 106), heavy: row(79, 81) }),
    hard: Object.freeze({ light: row(113, 132), medium: row(83, 95), heavy: row(64, 77) }),
  }),
});
