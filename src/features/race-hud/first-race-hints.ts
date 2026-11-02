// First race hints in the moment (M4-7, owner decision #11): four short
// lessons the solo race shows when they matter, once per device:
//
// - "no-go": the boat stalls in the no-go zone (inNoGoZone, the same
//   predicate the race log, the coach and the skill bars use) and stays
//   there for HINT_TIMING.noGoSec. Crossing the wind with way on (above
//   MANOEUVRE.minSpeedKn, a crossing the tack classifier counts) restarts
//   that clock: a tack slows the boat below 2 kn as it passes head to wind,
//   but each side of it is shorter, so an ordinary tack gets the first tack
//   hint, not this one. A boat drifting head to wind while the wind swings
//   across its bow stays stalled;
// - "first-tack": the first tack of the race, while the boat picks up again;
// - "mark-approach": the boat sails towards the windward mark it has not yet
//   rounded, a little before the three-length zone;
// - "crossing": another boat on the opposite tack closes in (rule 10, the
//   same right-of-way and closest-approach model the judge uses).
//
// Rules:
// - each hint is shown once per device: the id goes into
//   FIRST_RACE_HINTS_KEY when the toast is really on screen, so a hint that
//   lost its slot on a busy feedback stack comes back next race;
// - one hint at a time: a hint never follows another within HINT_TIMING.gapSec,
//   longer than the toast stays, so a second hint never replaces the first;
// - within one race each hint fires at most once (state.fired), even before
//   it reached storage;
// - "Show hints again" in the race settings clears the row (resetFirstRaceHints);
// - solo race only, not multiplayer (it has no feedback bus). M5 step 6: the
//   metric race (?race=, physical-cruiser-v1) shows them too, with its own
//   scale (race-scale.ts): the crossing look-ahead is the judge's 8 real
//   seconds, the distances are its hull lengths and the mark approach is
//   METRIC_MARK_APPROACH_HULLS. The second-based timings (HINT_TIMING) are the
//   same in both races: the race clock is real time in both, and a metric
//   tack crosses the no-go stall clock sooner than noGoSec on each side
//   (race-guidance-physical.test.ts sails it).
//
// Gold medals (decision #8, src/lib/race-medals.ts raceUsesHints): these hints
// do NOT count as route or trim hints. Each says once what a situation means
// and the general way out (bear away, let the boat pick up, leave the mark to
// port, port tack keeps clear); none gives a heading, a distance, a route or
// a sheet setting, and none repeats, so it cannot steer the race for the
// player. A gold medal stays possible in the race that showed them.
//
// Pure: time and the fleet are passed in, so the triggers are tested without
// React, storage or a clock. Storage is injected the same way.

import { MIN_BOAT_SEPARATION, type RaceBoat, type RaceCourse } from "@/lib/race-physics";
import { raceClosestApproach, raceRightOfWay } from "@/lib/race-rules";
import type { RaceScale } from "@/lib/race-scale";
import { MANOEUVRE, inNoGoZone } from "@/lib/race-manoeuvres";

export const FIRST_RACE_HINTS = ["no-go", "first-tack", "mark-approach", "crossing"] as const;
export type FirstRaceHintId = typeof FIRST_RACE_HINTS[number];
/** The crossing hint says which side the player is on. */
export type FirstRaceHint = { id: Exclude<FirstRaceHintId, "crossing"> } | { id: "crossing"; giveWay: boolean };

export const FIRST_RACE_HINTS_KEY = "regatta.race.hints-seen.v1";

const HULL = MIN_BOAT_SEPARATION;
export const HINT_TIMING = {
  /** Seconds between two hints: longer than a hint toast stays (FEEDBACK_DURATION.hint). */
  gapSec: 9,
  /** No-go: stalled in the zone this long on one side of the wind, seconds (a tack crosses it sooner). */
  noGoSec: 3,
  /** A hint counts as seen once it has been on screen this long while the race runs, seconds (useFirstRaceHints). */
  readSec: 2,
  /** The first tack hint is due this long after the tack, while the boat picks up. */
  afterTackSec: 3,
  /** Mark approach: closer than this to the windward mark, world units (two zones of three hull lengths). */
  markUnits: HULL * 6,
  /** Crossing: the other boat within this distance, world units... */
  crossingUnits: HULL * 8,
  /** ...and its closest approach within this, world units, as the boats sail now. */
  crossingPassUnits: HULL * 3,
} as const;

