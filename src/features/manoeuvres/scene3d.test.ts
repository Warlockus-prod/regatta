import { describe, expect, it } from "vitest";
import { MANOEUVRES, manoeuvreById } from "@/data/manoeuvres";
import { createRun, stepRun, type RunInput } from "./runner";
import { focusPoint } from "./scene";
import {
  beaconPoint, berthOutline, blocksView, bollards, dashesAlong, easeAngle, harbourCamera, sternCamera, swellOf, toScene, yachtFromRun,
} from "./scene3d";

// Contract: the 3D harbour shows the run it is given and nothing else. The
// yacht stands where the run puts it (x east, y north on the water, 3D Z
// south), with the sails stowed under engine and set under sail; the harbour
// camera keeps the boat and its target in view at the start of every
// exercise; the stern camera stands behind the stern; moored boats that would
// hide our boat from the camera step aside.

const NEUTRAL: RunInput = { helm: 0, throttle: 0, sheets: "trim" };
const FOV = 45;

/** Is a world point inside the view of a camera at `position` looking at `target`? */
function inView(position: [number, number, number], target: [number, number, number], point: [number, number, number], aspect: number, fov = FOV) {
  const f = [target[0] - position[0], target[1] - position[1], target[2] - position[2]];
  const fl = Math.hypot(...f); f.forEach((v, i) => { f[i] = v / fl; });
  // right = f x up, up' = right x f
  const r = [-f[2], 0, f[0]]; const rl = Math.hypot(...r); r.forEach((v, i) => { r[i] = v / rl; });
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  const d = [point[0] - position[0], point[1] - position[1], point[2] - position[2]];
  const z = d[0] * f[0] + d[1] * f[1] + d[2] * f[2];
  if (z <= 0) return false;
  const x = (d[0] * r[0] + d[1] * r[1] + d[2] * r[2]) / z, y = (d[0] * u[0] + d[1] * u[1] + d[2] * u[2]) / z;
  const t = Math.tan((fov * Math.PI) / 360);
  return Math.abs(y) <= t && Math.abs(x) <= t * aspect;
}

describe("3D harbour mapping", () => {
  it("puts a harbour point on the water with north away from the default camera", () => {
    expect(toScene([12, 5])).toEqual({ x: 12, z: -5 });
  });

  it("stows the sails under engine and shows the real rudder blade", () => {
    const ex = manoeuvreById("alongside-onshore")!;
    let run = createRun(ex);
    for (let i = 0; i < 60; i++) run = stepRun(ex, run, { helm: 1, throttle: 0.5, sheets: "trim" });
    const y = yachtFromRun(ex, run, { helm: 1, throttle: 0.5, sheets: "trim" });
    expect(y.mainHoisted).toBe(false);
    expect(y.jibShape?.furl).toBe(1);
    expect(y.heading).toBeCloseTo(run.pose.heading, 6);
    expect(y.travel).toEqual({ x: run.pose.x, z: -run.pose.y });
    // The blade follows the wheel at its own rate: turned to starboard, not yet hard over.
    expect(y.rudderAngle).toBeGreaterThan(5);
    expect(y.rudderAngle).toBeLessThanOrEqual(35);
  });

  it("sets the sails under sail, from the shared session", () => {
    const ex = manoeuvreById("gates-sail")!;
    let run = createRun(ex);
    for (let i = 0; i < 90; i++) run = stepRun(ex, run, NEUTRAL);
    const y = yachtFromRun(ex, run, NEUTRAL);
    expect(y.mainHoisted).not.toBe(false);
    expect(Math.abs(y.boomAngle)).toBeGreaterThan(5);
    expect(y.travel).toEqual({ x: run.pose.x, z: -run.pose.y });
  });

  it("keeps the marina water nearly flat and the open water as the trainer's", () => {
    for (const ex of MANOEUVRES) expect(swellOf(ex)).toBe(ex.track === "engine" ? 0.12 : 1);
  });
});

