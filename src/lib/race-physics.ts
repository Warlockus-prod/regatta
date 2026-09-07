import { tick, createInitialState } from "./sailing-physics/simulate";
import { getBoatParams } from "./sailing-physics/boat";
import { trimForDrive } from "./sailing-physics/polar";
import type { BoatState, Controls } from "./sailing-physics/types";
/**
 * Pure sailing physics functions.
 *
 * Used BOTH on the client (offline / solo racing) AND on the ws-server
 * (authoritative multiplayer tick). Keep this file dependency-free and
 * platform-agnostic - no React, no DOM, no Node APIs.
 */

export interface Vec2 { x: number; y: number }

export const WORLD = { width: 800, height: 1200 };
export const WIND_DIRECTION_BASE = 0;            // deg, wind source (0 = from north)
export const MAX_SPEED = 8.0;                    // knots
export const TURN_RATE = 22;                     // deg/sec player
export const ACCEL = 2.5;                        // speed lerp factor
export const MARK_ROUND_DIST = 28;
export const MIN_BOAT_SEPARATION = 22;           // collision repel distance

// ---------------------------------------------------------------------------
// Angle helpers
// ---------------------------------------------------------------------------
export const deg2rad = (d: number) => (d * Math.PI) / 180;
export const rad2deg = (r: number) => (r * 180) / Math.PI;

export function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

