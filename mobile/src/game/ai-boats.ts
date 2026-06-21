/**
 * AI opponents for the solo race screen.
 *
 * The player boat runs the full VPP engine via useSimLoop. Running N more
 * VPP instances per frame would be wasteful, so the rivals use a lightweight
 * KINEMATIC model in the SAME screen-space coordinate system as the player:
 *
 *   - heading: radians, 0 = north (-Y), clockwise (matches use-sim-loop).
 *   - position step: dx = sin(h)*v*dt, dy = -cos(h)*v*dt.
 *   - speed: a simple polar (fraction of true wind speed by |TWA|) times a
 *     per-boat skill factor, then KN_TO_PX_PER_S like the player.
 *
 * Steering: head for the next uncleared mark. If the mark is upwind (inside
 * the no-go cone) the boat beats - it sails the favoured close-hauled tack and
 * flips tacks at the layline, with a cooldown so it does not shimmy on the
 * rhumb line. Mark rounding + finish detection mirror the player's mission
 * logic so positions are comparable.
 *
 * Difficulty sets the opponent COUNT and the skill spread.
 */
import { useEffect, useReducer, useRef } from 'react';
import { AppState } from 'react-native';

const TICK_HZ = 30;
const DT = 1 / TICK_HZ;
const KN_TO_PX_PER_S = 6; // must match use-sim-loop.ts
const TURN_RATE = 0.85; // rad/s
const NO_GO_DEG = 42; // closest a boat points to the true wind
const TACK_COOLDOWN_S = 2.4;
const RAD = Math.PI / 180;

export type RaceDifficulty = 'easy' | 'medium' | 'hard';

export interface AiMark {
  x: number;
  y: number;
  captureRadius: number;
  finish?: boolean;
}

export interface AiBoat {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  heading: number;
  speedKn: number;
  markIndex: number;
  finished: boolean;
  finishSec: number | null;
  tackDir: 1 | -1;
  tackCdSec: number;
  skill: number;
}

export interface RaceAiOptions {
  bounds: { width: number; height: number };
  marks: ReadonlyArray<AiMark>;
  /** Live wind getter (the race wind can be set once but read this each tick). */
  getWind: () => { dirRad: number; speedKts: number };
  difficulty: RaceDifficulty;
  /** AI only advances while true (i.e. phase === 'racing'). */
  running: boolean;
  /** Player start position (AI boats spread around it on the start line). */
  startX: number;
  startY: number;
  /** Bump to rebuild the fleet (new race / difficulty / course). */
  resetKey: string | number;
}

export interface RaceAiHandle {
  boats: AiBoat[];
  tick: number;
  /** Elapsed race seconds the AI loop has run (since running went true). */
  elapsedSec: number;
}

const AI_NAMES = ['Bavaria', 'Nord', 'Mistral', 'Albatross', 'Corsair', 'Solveig'];
const AI_COLORS = ['#ff8a5c', '#ffd24a', '#7cc7ff', '#b07cff', '#5cff9d', '#ff6f9d'];

const DIFFICULTY: Record<RaceDifficulty, { count: number; skillLo: number; skillHi: number }> = {
  easy: { count: 2, skillLo: 0.78, skillHi: 0.86 },
  medium: { count: 3, skillLo: 0.86, skillHi: 0.94 },
  hard: { count: 4, skillLo: 0.93, skillHi: 1.0 },
};

/** Boat speed as a fraction of true wind speed by |TWA| (deg). Rough polar:
 *  fastest on a beam-broad reach, slow upwind, easing off dead downwind. */
function polarFrac(twaAbs: number): number {
  if (twaAbs < NO_GO_DEG) return 0.12;
  if (twaAbs < 52) return 0.40;
  if (twaAbs < 80) return 0.50;
  if (twaAbs < 115) return 0.56;
  if (twaAbs < 150) return 0.48;
  return 0.36;
}

function normRad(r: number): number {
  const T = Math.PI * 2;
  let n = r % T;
  if (n < 0) n += T;
  return n;
}
function shortestRad(a: number, b: number): number {
  const T = Math.PI * 2;
  let d = (b - a) % T;
  if (d > Math.PI) d -= T;
  if (d < -Math.PI) d += T;
  return d;
}
/** Heading (screen-space, 0 = north) that points from (x,y) to (tx,ty). */
function bearingTo(x: number, y: number, tx: number, ty: number): number {
  return Math.atan2(tx - x, -(ty - y));
}

function buildFleet(opts: RaceAiOptions): AiBoat[] {
  const cfg = DIFFICULTY[opts.difficulty];
  const boats: AiBoat[] = [];
  for (let i = 0; i < cfg.count; i++) {
    const t = cfg.count === 1 ? 0.5 : i / (cfg.count - 1);
    const skill = cfg.skillLo + (cfg.skillHi - cfg.skillLo) * t;
    // Spread along the start line, biased to the sides so the player has room.
    const spread = (i - (cfg.count - 1) / 2) * Math.min(40, opts.bounds.width * 0.12);
    boats.push({
      id: `ai-${i}`,
      name: AI_NAMES[i % AI_NAMES.length]!,
      color: AI_COLORS[i % AI_COLORS.length]!,
      x: Math.max(8, Math.min(opts.bounds.width - 8, opts.startX + spread)),
      y: opts.startY,
      heading: 0,
      speedKn: 0,
      markIndex: 0,
      finished: false,
      finishSec: null,
      tackDir: i % 2 === 0 ? 1 : -1,
      tackCdSec: 0,
      skill,
    });
  }
  return boats;
}

