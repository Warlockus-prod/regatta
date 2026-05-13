/**
 * Mock multiplayer client for the v1 lobby skeleton.
 *
 * Phase 4 ships the real WebSocket sync; until then the multiplayer
 * race screen needs SOMETHING to race against so the loop reads as
 * "multiplayer-ish" instead of "exactly the same as solo, but with a
 * code in the corner". This module provides 2 deterministic ghost
 * boats whose start positions, headings and speeds are derived from
 * the room code via FNV-1a + Mulberry32 (see `room-code.ts`).
 *
 * Deterministic-by-room-code is the killer property:
 *   - same code, same device  -> same ghosts on every retry, so the
 *     player can practise the same race over and over,
 *   - same code, different devices -> the same ghosts again, so two
 *     players in the same "room" race the same field even though
 *     there is no real network behind it. (They are not racing each
 *     other, but they are racing the same simulated opponents,
 *     which is enough to A/B compare lap times in the meantime.)
 *
 * The hook returns a `ghosts` array shaped to mirror what the real
 * client will return when Phase 4 ships:
 *
 *     useMockRoom('ABCD'): {
 *       ghosts: [{ id, x, y, headingRad, speedKn, nameLabel, color, finished, finishTimeSec }],
 *       tickN
 *     }
 *
 * The race screen consumes those fields without caring whether the
 * source is mock or real-WS. When the real client lands the import in
 * `race/[code].tsx` swaps to `useRealRoom`, the API stays the same.
 */

import { useEffect, useReducer, useRef } from 'react';
import { AppState } from 'react-native';
import {
  buildFinishLine,
  crossedFinishLine,
  type CourseMarkScreen,
} from '../game/course';
import { hashRoomCode } from './room-code';

/** 30 Hz, same cadence as `useSimLoop` so ghost motion blends with
 *  the player's render loop. */
const TICK_HZ = 30;
const DT = 1 / TICK_HZ;

/**
 * Same canvas-px / knot conversion `useSimLoop` uses, so ghost speed
 * reads visually consistent with the player. Centralised here so the
 * real-WS client can pick up the same constant if it wants to render
 * server-knots in canvas-px without re-deriving the calibration.
 */
const KN_TO_PX_PER_S = 6;

export interface GhostBoat {
  /** Stable per-room id, e.g. 'ghost-1'. */
  id: string;
  /** Canvas X. */
  x: number;
  /** Canvas Y. */
  y: number;
  /** Heading in radians, screen-space (0 = north / -Y). */
  headingRad: number;
  /** Boat speed in knots. Driven by a per-ghost cycle, see `tickGhosts`. */
  speedKn: number;
  /** Friendly label. v1 just uses "Ghost 1" / "Ghost 2" - localised in the
   *  consumer screen. We still expose a stable suffix so the UI can map
   *  it to a colour. */
  nameLabel: string;
  /** Render colour token from `tokens.ts` - one orange, one pink/danger. */
  color: 'warning' | 'danger';
  /** Whether the ghost has crossed the finish line yet. */
  finished: boolean;
  /** Seconds since race start at the moment of finish. */
  finishTimeSec: number | null;
}

export interface MockRoomState {
  ghosts: ReadonlyArray<GhostBoat>;
  /** Increments once per tick, used as a render trigger. */
  tickN: number;
}

interface MockRoomOptions {
  bounds: { width: number; height: number };
  /** Projected mark positions (pixel-space) - same array the screen
   *  renders. The ghosts use these as way-points so they actually round
   *  the windward mark and return through the finish line. */
  marks: ReadonlyArray<CourseMarkScreen>;
  /** Race phase from the consumer. The mock client only ticks ghost
   *  positions while the player is in the racing phase; in countdown
   *  the ghosts stay parked at their start positions, in finished mode
   *  they freeze where they crossed. */
  phase: 'countdown' | 'racing' | 'finished';
}

