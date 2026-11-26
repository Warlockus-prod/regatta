import { physicalCourseDefinition, physicalCourseWaterBounds } from "./race-courses";
import type { PhysicalRaceProfile } from "./race-context";
import type { Vec2 } from "./race-physics";

/** Stuck watchdog of the metric solo race (M5, ADR-0015 point 7). Pure: the
 * race loop owns the state and decides what to show. It only says so; it
 * never moves a boat apart (no automatic separation). */
export const RACE_STUCK_WATCH = Object.freeze({
  /** The player covers less than this path... */
  pathMetres: 1,
  /** ...over this long while touching a hull or the water bound. */
  windowSeconds: 6,
  /** At most one hint in this many race seconds. */
  quietSeconds: 30,
  /** The water bound counts as touched within this distance of it. */
  boundMetres: 0.3,
});

export interface RaceStuckWatchState {
  /** Race time this touching window began; null while free. */
  readonly since: number | null;
  /** Path covered since `since`, metres. */
  readonly pathMetres: number;
  /** Race time of the last hint; null before the first. */
  readonly lastHint: number | null;
}
export interface RaceStuckWatchFrame {
  /** Race clock, seconds. */
  readonly t: number;
  /** The official race is on and the player has not finished. */
  readonly racing: boolean;
  /** Path the player covered this tick, metres. */
  readonly stepMetres: number;
  /** The player touches another hull or the water bound this tick. */
  readonly touching: boolean;
}

export function createRaceStuckWatch(): RaceStuckWatchState {
  return { since: null, pathMetres: 0, lastHint: null };
}

/** One tick. A window opens when the player touches something and closes
 * when it stops touching; every metre covered starts the window again, so a
 * hint means a whole windowSeconds of touching with under pathMetres of path. */
export function stepRaceStuckWatch(state: RaceStuckWatchState, frame: RaceStuckWatchFrame): { state: RaceStuckWatchState; hint: boolean } {
  const w = RACE_STUCK_WATCH;
  if (!frame.racing || !frame.touching || !Number.isFinite(frame.t) || !Number.isFinite(frame.stepMetres)) {
    return { state: { since: null, pathMetres: 0, lastHint: state.lastHint }, hint: false };
  }
  if (state.since === null) return { state: { since: frame.t, pathMetres: 0, lastHint: state.lastHint }, hint: false };
  const pathMetres = state.pathMetres + Math.max(0, frame.stepMetres);
  if (pathMetres >= w.pathMetres) return { state: { since: frame.t, pathMetres: 0, lastHint: state.lastHint }, hint: false };
  if (frame.t - state.since < w.windowSeconds - 1e-9) return { state: { since: state.since, pathMetres, lastHint: state.lastHint }, hint: false };
  const quiet = state.lastHint !== null && frame.t - state.lastHint < w.quietSeconds;
  // A fresh window after each verdict: a boat that stays stuck is told again
  // only after the quiet time.
  return { state: { since: frame.t, pathMetres: 0, lastHint: quiet ? state.lastHint : frame.t }, hint: !quiet };
}

/** Whether the player's hull touches another hull (centres within the bots'
 * escape contact distance) or sits on the metric water bound. Race units in. */
export function physicalPlayerPinned(profile: PhysicalRaceProfile, player: Readonly<Vec2>,
  others: readonly Readonly<Vec2>[]): boolean {
  const d = physicalCourseDefinition(profile), m = d.context.metresPerUnit, water = physicalCourseWaterBounds(profile);
  const touchUnits = d.bots.escape.contactCentreMetres / m, bound = RACE_STUCK_WATCH.boundMetres / m;
  if (others.some(o => Math.hypot(o.x - player.x, o.y - player.y) <= touchUnits)) return true;
  return player.x - water.minX <= bound || water.maxX - player.x <= bound
    || player.y - water.minY <= bound || water.maxY - player.y <= bound;
}