export function angleDiff(a: number, b: number): number {
  let d = normalizeAngle(b) - normalizeAngle(a);
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

export function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function bearing(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const rad = Math.atan2(dx, -dy);
  return (rad2deg(rad) + 360) % 360;
}

export function segmentCrossed(prev: Vec2, curr: Vec2, a: Vec2, b: Vec2): boolean {
  const ccw = (A: Vec2, B: Vec2, C: Vec2) =>
    (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  return ccw(a, prev, curr) !== ccw(b, prev, curr) &&
         ccw(a, b, prev) !== ccw(a, b, curr);
}

// ---------------------------------------------------------------------------
// Sailing performance curves
// ---------------------------------------------------------------------------

/** Speed factor (0..1) based on true wind angle (TWA, absolute). */
export function speedFactorFromTWA(twa: number): number {
  const a = Math.abs(twa);
  if (a < 30) return 0;                                // no-go
  if (a < 45) return ((a - 30) / 15) * 0.65;
  if (a < 90) return 0.65 + ((a - 45) / 45) * 0.35;
  if (a < 160) return 1.0 - ((a - 90) / 70) * 0.15;
  return 0.85 - ((a - 160) / 20) * 0.25;
}

/** Signed TWA in [-180..180] for a boat heading + wind source direction. */
export function calcTWA(heading: number, windDir = 0): number {
  return ((heading - windDir + 540) % 360) - 180;
}

// ---------------------------------------------------------------------------
// Wind shifts (deterministic from a seed)
// ---------------------------------------------------------------------------

/**
 * Returns { dir, gust } at race-relative time t (seconds).
 * Deterministic per `seed` so every client sees the same wind.
 */
export function windAt(t: number, seed = 0): { dir: number; gust: number } {
  const shift = Math.sin(t * (2 * Math.PI / 22) + seed * 0.37) * 6
              + Math.sin(t * (2 * Math.PI / 7)  + seed * 0.91) * 2;
  const gust  = 1.0
              + Math.sin(t * (2 * Math.PI / 9)   + seed * 0.13) * 0.12
              + Math.sin(t * (2 * Math.PI / 3.3) + seed * 0.71) * 0.05;
  return {
    dir: (WIND_DIRECTION_BASE + shift + 360) % 360,
    gust: Math.max(0.75, Math.min(1.25, gust)),
  };
}

// ---------------------------------------------------------------------------
// Boat input + step integrator - shared client/server
// ---------------------------------------------------------------------------

export interface RaceBoat {
  id: string;
  name: string;
  color: string;
  pos: Vec2;
  heading: number;
  speed: number;
  wake?: Vec2[];
  lapDone: number;        // 0 = before mark, 1 = after mark, 2 = finished
  finishTime?: number;
  started?: boolean;
  returningToStart?: boolean;
  roundPhase?: number;
  physics?: BoatState;
  trim?: Controls;
  trimClock?: number;
  // Client-side only extras are allowed (ignored server side):
  skill?: number;
  tackPreference?: 'port' | 'starboard';
  aiTackTimer?: number;
  isPlayer?: boolean;
}

export interface InputState {
  /** -1..1, negative = port, positive = starboard. */
  turn: number;
}

/** Advance one boat by dt seconds, with a given wind vector. */
export function stepBoat(
  boat: RaceBoat,
  dt: number,
  windDir: number,
  gust: number,
  input: InputState,
  opts: { speedMul?: number; windStrengthMul?: number } = {},
): void {
  const authority = Math.max(0, Math.min(1, boat.speed / 3));
  boat.heading = normalizeAngle(boat.heading + Math.max(-1, Math.min(1, input.turn)) * TURN_RATE * authority * dt);
  const params = getBoatParams();
  const state = { ...(boat.physics ?? createInitialState({tws:12})), heading: boat.heading,
    boatSpeed: boat.speed, trueWindDir: windDir,
    trueWindSpeed: 12 * (opts.windStrengthMul ?? 1) * gust };
  boat.trimClock = (boat.trimClock ?? 1) + dt;
  if (!boat.trim || boat.trimClock >= .5) {
    boat.trim = trimForDrive(state, boat.trim ?? { mainSheet: .4, jibSheet: .2, mainTwist: .35, jibTwist: .4, reef: 0, jibFurl: 0, jibSide: 1 });
    boat.trimClock = 0;
  }
  boat.physics = tick(state, boat.trim, params, dt).state;
  boat.speed = boat.physics.boatSpeed;
  const rad = deg2rad(boat.heading + boat.physics.leeway);
  boat.pos.x += Math.sin(rad) * boat.speed * 8 * dt;
  boat.pos.y -= Math.cos(rad) * boat.speed * 8 * dt;

  // World clamp
  boat.pos.x = Math.max(20, Math.min(WORLD.width - 20, boat.pos.x));
  boat.pos.y = Math.max(20, Math.min(WORLD.height - 20, boat.pos.y));
}

/** Pair-wise boat repel to prevent overlap. */
export function resolveCollisions(boats: RaceBoat[], dt = 1 / 20): void {
  for (let i = 0; i < boats.length; i++) {
    for (let j = i + 1; j < boats.length; j++) {
      const a = boats[i];
      const b = boats[j];
      const dx = b.pos.x - a.pos.x;
      const dy = b.pos.y - a.pos.y;
      const d = Math.hypot(dx, dy);
      if (d < MIN_BOAT_SEPARATION) {
        const overlap = (MIN_BOAT_SEPARATION - d) / 2;
        const nx = d > .001 ? dx / d : 1;
        const ny = d > .001 ? dy / d : 0;
        a.pos.x -= nx * overlap;
        a.pos.y -= ny * overlap;
        b.pos.x += nx * overlap;
        b.pos.y += ny * overlap;
        a.speed *= Math.exp(-1.67 * dt);
        b.speed *= Math.exp(-1.67 * dt);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Standard windward-leeward course (same shape as the single-player game)
// ---------------------------------------------------------------------------

export interface CourseMark {
  pos: Vec2;
  radius: number;
  label: string;
  type: 'start' | 'windward' | 'finish';
}
export interface RaceCourse {
  marks: CourseMark[];
  startLine: { a: Vec2; b: Vec2 };
  finishLine: { a: Vec2; b: Vec2 };
}

export function makeStandardCourse(): RaceCourse {
  const cx = WORLD.width / 2;
  const startY = WORLD.height - 150;
  const windwardY = 180;
  const startLine = {
    a: { x: cx - 80, y: startY },
    b: { x: cx + 80, y: startY },
  };
  return {
    marks: [
      { pos: { x: cx, y: windwardY }, radius: 14, label: 'Windward', type: 'windward' },
      { pos: startLine.a, radius: 10, label: 'Start L', type: 'start' },
      { pos: startLine.b, radius: 10, label: 'Start R', type: 'start' },
    ],
    startLine,
    finishLine: startLine,
  };
}

/** Update a boat's lapDone if it crossed the windward mark or the finish line. */
export function updateLap(
  boat: RaceBoat,
  prevPos: Vec2,
  course: RaceCourse,
  raceTime: number,
): 'mark' | 'finish' | null {
  if (!boat.started) {
    if (prevPos.y > boat.pos.y && segmentCrossed(prevPos, boat.pos, course.startLine.a, course.startLine.b)) boat.started = true;
    else return null;
  }
  if (boat.lapDone === 0) {
    const m = course.marks[0];
    const inner = m.radius + MIN_BOAT_SEPARATION / 2;
    const outer = inner + 70;
    const x = m.pos.x, y = m.pos.y;
    const phase = boat.roundPhase ?? 0;
    if (phase === 0 && boat.pos.y < prevPos.y && segmentCrossed(prevPos, boat.pos, {x:x+inner,y}, {x:x+outer,y})) boat.roundPhase = 1;
    else if (phase === 1 && boat.pos.x < prevPos.x && segmentCrossed(prevPos, boat.pos, {x,y:y-inner}, {x,y:y-outer})) boat.roundPhase = 2;
    else if (phase === 2 && boat.pos.y > prevPos.y && segmentCrossed(prevPos, boat.pos, {x:x-inner,y}, {x:x-outer,y})) {
      boat.lapDone = 1; return "mark";
    }
  } else if (boat.lapDone === 1 && prevPos.y < boat.pos.y && segmentCrossed(prevPos, boat.pos, course.finishLine.a, course.finishLine.b)) {
    boat.lapDone = 2; boat.finishTime = raceTime; return "finish";
  }
  return null;
}

/** Port rounding: approach east, pass north, depart west of the mark.
 * The AI navigates the same gates checked for the player. */
export function raceWaypoint(boat: RaceBoat, course: RaceCourse): Vec2 {
  if (!boat.started) {
    const y = course.startLine.a.y;
    if (boat.pos.y < y) boat.returningToStart = true;
    if (boat.pos.y > y + 35) boat.returningToStart = false;
    return { x: (course.startLine.a.x + course.startLine.b.x) / 2, y: y + (boat.returningToStart ? 60 : -60) };
  }
  if (boat.lapDone > 0) return { x: (course.finishLine.a.x + course.finishLine.b.x) / 2, y: course.finishLine.a.y + 30 };
  const m = course.marks[0].pos;
  const r = course.marks[0].radius + MIN_BOAT_SEPARATION / 2 + 35;
  if ((boat.roundPhase ?? 0) === 0) return { x: m.x + r, y: m.y - r };
  if (boat.roundPhase === 1) return { x: m.x - r, y: m.y - r };
  return { x: m.x - r, y: m.y + r };
}

export function raceAutopilotTurn(boat: RaceBoat, course: RaceCourse, windDir: number): number {
  const target = raceWaypoint(boat, course);
  let desired = bearing(boat.pos, target);
  const relative = calcTWA(desired, windDir);
  if (Math.abs(relative) < 45) {
    const crosswind = (target.x - boat.pos.x) * Math.cos(deg2rad(windDir)) + (target.y - boat.pos.y) * Math.sin(deg2rad(windDir));
    desired = normalizeAngle(windDir + (crosswind >= 0 ? 48 : -48));
  }
  return Math.max(-1, Math.min(1, angleDiff(boat.heading, desired) / 12));
}