/**
 * Mulberry32 PRNG. Cheap, fast, well-distributed enough for two ghost
 * boats. We seed it via FNV-1a of the room code so the same code yields
 * the same ghost field every time.
 */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface GhostSchedule {
  /** Base cruise speed in knots. Shifts mildly per phase via `speedAt`. */
  baseSpeedKn: number;
  /** Lateral offset (canvas px) from the rhumb line; signed. */
  lateralOffsetPx: number;
  /** Phase offset (radians) for the speed-cycle sin wave. Keeps the two
   *  ghosts from beating in lockstep. */
  speedPhaseRad: number;
}

/**
 * Compute a per-ghost speed for the current race elapsed time. The
 * cycle adds +/-0.6 kn around `baseSpeedKn` over an 8-sec period so
 * the ghosts visually breathe rather than gliding at a constant
 * speed (which reads as "not actually a boat").
 */
function speedAt(schedule: GhostSchedule, elapsedSec: number): number {
  const wave = Math.sin((elapsedSec / 8) * Math.PI * 2 + schedule.speedPhaseRad);
  return Math.max(1, schedule.baseSpeedKn + 0.6 * wave);
}

/**
 * Initial state for a single ghost, derived deterministically from the
 * room-code-seeded RNG. We position them slightly to either side of
 * the start mark so the player has a clear sense of "another boat
 * over there", not "another boat on top of me".
 */
function buildGhost(
  i: number,
  rng: () => number,
  marks: ReadonlyArray<CourseMarkScreen>,
  bounds: { width: number; height: number },
): { ghost: GhostBoat; schedule: GhostSchedule } {
  const start = marks[0]!;
  const windward = marks[1]!;
  // Spread the ghosts left/right around the start mark so they read as
  // distinct boats rather than overlapping with the player.
  const sideSign = i === 0 ? -1 : 1;
  const lateralOffsetPx = sideSign * (28 + rng() * 18);
  // Initial heading aimed roughly at the windward mark, with a small
  // jitter so the two ghosts do not sail identical first-leg lines.
  const dx = windward.x - start.x;
  const dy = windward.y - start.y;
  const aim = Math.atan2(dx, -dy);
  const aimJitter = (rng() - 0.5) * 0.18; // ~10 deg
  // Speed band 4.6..5.6 kn so the player wins on a clean line but a
  // sloppy player can lose to either ghost.
  const baseSpeedKn = 4.6 + rng() * 1.0;
  const x = Math.min(
    bounds.width - 12,
    Math.max(12, start.x + lateralOffsetPx),
  );
  const y = start.y;
  const id = `ghost-${i + 1}`;
  return {
    ghost: {
      id,
      x,
      y,
      headingRad: aim + aimJitter,
      speedKn: 0,
      nameLabel: id,
      color: i === 0 ? 'warning' : 'danger',
      finished: false,
      finishTimeSec: null,
    },
    schedule: {
      baseSpeedKn,
      lateralOffsetPx,
      speedPhaseRad: rng() * Math.PI * 2,
    },
  };
}

/**
 * Pick the next way-point for a ghost given its progress so far.
 * v1 follows the simple windward + return course shape: head for
 * the windward mark, then turn around and head for the finish.
 * Each ghost has its OWN cleared list so a slow ghost does not
 * trigger off the player's progress.
 */
interface GhostNav {
  /** Index of the current target mark in `marks`. */
  targetIdx: number;
  /** Per-ghost cleared bitmask. */
  cleared: boolean[];
}

function advanceNav(
  nav: GhostNav,
  ghost: GhostBoat,
  marks: ReadonlyArray<CourseMarkScreen>,
): GhostNav {
  const next = { ...nav, cleared: nav.cleared.slice() };
  // We treat the start mark as auto-cleared at race start so the ghost
  // immediately heads for the windward mark on the first tick.
  if (next.targetIdx === 0) {
    next.cleared[0] = true;
    next.targetIdx = 1;
  }
  if (next.targetIdx >= marks.length) return next;
  const target = marks[next.targetIdx]!;
  const dx = ghost.x - target.x;
  const dy = ghost.y - target.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist <= target.captureRadius) {
    next.cleared[next.targetIdx] = true;
    next.targetIdx = next.targetIdx + 1;
  }
  return next;
}

