import { type Vec2 } from './course';

// ---------------------------------------------------------------------------
// Race state machine. Lives inside RuntimeState and advances from stepRuntime
// each tick. No React here.
// ---------------------------------------------------------------------------

export type RacePhase = 'prestart' | 'racing' | 'finished';

export interface RaceState {
  phase: RacePhase;
  /** Total countdown length in seconds. Reset re-creates this. */
  countdownSec: number;
  /** simTime of the start gun. Countdown is remaining = countdownSec - simTime. */
  countdownStartedAt: number;
  /** simTime when phase -> racing. */
  startedAt: number | null;
  /** simTime when phase -> finished. */
  finishedAt: number | null;
  /** Index of the next mark the boat should round. */
  nextMarkIndex: number;
  /** All mark indices already rounded. */
  roundedMarks: number[];
  /** Whether the boat has crossed the finish line (or re-crossed start). */
  finishedLine: boolean;
}

export const DEFAULT_COUNTDOWN_SEC = 30;

export function initialRaceState(simTime: number): RaceState {
  return {
    phase: 'prestart',
    countdownSec: DEFAULT_COUNTDOWN_SEC,
    countdownStartedAt: simTime,
    startedAt: null,
    finishedAt: null,
    nextMarkIndex: 0,
    roundedMarks: [],
    finishedLine: false,
  };
}

/**
 * Determine whether a 2D point has crossed line segment a-b since a
 * previous position `prev`. "Crossed" = signed side changed AND closest
 * approach falls inside the segment.
 */
export function crossedLine(prev: Vec2, curr: Vec2, a: Vec2, b: Vec2): boolean {
  const side = (p: Vec2) => (b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x);
  const s1 = side(prev);
  const s2 = side(curr);
  if (s1 === 0 && s2 === 0) return false;
  if (Math.sign(s1) === Math.sign(s2)) return false;
  // Check the intersection parameter is within [0, 1] along a-b.
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lenSq = dx * dx + dz * dz;
  if (lenSq === 0) return false;
  const t = ((prev.x - a.x) * dx + (prev.z - a.z) * dz
    + ((curr.x - prev.x) * dx + (curr.z - prev.z) * dz) * 0.5) / lenSq;
  return t >= -0.05 && t <= 1.05;
}
