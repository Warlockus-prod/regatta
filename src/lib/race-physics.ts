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
export const UNITS_PER_KNOT_SECOND = 8;          // world units a boat covers per knot per second

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
  /** Bot steering memory, owned by raceAutopilotTurn. */
  autopilot?: AutopilotState;
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
  boat.pos.x += Math.sin(rad) * boat.speed * UNITS_PER_KNOT_SECOND * dt;
  boat.pos.y -= Math.cos(rad) * boat.speed * UNITS_PER_KNOT_SECOND * dt;

  // World clamp
  boat.pos.x = Math.max(20, Math.min(WORLD.width - 20, boat.pos.x));
  boat.pos.y = Math.max(20, Math.min(WORLD.height - 20, boat.pos.y));
}

/** Closing speed (knots) at which a contact costs both boats the full slow-down. */
export const FULL_BUMP_CLOSING_KN = 1;

/** Velocity over the ground in knots (x east, y south), as stepBoat moves the boat. */
function groundVelocity(boat: RaceBoat): Vec2 {
  const rad = deg2rad(boat.heading + (boat.physics?.leeway ?? 0));
  return { x: Math.sin(rad) * boat.speed, y: -Math.cos(rad) * boat.speed };
}

/**
 * Pair-wise boat repel to prevent overlap. Overlapping boats are always pushed
 * apart; they lose speed in proportion to how fast they close on each other,
 * the full slow-down from FULL_BUMP_CLOSING_KN. Boats that merely touch or
 * move apart keep their speed: a flat slow-down on every contact pinned two
 * boats grinding side by side at about 0.1 kn for good, head to wind with no
 * way out (DECISIONS.md ADR-0004). Finished boats have left the course and do
 * not collide, so a boat parked past the finish line blocks no one.
 */