/**
 * Steer the ghost toward the current target mark. Returns the new
 * heading in radians (screen-space). Clamps the per-tick turn rate so
 * a ghost cannot pivot 180 degrees in one frame; that would read as
 * teleporting.
 */
function steerToward(
  ghost: GhostBoat,
  target: CourseMarkScreen,
  schedule: GhostSchedule,
): number {
  const dx = target.x - ghost.x;
  const dy = target.y - ghost.y;
  // Add the schedule's lateral offset perpendicular to the rhumb line
  // so the ghost takes a slightly curved approach instead of beelining
  // straight across the player's path.
  const rhumb = Math.atan2(dx, -dy);
  const lateral = schedule.lateralOffsetPx;
  // Decay the lateral aim as the ghost gets close to the mark - so it
  // actually reaches the capture radius instead of orbiting.
  const dist = Math.sqrt(dx * dx + dy * dy);
  const decay = Math.min(1, dist / 180);
  const aim = rhumb + (lateral / 180) * 0.5 * decay;
  // Clamp turn rate to ~70 deg/sec so the boat reads as turning, not
  // snapping. Same constant the player's sim loop uses (see
  // `simulator/use-sim-loop.ts#DEFAULT_PARAMS.turnRate`).
  const TURN_RATE = 0.7;
  const maxStep = TURN_RATE * DT;
  const TWO_PI = Math.PI * 2;
  let delta = (aim - ghost.headingRad) % TWO_PI;
  if (delta > Math.PI) delta -= TWO_PI;
  if (delta < -Math.PI) delta += TWO_PI;
  const turn = Math.max(-maxStep, Math.min(maxStep, delta));
  let next = ghost.headingRad + turn;
  next = ((next % TWO_PI) + TWO_PI) % TWO_PI;
  return next;
}

/**
 * Wrap a position back into the canvas - same world topology as the
 * player's sim loop so a ghost that drifts off the right edge appears
 * back on the left, not lost offscreen forever.
 */
function wrap(x: number, edge: number): number {
  if (x < 0) return x + edge;
  if (x > edge) return x - edge;
  return x;
}

/**
 * Hook that drives 2 deterministic ghost boats. Returns a snapshot the
 * race screen reads on every render via the `tickN` counter.
 *
 * Implementation contract:
 *  - Ghosts only move when `phase === 'racing'`. In countdown they
 *    sit at their start positions; in finished mode they freeze.
 *  - The seeded RNG runs ONCE at hook mount (or when the room code
 *    changes); subsequent ticks reuse the same schedule so retrying
 *    the race produces the same opposition.
 *  - All clamps + turn-rate constants mirror `useSimLoop` so the
 *    ghosts visually behave like real boats.
 */