/** Mark approach in the metric race, hull lengths from the mark: the boat
 * sails at real speed, so six hulls (79 m) came 11-55 s before the zone on
 * the three metric courses; four hulls come 3-8 s before it, while the toast
 * (6 s) can still be read (race-guidance-physical.test.ts). */
export const METRIC_MARK_APPROACH_HULLS = 4;

/** The hint distances of a race, world units: the legacy ones (HINT_TIMING) without a metric scale. */
export function firstRaceHintDistances(scale?: RaceScale): { markUnits: number; crossingUnits: number; crossingPassUnits: number } {
  if (!scale || scale.model !== "physical-cruiser-v1") {
    return { markUnits: HINT_TIMING.markUnits, crossingUnits: HINT_TIMING.crossingUnits, crossingPassUnits: HINT_TIMING.crossingPassUnits };
  }
  const hull = scale.hullUnits;
  return { markUnits: hull * METRIC_MARK_APPROACH_HULLS, crossingUnits: hull * 8, crossingPassUnits: hull * 3 };
}

export interface FirstRaceHintState {
  /** Fired in this race (shown or waiting for a slot). */
  fired: readonly FirstRaceHintId[];
  /** Race time of the last hint; null before the first. */
  lastAt: number | null;
  /** Race time of the first tack of this race; null before it. */
  firstTackAt: number | null;
  /** Since when the player is stalled in the no-go zone without crossing the wind with way on; null when not. */
  noGoSince: number | null;
  /** The side of the wind of that stall (sign of the TWA). */
  noGoSide: -1 | 1;
}

export function createFirstRaceHintState(): FirstRaceHintState {
  return { fired: [], lastAt: null, firstTackAt: null, noGoSince: null, noGoSide: 1 };
}

export interface FirstRaceHintSample {
  /** Race time, seconds. */
  t: number;
  /** The race is on (not the countdown, not the finish). */
  racing: boolean;
  /** A tack was classified on this tick (classifyManoeuvre). */
  tacked: boolean;
  /** Signed true wind angle of the player, degrees. */
  twa: number;
  windDir: number;
  boats: readonly RaceBoat[];
  course: RaceCourse;
  /** The race's scale (race-scale.ts), so the crossing look-ahead is the judge's; omitted: the legacy race. */
  scale?: RaceScale;
}

/** The other racing boat on the opposite tack that is closing in on the
 * player, with who keeps clear; null when there is none. */
export function playerCrossing(boats: readonly RaceBoat[], windDir: number, scale?: RaceScale): { giveWay: boolean } | null {
  const player = boats.find(b => b.isPlayer);
  if (!player || !player.started || player.lapDone >= 2) return null;
  const near = firstRaceHintDistances(scale);
  for (const other of boats) {
    if (other === player || other.lapDone >= 2) continue;
    if (Math.hypot(other.pos.x - player.pos.x, other.pos.y - player.pos.y) > near.crossingUnits) continue;
    const row = raceRightOfWay(player, other, windDir);
    if (!row || row.rule !== "10") continue;
    const approach = raceClosestApproach(player, other, scale);
    if (approach.closing > 0.1 && approach.distance < near.crossingPassUnits) return { giveWay: row.giveWayId === player.id };
  }
  return null;
}

/** The player sails the first leg and is near the windward mark. */
export function playerNearMark(boats: readonly RaceBoat[], course: RaceCourse, scale?: RaceScale): boolean {
  const player = boats.find(b => b.isPlayer);
  const mark = course.marks.find(m => m.type === "windward") ?? course.marks[0];
  if (!player || !mark || !player.started || player.lapDone !== 0) return false;
  return Math.hypot(mark.pos.x - player.pos.x, mark.pos.y - player.pos.y) < firstRaceHintDistances(scale).markUnits;
}

/** Feed one race tick; returns the next state and the hint due now, if any.
 * `seen` are the hints this device has already shown (readFirstRaceHints). */
