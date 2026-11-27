// The Manoeuvres harbour in 3D: pure mapping from the exercise and the run to
// what the three.js view draws (Harbour3D.tsx). No three.js and no React, so
// it is tested on its own. The view reads the run and never changes it.
//
// Axes: the exercise is metres x east and y north (src/data/manoeuvres.ts);
// the 3D world is X east, Y up and Z south (src/features/simulator-3d), so a
// point (x, y) of the harbour stands at (x, -y) on the water.

import { OUR_YACHT, toWorld, type Vec2 } from "@/lib/harbour-physics";
import { yachtFromSession } from "@/features/sailing-lab/runtime/presentation";
import { NEUTRAL_YACHT, type YachtState } from "@/features/simulator-3d/types";
import type { ManoeuvreExercise, SceneObstacle } from "@/data/manoeuvres";
import { focusPoint } from "./scene";
import type { RunInput, RunState } from "./runner";

const DEG = Math.PI / 180;

/** A harbour point on the 3D water plane. */
export const toScene = (p: Vec2): { x: number; z: number } => ({ x: p[0], z: -p[1] });

/** The yacht GLB is drawn at its real length: our hull and every moored hull scale from it. */
export const MODEL_LOA = OUR_YACHT.loa;

/**
 * Share of the open-sea swell (src/features/simulator-3d/ocean/waves.ts).
 * Inside a marina the water is nearly flat, so a hull rides a few centimetres
 * and never bobs through a pontoon; the sail exercises are out on open water.
 */
export function swellOf(exercise: ManoeuvreExercise): number {
  return exercise.track === "sail" ? 1 : 0.12;
}

/** Heights above the water, metres: what a skipper sees from the cockpit. */
export const HEIGHTS = {
  pontoon: 0.45,
  quay: 1.3,
  wall: 1.3,
  pile: 3.2,
  /** Dashed goal lines float this high, clear of the harbour ripple. */
  overlay: 0.12,
  /** Where our mooring lines are made fast on deck. */
  cleat: 1.55,
} as const;

/**
 * The yacht pose for one frame of the run. Under engine the sails are stowed
 * (main down, jib rolled) and the rudder shows the real blade angle of the
 * harbour model; under sail the shared session's rig, as in the 3D trainer.
 */
export function yachtFromRun(exercise: ManoeuvreExercise, run: RunState, input: RunInput): YachtState {
  const travel = toScene([run.pose.x, run.pose.y]);
  if (run.sail) {
    return { ...yachtFromSession(run.sail.session), heading: run.pose.heading, travel, speedKn: Math.abs(run.speedKn),
      rudderAngle: Math.max(-35, Math.min(35, input.helm * 35)) };
  }
  const h = run.harbour;
  // A turning boat leans a little out of the turn; at harbour speed only a degree or two.
  const heel = h ? Math.max(-3, Math.min(3, -h.r * h.u * 25)) : 0;
  return {
    ...NEUTRAL_YACHT,
    mainHoisted: false,
    boomAngle: 0,
    jibAngle: 0,
    luff: 0,
    fill: 0,
    rigResolved: true,
    rudderAngle: h ? h.rudder / DEG : input.helm * 35,
    heel,
    heading: run.pose.heading,
    speedKn: Math.abs(run.speedKn),
    wind: { from: exercise.wind.direction, knots: exercise.wind.speed },
    travel,
    jibShape: { camber: 0, twist: 0, luff: 0, fill: 0, furl: 1 },
  };
}

export interface CameraPose {
  position: [number, number, number];
  target: [number, number, number];
}

export type HarbourCameraMode = "harbour" | "stern";
export const HARBOUR_CAMERAS: readonly HarbourCameraMode[] = ["harbour", "stern"];

/**
 * The harbour view: a low drone shot that keeps the boat and what it is
 * heading for in frame, from the south by default so north stays up as on
 * the diagram. Closer than the plan's framing (frameCamera): the width it
 * keeps is the boat, the target and a hull length around them. `azimuth`
 * turns the camera round the framed point (degrees, 0 = from the south,
 * positive clockwise seen from above), `zoom` scales the distance.
 */
export function harbourCamera(exercise: ManoeuvreExercise, run: RunState, aspect: number, fovDeg: number, azimuth = 0, zoom = 1): CameraPose {
  const focus = focusPoint(exercise, run);
  const boat: Vec2 = [run.pose.x, run.pose.y];
  const middle = toScene([(boat[0] + focus[0]) / 2, (boat[1] + focus[1]) / 2]);
  const span = Math.max(30, Math.hypot(focus[0] - boat[0], focus[1] - boat[1]) * 1.1 + 2 * HULL_MARGIN);
  // Width `span` at the framed point; vertical field of view gives the horizontal one.
  const hfov = 2 * Math.atan(Math.tan(fovDeg * DEG / 2) * Math.max(0.5, aspect));
  // Low enough to see the shore over the harbour; the framed width sits at the middle of the view.
  const elevation = 27 * DEG;
  const distance = Math.max(18, (span / 2) / Math.tan(hfov / 2) * 0.98) * zoom;
  const a = azimuth * DEG;
  const flat = distance * Math.cos(elevation);
  // Looking a little past the framed point drops the harbour into the middle
  // of the picture and leaves the shore and the sky above it.
  const past = span * 0.3;
  return {
    position: [middle.x - Math.sin(a) * flat, distance * Math.sin(elevation), middle.z + Math.cos(a) * flat],
    target: [middle.x + Math.sin(a) * past, 0, middle.z - Math.cos(a) * past],
  };
}