export function useMockRoom(
  roomCode: string,
  options: MockRoomOptions,
): MockRoomState {
  const ghostsRef = useRef<GhostBoat[]>([]);
  const navRef = useRef<GhostNav[]>([]);
  const schedulesRef = useRef<GhostSchedule[]>([]);
  const startedAtRef = useRef<number | null>(null);
  const phaseRef = useRef<MockRoomOptions['phase']>(options.phase);
  const seededForRef = useRef<string | null>(null);
  const seededForMarksRef = useRef<ReadonlyArray<CourseMarkScreen> | null>(
    null,
  );
  const optionsRef = useRef<MockRoomOptions>(options);
  optionsRef.current = options;
  const [tickN, advance] = useReducer((n: number) => n + 1, 0);

  // (Re-)seed when the room code or marks change. The marks comparison
  // is reference equality; the consumer screen builds the marks array
  // once via useMemo, so this is stable across renders. A new marks
  // array (e.g. on resize / Try-again) reseeds intentionally so the
  // ghosts respawn at the new start positions.
  if (
    seededForRef.current !== roomCode ||
    ghostsRef.current.length === 0 ||
    options.marks !== seededForMarksRef.current
  ) {
    const seed = hashRoomCode(roomCode || 'EMPT');
    const rng = mulberry32(seed);
    const ghosts: GhostBoat[] = [];
    const schedules: GhostSchedule[] = [];
    const navs: GhostNav[] = [];
    for (let i = 0; i < 2; i++) {
      const built = buildGhost(i, rng, options.marks, options.bounds);
      ghosts.push(built.ghost);
      schedules.push(built.schedule);
      navs.push({ targetIdx: 0, cleared: options.marks.map(() => false) });
    }
    ghostsRef.current = ghosts;
    schedulesRef.current = schedules;
    navRef.current = navs;
    seededForRef.current = roomCode;
    seededForMarksRef.current = options.marks;
    startedAtRef.current = null;
  }
  phaseRef.current = options.phase;

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (id !== null) return;
      id = setInterval(() => {
        const opts = optionsRef.current;
        const finishLine = buildFinishLine(opts.marks, opts.bounds);
        if (phaseRef.current !== 'racing') {
          // Stay parked at the start until the player flips to racing.
          if (phaseRef.current === 'countdown') {
            startedAtRef.current = null;
          }
          // Advance the tick counter so a finished phase re-render picks
          // up the latest snapshot. The op is cheap (one reducer).
          advance();
          return;
        }
        if (startedAtRef.current === null) {
          startedAtRef.current = Date.now();
        }
        const elapsedSec = (Date.now() - startedAtRef.current) / 1000;
        const next = ghostsRef.current.map((g, i) => {
          if (g.finished) return g;
          const nav = navRef.current[i]!;
          // Reached the end of the course? Mark finished, freeze.
          if (nav.targetIdx >= opts.marks.length) {
            return { ...g, finished: true, finishTimeSec: elapsedSec, speedKn: 0 };
          }
          const target = opts.marks[nav.targetIdx]!;
          const schedule = schedulesRef.current[i]!;
          const speedKn = speedAt(schedule, elapsedSec);
          const headingRad = steerToward(g, target, schedule);
          const speedPxPerS = speedKn * KN_TO_PX_PER_S;
          let nx = g.x + Math.sin(headingRad) * speedPxPerS * DT;
          let ny = g.y - Math.cos(headingRad) * speedPxPerS * DT;
          nx = wrap(nx, opts.bounds.width);
          ny = wrap(ny, opts.bounds.height);
          const candidate: GhostBoat = {
            ...g,
            x: nx,
            y: ny,
            headingRad,
            speedKn,
          };
          // Update the per-ghost nav AFTER the movement so the capture
          // check uses the new position. Persist back to the ref so the
          // next tick sees the advanced target.
          const newNav = advanceNav(nav, candidate, opts.marks);
          navRef.current[i] = newNav;
          // Finish-line crossing: only count once the boat has rounded
          // the windward mark (newNav.cleared[1] === true) AND it
          // crosses the finish strip. Same gate the player uses in
          // `mobile/app/game/index.tsx`.
          if (
            !candidate.finished &&
            finishLine &&
            newNav.cleared[1] === true &&
            crossedFinishLine({ x: candidate.x, y: candidate.y }, finishLine)
          ) {
            return {
              ...candidate,
              finished: true,
              finishTimeSec: elapsedSec,
              speedKn: 0,
            };
          }
          return candidate;
        });
        ghostsRef.current = next;
        advance();
      }, 1000 / TICK_HZ);
    };

    const stop = () => {
      if (id === null) return;
      clearInterval(id);
      id = null;
    };

    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', (n) => {
      if (n === 'active') start();
      else stop();
    });
    return () => {
      stop();
      sub.remove();
    };
    // We only need to (re-)spin the interval when the bounds change so
    // the runtime tick cadence matches the new canvas size. Marks /
    // phase live on refs and are read inside the tick body.
  }, [options.bounds.width, options.bounds.height]);

  return {
    ghosts: ghostsRef.current,
    tickN,
  };
}