export function nextFirstRaceHint(state: FirstRaceHintState, sample: FirstRaceHintSample, seen: ReadonlySet<FirstRaceHintId>):
  { state: FirstRaceHintState; hint: FirstRaceHint | null } {
  if (!sample.racing || !Number.isFinite(sample.t)) return { state, hint: null };
  const firstTackAt = state.firstTackAt ?? (sample.tacked ? sample.t : null);
  const player = sample.boats.find(b => b.isPlayer);
  // The stall clock stops outside the zone and restarts when the boat crosses the wind with way on (a tack in progress).
  const side: -1 | 1 = sample.twa > 0 ? 1 : -1;
  const stalled = !!player && inNoGoZone(sample.twa, player.speed);
  const tacking = !!player && side !== state.noGoSide && player.speed > MANOEUVRE.minSpeedKn;
  const noGoSince = !stalled ? null : state.noGoSince !== null && !tacking ? state.noGoSince : sample.t;
  const tracked = firstTackAt === state.firstTackAt && noGoSince === state.noGoSince && side === state.noGoSide
    ? state : { ...state, firstTackAt, noGoSince, noGoSide: side };
  const open = (id: FirstRaceHintId) => !seen.has(id) && !tracked.fired.includes(id);
  if (FIRST_RACE_HINTS.every(id => !open(id))) return { state: tracked, hint: null };
  if (tracked.lastAt !== null && sample.t - tracked.lastAt < HINT_TIMING.gapSec) return { state: tracked, hint: null };
  if (!player || player.lapDone >= 2) return { state: tracked, hint: null };
  let hint: FirstRaceHint | null = null;
  // In the order of urgency: a stalled boat first, then a boat on a collision course.
  if (open("no-go") && noGoSince !== null && sample.t - noGoSince >= HINT_TIMING.noGoSec) hint = { id: "no-go" };
  else if (open("crossing")) { const c = playerCrossing(sample.boats, sample.windDir, sample.scale); if (c) hint = { id: "crossing", giveWay: c.giveWay }; }
  if (!hint && open("mark-approach") && playerNearMark(sample.boats, sample.course, sample.scale)) hint = { id: "mark-approach" };
  if (!hint && open("first-tack") && firstTackAt !== null && sample.t - firstTackAt <= HINT_TIMING.afterTackSec) hint = { id: "first-tack" };
  if (!hint) return { state: tracked, hint: null };
  return { state: { ...tracked, fired: [...tracked.fired, hint.id], lastAt: sample.t }, hint };
}

// --- The device record: which hints were shown -------------------------

type HintStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const browserStorage = (): HintStorage | null => {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
};
const isHintId = (v: unknown): v is FirstRaceHintId => typeof v === "string" && (FIRST_RACE_HINTS as readonly string[]).includes(v);
// Storage can be missing or throw (private mode): this visit still remembers.
const memory = new Set<FirstRaceHintId>();
/** Storage refused "Show hints again": its old row no longer counts until a write succeeds. */
let ignoreStored = false;

/** The hints this device has shown. A corrupt row counts as none seen. */
export function readFirstRaceHints(storage: HintStorage | null = browserStorage()): Set<FirstRaceHintId> {
  const seen = new Set<FirstRaceHintId>(memory);
  if (ignoreStored) return seen;
  try {
    const parsed: unknown = JSON.parse(storage?.getItem(FIRST_RACE_HINTS_KEY) ?? "[]");
    if (Array.isArray(parsed)) for (const v of parsed) if (isHintId(v)) seen.add(v);
  } catch { /* none seen */ }
  return seen;
}

export function markFirstRaceHintSeen(id: FirstRaceHintId, storage: HintStorage | null = browserStorage()): void {
  if (!isHintId(id)) return;
  memory.add(id);
  const seen = readFirstRaceHints(storage);
  try { storage?.setItem(FIRST_RACE_HINTS_KEY, JSON.stringify(FIRST_RACE_HINTS.filter(h => seen.has(h)))); ignoreStored = false; }
  catch { /* the in-memory record keeps this visit consistent */ }
}

/** "Show hints again": every hint is due again from now on. */
export function resetFirstRaceHints(storage: HintStorage | null = browserStorage()): void {
  memory.clear();
  try { storage?.removeItem(FIRST_RACE_HINTS_KEY); ignoreStored = false; } catch { ignoreStored = true; }
}