/** Room kept round the boat and the target in the harbour view, metres. */
const HULL_MARGIN = 9;

/**
 * Behind the stern and above it, looking past the bow, as from a helper on
 * the pushpit. `yaw` is the smoothed heading (degrees) the camera follows.
 */
export function sternCamera(run: RunState, yaw: number, zoom = 1): CameraPose {
  const p = toScene([run.pose.x, run.pose.y]);
  const fx = Math.sin(yaw * DEG), fz = -Math.cos(yaw * DEG);
  const back = 21 * zoom, up = 8.5 * zoom, ahead = 9;
  return {
    position: [p.x - fx * back, up, p.z - fz * back],
    target: [p.x + fx * ahead, 0.8, p.z + fz * ahead],
  };
}

/** Exponential approach of an angle in degrees, the short way round. */
export function easeAngle(from: number, to: number, k: number): number {
  const d = ((to - from + 540) % 360) - 180;
  return from + d * k;
}

export interface Dash { x: number; z: number; yaw: number; length: number }

/**
 * Dashes along a path on the water (a berth outline, a zone, a gate line, the
 * plan), each `dash` metres long with `gap` between: the dashed lines of the
 * diagram, laid on the water.
 */
export function dashesAlong(points: readonly Vec2[], closed: boolean, dash = 1.2, gap = 0.8): Dash[] {
  const out: Dash[] = [];
  const path = closed && points.length > 2 ? [...points, points[0]] : [...points];
  let carry = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const a = toScene(path[i]), b = toScene(path[i + 1]);
    const length = Math.hypot(b.x - a.x, b.z - a.z);
    if (length < 1e-6) continue;
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);
    for (let s = carry; s < length; s += dash + gap) {
      const e = Math.min(length, s + dash);
      const mid = (s + e) / 2;
      out.push({ x: a.x + (b.x - a.x) * mid / length, z: a.z + (b.z - a.z) * mid / length, yaw, length: e - s });
      carry = s + dash + gap - length;
    }
  }
  return out;
}

/** A circle as a closed polygon, for the station circle. */
export function circlePoints(cx: number, cy: number, r: number, segments = 48): Vec2[] {
  return Array.from({ length: segments }, (_, i) => {
    const a = (i / segments) * Math.PI * 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Vec2;
  });
}

/** The berth outline: our hull where the exercise wants it. */
export function berthOutline(goal: { x: number; y: number; heading: number }): Vec2[] {
  return OUR_YACHT.hull.map((p) => toWorld(goal, p));
}

/**
 * Where to stand the bollards of a quay: along the face nearest the start
 * (the side the boat comes from), one every 6 m, half a metre in from the edge.
 */
export function bollards(o: SceneObstacle, from: Vec2): Vec2[] {
  if (o.shape.type !== "poly" || (o.kind !== "quay" && o.kind !== "wall")) return [];
  const pts = o.shape.points;
  const c: Vec2 = [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
  let best = -1, bestD = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const d = Math.hypot((a[0] + b[0]) / 2 - from[0], (a[1] + b[1]) / 2 - from[1]);
    if (d < bestD) { bestD = d; best = i; }
  }
  const a = pts[best], b = pts[(best + 1) % pts.length];
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.floor(length / 6);
  if (!n) return [];
  // The edge normal that points into the quay.
  let nx = -(b[1] - a[1]) / length, ny = (b[0] - a[0]) / length;
  if (nx * (c[0] - a[0]) + ny * (c[1] - a[1]) < 0) { nx = -nx; ny = -ny; }
  const out: Vec2[] = [];
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n;
    out.push([a[0] + (b[0] - a[0]) * t + nx * 0.5, a[1] + (b[1] - a[1]) * t + ny * 0.5]);
  }
  return out;
}

/** The point the guidance beacon stands on: the buoy, the person, the next gate or the mark. Null for a berth, a zone or a turn, which are drawn on the water. */
export function beaconPoint(exercise: ManoeuvreExercise, run: RunState): Vec2 | null {
  const goal = exercise.target;
  if (goal.type === "pickup" || goal.type === "gates" || goal.type === "station") return focusPoint(exercise, run);
  return null;
}

/** Where the harbour is: the middle of the exercise's visible area, for the shore around it. */
export function harbourCentre(exercise: ManoeuvreExercise): Vec2 {
  const [minX, minY, maxX, maxY] = exercise.bounds;
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

/**
 * A moored hull at `at` stands in the line of sight from the camera to our
 * boat, low enough for its rig to cover it: the view hides it until it is
 * clear, like a rival close astern in the 3D race.
 */
export function blocksView(camera: { x: number; y: number; z: number }, ours: { x: number; z: number }, at: { x: number; z: number }): boolean {
  const dx = ours.x - camera.x, dz = ours.z - camera.z;
  const len2 = dx * dx + dz * dz;
  if (len2 < 1) return false;
  const t = ((at.x - camera.x) * dx + (at.z - camera.z) * dz) / len2;
  if (t <= 0 || t >= 0.92) return false;
  const side = Math.abs((at.x - camera.x) * dz - (at.z - camera.z) * dx) / Math.sqrt(len2);
  // From high above, the sight line clears a masthead (about 19 m) until close to our boat.
  const sightHeight = camera.y * (1 - t) + 2 * t;
  return side < 5 && sightHeight < 19;
}