function stepBoat(
  b: AiBoat,
  marks: ReadonlyArray<AiMark>,
  windDirRad: number,
  windKts: number,
  bounds: { width: number; height: number },
  elapsedSec: number,
): void {
  if (b.finished) return;
  const mark = marks[b.markIndex];
  if (!mark) {
    b.finished = true;
    b.finishSec = elapsedSec;
    return;
  }

  const bearing = bearingTo(b.x, b.y, mark.x, mark.y);
  // TWA if we headed straight at the mark.
  const twaDirect = (shortestRad(bearing, windDirRad) * 180) / Math.PI; // deg, signed
  let desired: number;
  if (Math.abs(twaDirect) >= NO_GO_DEG) {
    desired = bearing; // can lay the mark directly
  } else {
    // Upwind: beat. The two close-hauled headings sit NO_GO either side of
    // the wind-from direction.
    const hA = normRad(windDirRad + NO_GO_DEG * RAD);
    const hB = normRad(windDirRad - NO_GO_DEG * RAD);
    const favored = Math.abs(shortestRad(hA, bearing)) <= Math.abs(shortestRad(hB, bearing)) ? hA : hB;
    const other = favored === hA ? hB : hA;
    // Tack toward the favoured side, but only flip when off cooldown and the
    // other tack is clearly better (we have sailed past the layline).
    if (b.tackCdSec <= 0) {
      const curHeading = b.tackDir === 1 ? hA : hB;
      const curErr = Math.abs(shortestRad(curHeading, bearing));
      const favErr = Math.abs(shortestRad(favored, bearing));
      if (favored !== curHeading && curErr - favErr > 18 * RAD) {
        b.tackDir = favored === hA ? 1 : -1;
        b.tackCdSec = TACK_COOLDOWN_S;
      }
    }
    desired = b.tackDir === 1 ? hA : hB;
    void other;
  }

  // Turn toward desired, clamped.
  const dh = shortestRad(b.heading, desired);
  const maxStep = TURN_RATE * DT;
  b.heading = normRad(b.heading + Math.max(-maxStep, Math.min(maxStep, dh)));
  if (b.tackCdSec > 0) b.tackCdSec -= DT;

  // Speed from the polar at the ACTUAL heading's TWA.
  const twaNow = Math.abs((shortestRad(b.heading, windDirRad) * 180) / Math.PI);
  b.speedKn = polarFrac(twaNow) * windKts * b.skill;
  const v = b.speedKn * KN_TO_PX_PER_S;
  b.x += Math.sin(b.heading) * v * DT;
  b.y += -Math.cos(b.heading) * v * DT;
  // Soft-wrap like the player field so a boat does not vanish off-edge.
  if (b.x < 0) b.x += bounds.width;
  if (b.x > bounds.width) b.x -= bounds.width;
  if (b.y < 0) b.y += bounds.height;
  if (b.y > bounds.height) b.y -= bounds.height;

  // Mark rounding.
  const dxm = b.x - mark.x;
  const dym = b.y - mark.y;
  if (dxm * dxm + dym * dym <= mark.captureRadius * mark.captureRadius) {
    b.markIndex += 1;
    b.tackCdSec = 0;
    if (b.markIndex >= marks.length || mark.finish) {
      b.finished = true;
      b.finishSec = elapsedSec;
    }
  }
}

export function useRaceAi(opts: RaceAiOptions): RaceAiHandle {
  const boatsRef = useRef<AiBoat[]>([]);
  const elapsedRef = useRef(0);
  const [tick, advance] = useReducer((n: number) => (n + 1) % 1_000_000, 0);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // Rebuild fleet on resetKey / difficulty / bounds change.
  useEffect(() => {
    boatsRef.current = buildFleet(optsRef.current);
    elapsedRef.current = 0;
    advance();
  }, [opts.resetKey, opts.difficulty, opts.bounds.width, opts.bounds.height]);

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const loop = () => {
      const o = optsRef.current;
      if (!o.running) return;
      const wind = o.getWind();
      elapsedRef.current += DT;
      const boats = boatsRef.current;
      for (const b of boats) {
        stepBoat(b, o.marks, wind.dirRad, wind.speedKts, o.bounds, elapsedRef.current);
      }
      advance();
    };
    const start = () => {
      if (id == null) id = setInterval(loop, 1000 / TICK_HZ);
    };
    const stop = () => {
      if (id != null) {
        clearInterval(id);
        id = null;
      }
    };
    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', (s) => (s === 'active' ? start() : stop()));
    return () => {
      stop();
      sub.remove();
    };
  }, []);

  return { boats: boatsRef.current, tick, elapsedSec: elapsedRef.current };
}
