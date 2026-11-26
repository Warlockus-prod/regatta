// One attempt at a manoeuvre: physics step, goal check and score. Pure, no React.
// Engine exercises use the harbour model; sail exercises reuse the shared
// sailing session (src/features/sailing-lab/runtime/session.ts) unchanged.

import {
  angleDiff, ccw, clearance, createHarbourState, HARBOUR_STEP_SECONDS, hullWorld, insideConvex, KNOT, OUR_YACHT, releaseLine,
  speedKnots, stepHarbour, toWorld, type ContactEvent, type HarbourState, type HarbourWorld, type Pose, type Vec2,
} from "@/lib/harbour-physics";
import { createInitialState, getBoatParams, trimForDrive, type Controls } from "@/lib/sailing-physics";
import { createSailingSession, stepSailingSession, type SailingSession, type SessionInput } from "@/features/sailing-lab/runtime/session";
import { engineTrimFromEase } from "@/features/sailing-lab/runtime/trim-controls";
import { SAILING_STEP_SECONDS } from "@/features/sailing-lab/runtime/fixed-clock";
import { CONTACT_MERGE_SECONDS } from "@/lib/harbour-physics/step";
import type { ManoeuvreExercise, SceneObstacle } from "@/data/manoeuvres";

export interface RunInput {
  /** Wheel in [-1, 1], positive to starboard. */
  helm: number;
  /** Lever in [-1, 1]; ignored under sail. */
  throttle: number;
  /** Under sail: sheets trimmed for drive or eased right out to lose speed. */
  sheets: "trim" | "ease";
}

interface SailPart {
  session: SailingSession;
  trim: Controls;
  nextTrim: number;
  touching: Record<string, number>;
  contacts: ContactEvent[];
}

export interface RunState {
  exerciseId: string;
  t: number;
  status: "running" | "success" | "timeout";
  pose: Pose;
  /** Signed speed through the water, knots (negative = sternway). */
  speedKn: number;
  harbour: HarbourState | null;
  sail: SailPart | null;
  progress: { hold: number; gate: number; station: number; bestStation: number };
  /** Precision at the moment of success: metres off the berth, or knots at pickup. */
  finishError: number | null;
}

const SAIL_PARAMS = getBoatParams();
const EASED = engineTrimFromEase({ mainEase: 1, jibEase: 1, reef: 0 });
const START_TRIM = engineTrimFromEase({ mainEase: 0.45, jibEase: 0.5, reef: 0 });

export const stepSeconds = (exercise: ManoeuvreExercise) => exercise.track === "sail" ? SAILING_STEP_SECONDS : HARBOUR_STEP_SECONDS;

/** Wind the boat feels at time t: steady base plus a deterministic gust pattern. */
export function windAt(exercise: ManoeuvreExercise, t: number) {
  const { speed, direction, gust } = exercise.wind;
  const wave = 0.6 * Math.sin(2 * Math.PI * t / 23) + 0.4 * Math.sin(2 * Math.PI * t / 9.7 + 1);
  return { speed: Math.max(0, speed * (1 + gust * wave)), direction: (direction + gust * 40 * Math.sin(2 * Math.PI * t / 31) + 360) % 360 };
}

export function createRun(exercise: ManoeuvreExercise): RunState {
  const { start } = exercise;
  const pose = { x: start.x, y: start.y, heading: start.heading };
  const base = { exerciseId: exercise.id, t: 0, status: "running" as const, pose, speedKn: start.speedKn,
    progress: { hold: 0, gate: 0, station: 0, bestStation: 0 }, finishError: null };
  if (exercise.track === "sail") {
    const wind = windAt(exercise, 0);
    const boat = createInitialState({ tws: wind.speed, trueWindDir: wind.direction, heading: start.heading, boatSpeed: start.speedKn });
    const trim = trimForDrive(boat, START_TRIM);
    const session = createSailingSession(boat, sailInput(exercise, 0, trim, 0), SAIL_PARAMS, 7);
    return { ...base, harbour: null, sail: { session, trim, nextTrim: 0.5, touching: {}, contacts: [] } };
  }
  const harbour = createHarbourState(pose, {
    u: start.speedKn * KNOT, gear: start.speedKn > 0 ? 1 : 0, engine: 0, lines: exercise.lines ? [...exercise.lines] : [],
  });
  return { ...base, harbour, sail: null };
}

function sailInput(exercise: ManoeuvreExercise, t: number, controls: Controls, helm: number): SessionInput {
  const wind = windAt(exercise, t);
  return { controls, steering: { mode: "helm", rudder: Math.max(-1, Math.min(1, helm)), lowSpeedAssist: true },
    wind: { speed: wind.speed, direction: wind.direction, mode: "steady" } };
}

export function contactsOf(run: RunState): ContactEvent[] {
  return run.harbour?.contacts ?? run.sail?.contacts ?? [];
}