export function resolveCollisions(boats: RaceBoat[], dt = 1 / 20): void {
  for (let i = 0; i < boats.length; i++) {
    for (let j = i + 1; j < boats.length; j++) {
      const a = boats[i];
      const b = boats[j];
      if (a.lapDone >= 2 || b.lapDone >= 2) continue;
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
        const va = groundVelocity(a), vb = groundVelocity(b);
        const closing = (va.x - vb.x) * nx + (va.y - vb.y) * ny;
        const share = Math.max(0, Math.min(1, closing / FULL_BUMP_CLOSING_KN));
        if (share > 0) {
          const damp = Math.exp(-1.67 * dt * share);
          a.speed *= damp;
          b.speed *= damp;
        }
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
 * The next-target hint shown to players. Bots steer with raceAutopilotTurn,
 * which lays out its own paths through the same gates. */
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

// ---------------------------------------------------------------------------
// Bot autopilot
// ---------------------------------------------------------------------------
//
// Bots steer by tracking simple paths laid out from the course itself, so the
// same code serves the web course and the native app's projected one:
//
// - start: from below the line, beat up its middle. Over it too early, sail a
//   loop beside the line whose rising side crosses the middle of the line;
// - windward mark: a counter-clockwise "stadium" whose top is a circle round
//   the mark through all three rounding gates. The engine's full-rudder turning
//   radius is about 21 units per knot, 115-145 at racing speed, while a gate is
//   70 long, so on the climb up the east leg the bot sheds speed by pointing
//   close to the wind and sails the last stretch straight up the leg, then
//   loops over the mark. A missed gate needs no special case: the boat goes
//   round again, down the west leg, round the bottom and back up;
// - finish: run down a lane of the finish line, spread by boat id so a boat
//   parked on the line after finishing does not block the next one. After a
//   miss, loop back above the line and come down again.
//
// Two engine traps shape the steering. A boat stopped head to wind can neither
// steer (no rudder authority at rest) nor gather way, so the bot never tacks
// while slow and bears away when it is slow near the wind. And the
// close-hauled side is chosen with hysteresis: a boat pointing downwind at an
// upwind target commits to one tack instead of weaving between both.

/** Per-boat autopilot memory. It lives on the boat between calls. */
export interface AutopilotState {
  /** lapDone when last seen; a boat reset for a new race starts afresh. */
  lap: number;
  /** Committed close-hauled side: 1 = port tack (wind + CH), -1 = starboard. */
  tack?: 1 | -1;
  /** Shedding speed on the climb to the windward mark. */
  shed?: boolean;
  /** Past the top of the rounding loop, heading down its west leg. */
  down?: boolean;
  /** Loop sailed to get back below the start line after crossing early. */
  dip?: { ccw: boolean; x: number; r: number };
  /** Loop sailed to come back to the finish line after missing it. */
  finishLoop?: { ccw: boolean };
}

const AUTOPILOT = {
  closeHauled: 45,       // true wind angle sailed upwind, deg
  lookahead: 40,         // path-following lookahead, world units
  loopRadius: 80,        // rounding loop: passes G0 72 east, G1 45 north, G2 72 west of the mark
  loopDrop: 35,          // rounding loop centre below the mark
  legMax: 450,           // stadium legs: at most this long...
  legShare: 0.55,        // ...and at most this share of the mark-to-line distance
  finalMax: 150,         // last stretch of the climb sailed straight up the leg...
  finalShare: 0.35,      // ...capped at this share of the mark-to-line distance
  radiusGrowth: 1.15,    // turning circle grows as the boat bears away and speeds up
  shedHysteresis: 0.6,   // kn below the target speed before sailing freely again
  shedMin: 2.5,          // kn: too slow to keep pointing up the last stretch
  featherSlow: 12,       // deg off the wind while shedding speed near the target
  featherFast: 3,        // deg off the wind while well above it
  fastMargin: 0.8,       // kn above the target speed that counts as "well above"
  featherGain: 0.4,      // extra degrees per unit off the leg, to get back onto it
  featherMax: 24,
  featherBand: 12,       // units off the leg before switching the feathering side
  band: { top: 12, slope: 0.25, max: 60 }, // tacking corridor half-width on the climb
  startBand: 40,         // tacking corridor half-width below the start line
  loopBand: 30,          // tacking corridor half-width on the start and finish loops
  tackMinSpeed: 2,       // kn: no tack below this
  stallSpeed: 2.2,       // kn: below this, bear away from close to the wind (a bumped boat must not stop head to wind)
  dip: { drop: 30, minR: 70, maxR: 100, slack: 25 },
  finishLoop: { drop: 50, radius: 80 },
  finishLanes: 7,
  finishLaneMargin: 25,  // units kept clear of each end of the finish line
} as const;

/** Full-rudder turning radius per knot (stepBoat turns TURN_RATE deg/s at full authority). */
const RADIUS_PER_KNOT = UNITS_PER_KNOT_SECOND / deg2rad(TURN_RATE);

/** Direction of travel and signed distance to the right of the path. */
interface PathFix { tangent: number; right: number }

function onCircle(p: Vec2, c: Vec2, r: number, ccw: boolean): PathFix {
  const phi = bearing(c, p), d = distance(p, c);
  return ccw ? { tangent: normalizeAngle(phi - 90), right: d - r } : { tangent: normalizeAngle(phi + 90), right: r - d };
}

function onVertical(p: Vec2, x: number, north: boolean): PathFix {
  return north ? { tangent: 0, right: p.x - x } : { tangent: 180, right: x - p.x };
}

/** A stable offset in [-1, 1] per boat id, for spreading boats over lanes. */
function laneOf(id: string, lanes: number): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) h = ((h * 33) ^ id.charCodeAt(i)) >>> 0;
  return ((h % lanes) / (lanes - 1)) * 2 - 1;
}

/** Turn command (-1..1) that sails the boat round the course. */
export function raceAutopilotTurn(boat: RaceBoat, course: RaceCourse, windDir: number): number {
  const A = AUTOPILOT, p = boat.pos;
  if (!boat.autopilot || boat.lapDone < boat.autopilot.lap) boat.autopilot = { lap: boat.lapDone };
  const st = boat.autopilot;
  st.lap = boat.lapDone;
  // The native app does not report speed to the autopilot (always 0): treat
  // 0 as unknown and skip the speed-based parts, its boats turn tightly anyway.
  const v = boat.speed > 0.05 ? boat.speed : 0;
  const line = boat.lapDone > 0 ? course.finishLine : course.startLine;
  const cx = (line.a.x + line.b.x) / 2, ly = line.a.y, half = Math.abs(line.b.x - line.a.x) / 2;
  const mark = course.marks[0].pos;
  const targetSpeed = A.loopRadius / (RADIUS_PER_KNOT * A.radiusGrowth);

  let fix: PathFix;
  let band = 0;              // > 0: tack up this corridor along an upwind path
  let forceTack: 0 | 1 | -1 = 0;
  let freeOverTop = false;   // follow the loop over the mark even through the wind

  if (!boat.started) {
    const below = p.y > ly;
    if (below && Math.abs(p.x - cx) < half - 10 && !st.dip) {
      fix = onVertical(p, cx, true);
      band = A.startBand;
    } else {
      if (!st.dip) {
        // Bear away to the side the boat is already turning to: clockwise from
        // port tack, counter-clockwise from starboard. The loop is as tight as
        // the boat can turn now and sits where its own turn would put it,
        // clamped so the rising side crosses the line near its middle.
        const twa = calcTWA(boat.heading, windDir);
        const ccw = Math.abs(twa) > 150 ? p.x < cx : twa < 0;
        const r = v > 0 ? Math.max(A.dip.minR, Math.min(A.dip.maxR, RADIUS_PER_KNOT * Math.max(v, 3))) : A.dip.maxR;
        st.dip = { ccw, r, x: p.x + (ccw ? -1 : 1) * r * Math.abs(Math.cos(deg2rad(boat.heading))) };
      }
      const { ccw, r } = st.dip, side = ccw ? -1 : 1;
      const w = Math.sqrt(Math.max(0, r * r - A.dip.drop * A.dip.drop));
      const x = Math.max(cx + side * w - A.dip.slack, Math.min(cx + side * w + A.dip.slack, st.dip.x));
      fix = onCircle(p, { x, y: ly + A.dip.drop }, r, ccw);
      if (below) { band = A.loopBand; forceTack = ccw ? -1 : 1; }
    }
  } else if (boat.lapDone === 0) {
    st.dip = undefined;
    const c = { x: mark.x, y: mark.y + A.loopDrop }, r = A.loopRadius;
    const room = Math.max(0, course.startLine.a.y - c.y);
    const leg = Math.min(A.legMax, A.legShare * room);
    if (!st.down && p.y <= c.y && p.x < c.x - r / 2) st.down = true;
    else if (st.down && p.y >= c.y + leg && p.x > c.x) st.down = false;
    const climbing = !st.down && p.y > c.y;
    if (!st.down) fix = p.y <= c.y ? onCircle(p, c, r, true) : onVertical(p, c.x + r, true);
    else fix = p.y >= c.y + leg ? onCircle(p, { x: c.x, y: c.y + leg }, r, true) : onVertical(p, c.x - r, false);
    if (climbing) band = Math.min(A.band.max, Math.max(A.band.top, A.band.slope * (p.y - c.y)));
    if (!st.down && p.y <= c.y) freeOverTop = true;
    const toTop = p.y - c.y;
    if (climbing && toTop < Math.min(A.finalMax, A.finalShare * room)) st.shed = v === 0 || v > A.shedMin;
    else if (climbing && v > 0 && toTop < leg) {
      if (v > targetSpeed) st.shed = true;
      else if (v < targetSpeed - A.shedHysteresis) st.shed = false;
    } else st.shed = false;
  } else {
    if (p.y > ly + 5 && !st.finishLoop) st.finishLoop = { ccw: p.x >= cx };
    if (st.finishLoop) {
      fix = onCircle(p, { x: cx, y: ly - A.finishLoop.drop }, A.finishLoop.radius, st.finishLoop.ccw);
      band = A.loopBand;
    } else fix = onVertical(p, cx + laneOf(boat.id, A.finishLanes) * Math.max(0, half - A.finishLaneMargin), false);
  }

  const slow = v > 0 && v < A.tackMinSpeed;
  if (st.tack === undefined) st.tack = calcTWA(boat.heading, windDir) >= 0 ? 1 : -1;
  const tackTo = (side: 1 | -1) => { if (!slow) st.tack = side; };
  let desired = normalizeAngle(fix.tangent - rad2deg(Math.atan2(fix.right, A.lookahead)));
  if (st.shed) {
    // Point a few degrees off the wind, changing side to hold the leg; further
    // off it, sail a little freer to get back; well above the target speed,
    // point almost into the wind, which sheds speed fastest.
    if (fix.right > A.featherBand) tackTo(-1); else if (fix.right < -A.featherBand) tackTo(1);
    const off = Math.max(0, st.tack === -1 ? fix.right : -fix.right);
    const base = v > targetSpeed + A.fastMargin ? A.featherFast : A.featherSlow;
    desired = normalizeAngle(windDir + st.tack * Math.min(A.featherMax, base + A.featherGain * off));
  } else {
    const twa = calcTWA(desired, windDir);
    if (band > 0 && Math.abs(calcTWA(fix.tangent, windDir)) < A.closeHauled + 5) {
      if (forceTack) tackTo(forceTack);
      else if (fix.right > band) tackTo(-1);
      else if (fix.right < -band) tackTo(1);
      desired = normalizeAngle(windDir + st.tack * A.closeHauled);
    } else if (Math.abs(twa) < A.closeHauled && !freeOverTop) {
      if (twa > A.closeHauled - 5 && st.tack === -1) tackTo(1);
      else if (twa < -(A.closeHauled - 5) && st.tack === 1) tackTo(-1);
      desired = normalizeAngle(windDir + st.tack * A.closeHauled);
    } else if (Math.abs(twa) >= A.closeHauled) tackTo(twa >= 0 ? 1 : -1);
  }
  if (v > 0 && v < A.stallSpeed && Math.abs(calcTWA(desired, windDir)) < 25) desired = normalizeAngle(windDir + st.tack * A.closeHauled);
  return Math.max(-1, Math.min(1, angleDiff(boat.heading, desired) / 12));
}
