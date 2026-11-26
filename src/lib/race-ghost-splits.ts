import { ghostMarkTimes, type GhostTrack } from "./race-ghost";

/** M4-4 splits against the personal ghost (race-ghost.ts): at each mark and
 * at the finish, your time minus the ghost's. Negative is ahead (green),
 * positive is behind (red); the copy (src/data/race-ghost-copy.ts) always
 * writes the sign and a word too, so the colour is never the only signal.
 * Mark splits compare the race clock; the finish compares the result time
 * with penalties, the same time the record keeps. Pure: no React, no storage. */

export type SplitVerdict = "ahead" | "behind" | "even";
export interface GhostSplit {
  /** "mark" for a mark rounding, "finish" for the finish line. */
  at: "mark" | "finish";
  /** Which mark (0 = the first); 0 for the finish. */
  index: number;
  /** Your time at this point, seconds. */
  timeSec: number;
  /** The ghost's time at the same point, seconds. */
  ghostSec: number;
  /** timeSec - ghostSec, rounded to a tenth as it is shown. */
  deltaSec: number;
  verdict: SplitVerdict;
}

/** The delta as shown (one decimal) decides the verdict, so "0.0" is never red. */
export function compareSplit(timeSec: number, ghostSec: number): { deltaSec: number; verdict: SplitVerdict } {
  const deltaSec = Math.round((timeSec - ghostSec) * 10) / 10 || 0;
  return { deltaSec, verdict: deltaSec < 0 ? "ahead" : deltaSec > 0 ? "behind" : "even" };
}

const usable = (t: number | null | undefined): t is number => typeof t === "number" && Number.isFinite(t) && t >= 0;

/** The split at mark `index` when you round it at `timeSec`; null without a
 * ghost or when the ghost has no time for that mark. */
export function ghostMarkSplit(track: GhostTrack | null, index: number, timeSec: number): GhostSplit | null {
  const ghostSec = track ? ghostMarkTimes(track)[index] : undefined;
  if (!usable(ghostSec) || !usable(timeSec)) return null;
  return { at: "mark", index, timeSec, ghostSec, ...compareSplit(timeSec, ghostSec) };
}

/** Every split of a race for the results: the marks you rounded, then the
 * finish when you finished. Empty without a ghost. */
export function raceGhostSplits(track: GhostTrack | null, player: { marks: readonly number[]; finishSec: number | null }): GhostSplit[] {
  if (!track) return [];
  const splits = player.marks.map((t, i) => ghostMarkSplit(track, i, t)).filter((s): s is GhostSplit => s !== null);
  if (usable(player.finishSec)) splits.push({ at: "finish", index: 0, timeSec: player.finishSec, ghostSec: track.finishTimeSec,
    ...compareSplit(player.finishSec, track.finishTimeSec) });
  return splits;
}

/** The feedback tone of a split: green ahead, red behind, neutral even. */
export function splitTone(verdict: SplitVerdict): "success" | "danger" | "info" {
  return verdict === "ahead" ? "success" : verdict === "behind" ? "danger" : "info";
}