export function castOff(run: RunState, lineId: string): RunState {
  return run.harbour ? { ...run, harbour: releaseLine(run.harbour, lineId) } : run;
}

const obstacleById = (exercise: ManoeuvreExercise, id: string) => exercise.obstacles.find(o => o.id === id);
const centre = (o: SceneObstacle): Vec2 => o.shape.type === "circle" ? [o.shape.x, o.shape.y]
  : [o.shape.points.reduce((a, p) => a + p[0], 0) / o.shape.points.length, o.shape.points.reduce((a, p) => a + p[1], 0) / o.shape.points.length];

/** What the HUD calls "to target": metres, except a turn, which is degrees. */
export function targetDistance(exercise: ManoeuvreExercise, run: RunState): { value: number; unit: "m" | "deg" } {
  const goal = exercise.target, p = run.pose;
  switch (goal.type) {
    case "berth": return { value: Math.hypot(p.x - goal.x, p.y - goal.y), unit: "m" };
    case "pickup": return { value: reachDistance(exercise, run.pose, goal.targetId, goal.at), unit: "m" };
    case "leave": {
      const zone = ccw(goal.zone), hull = hullWorld(p);
      return { value: Math.max(0, ...hull.map(q => insideConvex(zone, q) ? 0 : distanceToPolygon(zone, q))), unit: "m" };
    }
    case "turn": return { value: Math.abs(angleDiff(p.heading, goal.heading)), unit: "deg" };
    case "gates": {
      const gate = goal.gates[Math.min(run.progress.gate, goal.gates.length - 1)];
      const a = centre(obstacleById(exercise, gate[0])!), b = centre(obstacleById(exercise, gate[1])!);
      return { value: Math.hypot(p.x - (a[0] + b[0]) / 2, p.y - (a[1] + b[1]) / 2), unit: "m" };
    }
    case "station": {
      const mark = centre(obstacleById(exercise, goal.markId)!);
      return { value: Math.hypot(p.x - mark[0], p.y - mark[1]), unit: "m" };
    }
  }
}

function distanceToPolygon(poly: Vec2[], p: Vec2) {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], ex = b[0] - a[0], ey = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / (ex * ex + ey * ey || 1)));
    best = Math.min(best, Math.hypot(p[0] - a[0] - t * ex, p[1] - a[1] - t * ey));
  }
  return best;
}

function reachDistance(exercise: ManoeuvreExercise, pose: Pose, targetId: string, at: "bow" | "hull") {
  const target = obstacleById(exercise, targetId);
  if (!target || target.shape.type !== "circle") return Infinity;
  if (at === "hull") return clearance(hullWorld(pose), target.shape);
  const bow = toWorld(pose, [OUR_YACHT.loa / 2, 0]);
  return Math.max(0, Math.hypot(bow[0] - target.shape.x, bow[1] - target.shape.y) - target.shape.r);
}

const segmentsCross = (p1: Vec2, p2: Vec2, q1: Vec2, q2: Vec2) => {
  const d = (a: Vec2, b: Vec2, c: Vec2) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  return d(p1, p2, q1) * d(p1, p2, q2) < 0 && d(q1, q2, p1) * d(q1, q2, p2) < 0;
};

function stepSail(exercise: ManoeuvreExercise, sail: SailPart, input: RunInput, t: number): { sail: SailPart; pose: Pose; speedKn: number } {
  let { trim, nextTrim } = sail;
  if (input.sheets === "ease") trim = EASED;
  else if (t >= nextTrim || trim === EASED) { trim = trimForDrive(sail.session.boat, trim === EASED ? START_TRIM : trim); nextTrim = t + 0.5; }
  const session = stepSailingSession(sail.session, sailInput(exercise, t, trim, input.helm), SAIL_PARAMS);
  const pose = { x: exercise.start.x + session.position.east, y: exercise.start.y + session.position.north, heading: session.boat.heading };
  // The sailing session has no contact forces: a touched buoy is only scored.
  const hull = hullWorld(pose), touching = { ...sail.touching };
  let contacts = sail.contacts;
  const now = session.simTime;
  for (const o of exercise.obstacles) {
    if (clearance(hull, o.shape) > 0) continue;
    const last = touching[o.id];
    touching[o.id] = now;
    if (last !== undefined && now - last <= CONTACT_MERGE_SECONDS) continue;
    const speed = session.boat.boatSpeed * KNOT;
    contacts = [...contacts, { obstacleId: o.id, kind: o.kind, t: now, speed, energy: 0.5 * OUR_YACHT.massSurge * speed ** 2 }];
  }
  return { sail: { session, trim, nextTrim, touching, contacts }, pose, speedKn: session.boat.boatSpeed };
}

