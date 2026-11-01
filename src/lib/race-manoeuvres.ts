// Which heading flips of the solo race are manoeuvres (M0-4). The race log
// used to call every change of the sign of the true wind angle above 1 kn a
// "tack": a gybe, a wobble around dead downwind on a run and a heading flip
// while stepBoat held the boat against the world edge all counted, and the
// coach then criticised the player for tacking. This module is pure and has
// no imports, so the coach (web, API and the native app's history) and the
// race loop share one definition of a manoeuvre and of the no-go zone.

/** The no-go zone as the race log and the coach measure it: within this angle
 * of the true wind and slower than this. One definition for the live event,
 * the time in the zone, the praise and the next goal. */
export const NO_GO = { angleDeg: 30, belowKn: 2 } as const;

export function inNoGoZone(twa: number, speedKn: number): boolean {
  return Number.isFinite(twa) && Number.isFinite(speedKn) && Math.abs(twa) < NO_GO.angleDeg && speedKn < NO_GO.belowKn;
}

/** Hysteresis of the side the boat is on. A side counts only once the true
 * wind angle is clear of head to wind and of dead downwind by these margins,
 * so a wobble across either never commits a new side. */
export const MANOEUVRE = {
  /** |TWA| at least this far from head to wind, degrees. */
  clearOfWindDeg: 20,
  /** |TWA| at least this far from dead downwind, degrees. */
  clearOfRunDeg: 20,
  /** Boat speed at the crossing, knots: a slower flip is drifting, not a manoeuvre. */
  minSpeedKn: 1,
} as const;

export type Manoeuvre = "tack" | "gybe";

export interface ManoeuvreState {
  /** The committed side: 1 for TWA > 0, -1 for TWA < 0, 0 before the first. */
  side: -1 | 0 | 1;
  /** TWA of the previous sample, null before the first. */
  lastTwa: number | null;
  /** The last crossing of head to wind or dead downwind since the side was committed. */
  crossing: { kind: Manoeuvre; counts: boolean } | null;
}

export function createManoeuvreState(side: -1 | 0 | 1 = 0): ManoeuvreState {
  return { side, lastTwa: null, crossing: null };
}

export interface ManoeuvreSample {
  /** Signed true wind angle, -180..180 (calcTWA). */
  twa: number;
  speedKn: number;
  /** The world edge is holding the boat this tick (pressedAgainstEdge). */
  pinned: boolean;
}

/** Feed one sample; returns the next state, and a manoeuvre when the boat has
 * just settled on the other side after a crossing that counts. The side the
 * boat settles on is `state.side` of the result. */
export function classifyManoeuvre(state: ManoeuvreState, sample: ManoeuvreSample): { state: ManoeuvreState; manoeuvre: Manoeuvre | null } {
  const { twa, speedKn, pinned } = sample;
  if (!Number.isFinite(twa)) return { state, manoeuvre: null };
  const sign = twa > 0 ? 1 : -1;
  let crossing = state.crossing;
  if (state.lastTwa !== null && sign !== (state.lastTwa > 0 ? 1 : -1)) {
    // Through head to wind the two angles add up to less than 180 degrees.
    const kind: Manoeuvre = Math.abs(state.lastTwa) + Math.abs(twa) < 180 ? "tack" : "gybe";
    crossing = { kind, counts: speedKn > MANOEUVRE.minSpeedKn && !pinned };
  }
  const a = Math.abs(twa);
  const settled = a >= MANOEUVRE.clearOfWindDeg && a <= 180 - MANOEUVRE.clearOfRunDeg;
  if (!settled || sign === state.side) {
    // Back on the committed side: whatever crossed in between was a wobble.
    return { state: { side: state.side, lastTwa: twa, crossing: settled ? null : crossing }, manoeuvre: null };
  }
  const manoeuvre = state.side !== 0 && crossing?.counts && !pinned ? crossing.kind : null;
  return { state: { side: sign, lastTwa: twa, crossing: null }, manoeuvre };
}

/** World bounds a boat is clamped to (stepBoat: 20 units inside the world). */
export interface EdgeBounds { minX: number; maxX: number; minY: number; maxY: number }

/** The boat sits on a clamped edge and its heading points into that edge, so
 * the clamp, not the water, is stopping it. Heading 0 = north (-y), clockwise. */
export function pressedAgainstEdge(pos: { x: number; y: number }, headingDeg: number, bounds: EdgeBounds): boolean {
  const rad = headingDeg * Math.PI / 180, east = Math.sin(rad), north = Math.cos(rad), eps = 1e-6;
  return (pos.x <= bounds.minX + eps && east < 0) || (pos.x >= bounds.maxX - eps && east > 0)
    || (pos.y <= bounds.minY + eps && north > 0) || (pos.y >= bounds.maxY - eps && north < 0);
}