describe("cameras", () => {
  for (const aspect of [1.2, 390 / 300]) {
    it(`the harbour view frames the boat and its target at the start of every exercise (aspect ${aspect.toFixed(2)})`, () => {
      for (const ex of MANOEUVRES) {
        const run = createRun(ex);
        const cam = harbourCamera(ex, run, aspect, FOV);
        const boat = toScene([run.pose.x, run.pose.y]), focus = toScene(focusPoint(ex, run));
        expect(inView(cam.position, cam.target, [boat.x, 1, boat.z], aspect), `${ex.id} boat`).toBe(true);
        expect(inView(cam.position, cam.target, [focus.x, 0.5, focus.z], aspect), `${ex.id} target`).toBe(true);
        expect(cam.position[1], `${ex.id} above the water`).toBeGreaterThan(8);
      }
    });
  }

  it("turning the harbour view keeps the framed point and moves the camera round it", () => {
    const ex = manoeuvreById("stern-to")!, run = createRun(ex);
    const a = harbourCamera(ex, run, 1.2, FOV, 0), b = harbourCamera(ex, run, 1.2, FOV, 90);
    // From the south by default, from the west a quarter turn later.
    expect(a.position[2]).toBeGreaterThan(a.target[2]);
    expect(b.position[0]).toBeLessThan(b.target[0]);
    const ra = Math.hypot(a.position[0] - a.target[0], a.position[2] - a.target[2]);
    const rb = Math.hypot(b.position[0] - b.target[0], b.position[2] - b.target[2]);
    expect(rb).toBeCloseTo(ra, 0);
    expect(harbourCamera(ex, run, 1.2, FOV, 0, 2).position[1]).toBeCloseTo(a.position[1] * 2, 3);
  });

  it("the stern view stands behind the stern and looks past the bow", () => {
    const ex = manoeuvreById("alongside-onshore")!, run = createRun(ex); // heading east
    const cam = sternCamera(run, run.pose.heading);
    const boat = toScene([run.pose.x, run.pose.y]);
    expect(cam.position[0]).toBeLessThan(boat.x - 15);
    expect(cam.target[0]).toBeGreaterThan(boat.x);
    expect(Math.abs(cam.position[2] - boat.z)).toBeLessThan(1e-9);
  });

  it("eases the camera heading the short way round north", () => {
    expect(easeAngle(350, 10, 0.5)).toBeCloseTo(360, 6);
    expect(easeAngle(10, 350, 1)).toBeCloseTo(-10, 6);
  });

  it("hides a moored boat between the camera and ours, not one beside or beyond", () => {
    const camera = { x: -21, y: 8.5, z: 0 }, ours = { x: 0, z: 0 };
    expect(blocksView(camera, ours, { x: -12, z: 0.5 })).toBe(true);
    expect(blocksView(camera, ours, { x: -12, z: 9 })).toBe(false);
    expect(blocksView(camera, ours, { x: 12, z: 0 })).toBe(false);
    // From high above the sight line passes over its masthead.
    expect(blocksView({ x: -21, y: 60, z: 0 }, ours, { x: -12, z: 0 })).toBe(false);
  });
});

describe("marks on the water", () => {
  it("lays dashes along the whole path, none longer than a dash", () => {
    const dashes = dashesAlong([[0, 0], [10, 0]], false, 1, 1);
    expect(dashes).toHaveLength(5);
    expect(dashes.every((d) => d.length <= 1 + 1e-9)).toBe(true);
    expect(dashes[0].x).toBeCloseTo(0.5, 6);
    // East along the water: the dash turns to +X.
    expect(dashes[0].yaw).toBeCloseTo(Math.PI / 2, 6);
    const ring = dashesAlong([[0, 0], [10, 0], [10, 10], [0, 10]], true, 1.2, 0.8);
    expect(ring.length).toBeGreaterThanOrEqual(19);
  });

  it("draws the berth as our hull at the goal pose", () => {
    const ex = manoeuvreById("stern-to")!;
    if (ex.target.type !== "berth") throw new Error("stern-to is a berth");
    const outline = berthOutline(ex.target);
    const cx = outline.reduce((s, p) => s + p[0], 0) / outline.length, cy = outline.reduce((s, p) => s + p[1], 0) / outline.length;
    expect(Math.hypot(cx - ex.target.x, cy - ex.target.y)).toBeLessThan(1.5);
    const ys = outline.map((p) => p[1]);
    // Heading south: the hull lies north-south, its length along y.
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(12);
  });

  it("stands the quay bollards on the face the boat comes from", () => {
    const ex = manoeuvreById("stern-to")!;
    const quay = ex.obstacles.find((o) => o.id === "quay")!;
    const posts = bollards(quay, [ex.start.x, ex.start.y]);
    expect(posts.length).toBeGreaterThan(10);
    // The quay face is y = 0, the water south of it.
    for (const p of posts) expect(p[1]).toBeCloseTo(0.5, 6);
    expect(bollards(ex.obstacles.find((o) => o.kind === "boat")!, [0, -30])).toEqual([]);
  });

  it("puts the guidance beacon on a buoy, a person, a gate or a mark, never on a berth", () => {
    for (const ex of MANOEUVRES) {
      const at = beaconPoint(ex, createRun(ex));
      expect(at === null, ex.id).toBe(ex.target.type === "berth" || ex.target.type === "leave" || ex.target.type === "turn");
    }
  });
});