/** Advance one fixed step (stepSeconds) and check the goal. */
export function stepRun(exercise: ManoeuvreExercise, run: RunState, input: RunInput): RunState {
  if (run.status !== "running") return run;
  const dt = stepSeconds(exercise), t = run.t + dt, prevPose = run.pose;
  let next: RunState;
  if (run.sail) {
    const s = stepSail(exercise, run.sail, input, run.t);
    next = { ...run, t, sail: s.sail, pose: s.pose, speedKn: s.speedKn };
  } else {
    const world: HarbourWorld = { obstacles: exercise.obstacles, wind: windAt(exercise, run.t) };
    const harbour = stepHarbour(run.harbour!, { helm: input.helm, throttle: input.throttle }, world).state;
    next = { ...run, t, harbour, pose: { x: harbour.x, y: harbour.y, heading: harbour.heading }, speedKn: speedKnots(harbour) };
  }
  const goal = exercise.target, slow = (max: number) => Math.abs(next.speedKn) <= max;
  const progress = { ...next.progress };
  let done = false, finishError: number | null = null;
  switch (goal.type) {
    case "berth": {
      const off = Math.hypot(next.pose.x - goal.x, next.pose.y - goal.y);
      const inside = off <= goal.posTol && Math.abs(angleDiff(next.pose.heading, goal.heading)) <= goal.headingTol && slow(goal.maxSpeedKn);
      progress.hold = inside ? progress.hold + dt : 0;
      if (progress.hold >= goal.hold) { done = true; finishError = off; }
      break;
    }
    case "pickup": {
      const neutralOk = !goal.neutral || (next.harbour ? next.harbour.gear === 0 : true);
      if (reachDistance(exercise, next.pose, goal.targetId, goal.at) <= goal.reach && slow(goal.maxSpeedKn) && neutralOk) {
        done = true; finishError = Math.abs(next.speedKn);
      }
      break;
    }
    case "leave": {
      const zone = ccw(goal.zone);
      if (hullWorld(next.pose).every(p => insideConvex(zone, p))) done = true;
      break;
    }
    case "turn": {
      const zone = ccw(goal.zone);
      const inside = !!insideConvex(zone, [next.pose.x, next.pose.y]) && Math.abs(angleDiff(next.pose.heading, goal.heading)) <= goal.headingTol && slow(goal.maxSpeedKn);
      progress.hold = inside ? progress.hold + dt : 0;
      if (progress.hold >= goal.hold) { done = true; finishError = Math.abs(angleDiff(next.pose.heading, goal.heading)); }
      break;
    }
    case "gates": {
      const gate = goal.gates[progress.gate];
      if (gate && segmentsCross([prevPose.x, prevPose.y], [next.pose.x, next.pose.y], centre(obstacleById(exercise, gate[0])!), centre(obstacleById(exercise, gate[1])!))) progress.gate++;
      if (progress.gate >= goal.gates.length) done = true;
      break;
    }
    case "station": {
      const mark = centre(obstacleById(exercise, goal.markId)!);
      progress.station = Math.hypot(next.pose.x - mark[0], next.pose.y - mark[1]) <= goal.radius ? progress.station + dt : 0;
      progress.bestStation = Math.max(progress.bestStation, progress.station);
      if (progress.station >= goal.seconds) done = true;
      break;
    }
  }
  const status = done ? "success" : t >= exercise.criteria.timeLimit ? "timeout" : "running";
  return { ...next, progress, status, finishError };
}

export interface RunResult {
  success: boolean;
  stars: 0 | 1 | 2 | 3;
  time: number;
  /** Every touch, and the ones that cost a star (wrong obstacle or too fast). */
  touches: number;
  hits: number;
  hardestKn: number;
  finishError: number | null;
  /** What held back the next star, for the debrief. */
  missing: ("goal" | "contact" | "time" | "precision")[];
}

export function scoreRun(exercise: ManoeuvreExercise, run: RunState): RunResult {
  const contacts = contactsOf(run), { criteria } = exercise;
  const hits = contacts.filter(c => !criteria.allowed.includes(c.obstacleId) || c.speed / KNOT > criteria.gentleKn).length;
  const hardestKn = contacts.reduce((m, c) => Math.max(m, c.speed / KNOT), 0);
  const success = run.status === "success";
  const goal = exercise.target;
  const precise = run.finishError === null ? true
    : goal.type === "berth" ? run.finishError <= goal.posTol / 2
      : goal.type === "pickup" ? run.finishError <= goal.maxSpeedKn / 2
        : goal.type === "turn" ? run.finishError <= goal.headingTol / 2 : true;
  const missing: RunResult["missing"] = [];
  if (!success) missing.push("goal");
  if (hits > 0) missing.push("contact");
  if (run.t > criteria.parTime) missing.push("time");
  if (!precise) missing.push("precision");
  const stars = !success ? 0 : hits > 0 ? 1 : run.t <= criteria.parTime && precise ? 3 : 2;
  return { success, stars, time: run.t, touches: contacts.length, hits, hardestKn, finishError: run.finishError, missing };
}
