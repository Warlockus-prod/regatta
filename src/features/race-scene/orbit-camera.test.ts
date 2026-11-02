import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { fitYachtCamera } from "@/features/simulator-3d/camera";
import { NEUTRAL_YACHT } from "@/features/simulator-3d/types";
import { chaseCameraPose, createChasePose, raceCameraPose, raceViewPose } from "./orbit-camera";
import { CHASE_RETURN_DELAY, CHASE_START, RACE_VIEW, chaseStep, type ChaseState } from "./camera";

const tactical = { player: { x: 240, z: 600 }, target: { x: 240, z: 108 }, windFrom: 0 };
function projectedRig(pose: ReturnType<typeof raceCameraPose>, aspect: number, heading: number) {
  const camera = new PerspectiveCamera(pose.fov, aspect, .5, 4200);
  camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld();
  return [[0, 0, 0], [.3, 20.5, 0], [-7, 0, -2.3], [7, 0, 2.3]].map(point =>
    new Vector3(...point).applyAxisAngle(new Vector3(0, 1, 0), (90 - heading) * Math.PI / 180).project(camera));
}

describe("close 3D race camera parity", () => {
  it("uses the trainer's exact full-yacht pose and lens at phone and desktop aspects", () => {
    for (const aspect of [.65, 1.3, 2.4]) for (const heading of [0, 90, 180, 270]) {
      const state = { ...NEUTRAL_YACHT, heading, boomAngle: heading < 180 ? 35 : -35 };
      const orbit = raceCameraPose("orbit", state, aspect, tactical);
      const trainer = fitYachtCamera("whole", state, aspect);
      expect(orbit).toEqual(trainer); expect(orbit.fov).toBe(42);
      const points = projectedRig(orbit, aspect, heading);
      for (const p of points) { expect(Math.abs(p.x)).toBeLessThan(1); expect(Math.abs(p.y)).toBeLessThan(1); }
    }
  });

  it("makes the default mast materially larger than the old distant tactical view", () => {
    for (const aspect of [.65, 1.3, 2.4]) {
      const orbit = projectedRig(raceCameraPose("orbit", NEUTRAL_YACHT, aspect, tactical), aspect, 90);
      const above = projectedRig(raceCameraPose("high", NEUTRAL_YACHT, aspect, tactical), aspect, 90);
      const height = (points: Vector3[]) => Math.abs(points[1].y - points[0].y);
      expect(height(orbit)).toBeGreaterThan(height(above) * 2.5);
      expect(height(orbit)).toBeGreaterThan(1);
    }
  });

  it("keeps Behind and Above as distinct fitted presets with a perspective camera", () => {
    const orbit = raceCameraPose("orbit", NEUTRAL_YACHT, 1.3, tactical);
    const behind = raceCameraPose("stern", NEUTRAL_YACHT, 1.3, tactical);
    const above = raceCameraPose("high", NEUTRAL_YACHT, 1.3, tactical);
    expect(behind.position.distanceTo(orbit.position)).toBeGreaterThan(10);
    expect(above.position.distanceTo(above.target)).toBe(165);
    for (const pose of [orbit, behind, above]) expect([...pose.position.toArray(), ...pose.target.toArray(), pose.fov].every(Number.isFinite)).toBe(true);
  });
});

// M2-1: "Behind" is a chase camera. It stands behind the stern of the
// current course (never ahead of the bow), keeps the player's zoom, and after
// a manual orbit the per-frame blend brings the camera back behind the boat.
describe("chase camera behind the boat", () => {
  const bowOf = (heading: number) => new Vector3(Math.sin(heading * Math.PI / 180), 0, -Math.cos(heading * Math.PI / 180));
  const flat = (v: Vector3) => new Vector3(v.x, 0, v.z).normalize();

  it("stands behind the stern on every course and the Behind preset starts there", () => {
    for (const heading of [0, 45, 90, 180, 270, 333]) for (const aspect of [.46, 1.3, 2.2]) {
      const pose = chaseCameraPose(heading, aspect);
      const fromBoat = flat(pose.position.clone().sub(pose.target));
      expect(fromBoat.dot(bowOf(heading))).toBeLessThan(-0.95);
      expect(pose.position.y).toBeGreaterThan(pose.target.y);
      const preset = raceCameraPose("stern", { ...NEUTRAL_YACHT, heading, boomAngle: -30 }, aspect, tactical);
      expect(preset.position.distanceTo(pose.position)).toBeLessThan(1e-9);
      expect(preset.fov).toBe(pose.fov);
    }
  });

  it("keeps the side of the stern through a tack (no jump across) and the player's zoom", () => {
    const port = raceCameraPose("stern", { ...NEUTRAL_YACHT, heading: 90, boomAngle: 30 }, 1.3, tactical);
    const starboard = raceCameraPose("stern", { ...NEUTRAL_YACHT, heading: 90, boomAngle: -30 }, 1.3, tactical);
    expect(port.position.distanceTo(starboard.position)).toBeLessThan(1e-9);
    const fitted = chaseCameraPose(90, 1.3);
    const zoomed = chaseCameraPose(90, 1.3, 20);
    expect(zoomed.position.distanceTo(zoomed.target)).toBeCloseTo(20, 6);
    expect(flat(zoomed.position.clone().sub(zoomed.target)).dot(flat(fitted.position.clone().sub(fitted.target)))).toBeCloseTo(1, 6);
  });

  it("fills the per-frame pose in place with the same values (no allocation in the chase loop)", () => {
    const out = createChasePose();
    const { position, target } = out;
    for (const [heading, distance] of [[30, null], [210, 25]] as const) {
      const fresh = chaseCameraPose(heading, 1.3, distance);
      expect(chaseCameraPose(heading, 1.3, distance, out)).toBe(out);
      expect(out.position).toBe(position);
      expect(out.target).toBe(target);
      expect(out.position.distanceTo(fresh.position)).toBeLessThan(1e-9);
      expect(out.target.distanceTo(fresh.target)).toBeLessThan(1e-9);
      expect(out.fov).toBe(fresh.fov);
    }
  });

  it("comes back behind the boat after a manual orbit, and not before the delay", () => {
    const heading = 60;
    const goal = chaseCameraPose(heading, 1.3);
    // The player orbited round to the bow and let go.
    const position = goal.position.clone().sub(goal.target).applyAxisAngle(new Vector3(0, 1, 0), Math.PI).add(goal.target);
    const target = goal.target.clone();
    let state: ChaseState = { ...CHASE_START, yaw: heading, idle: 0 };
    const dt = 1 / 60;
    const start = position.clone();
    for (let t = 0; t < CHASE_RETURN_DELAY - 2 * dt; t += dt) {
      const step = chaseStep(state, { heading, dt, held: false, reducedMotion: false });
      state = step.state;
      position.lerp(goal.position, step.blend); target.lerp(goal.target, step.blend);
    }
    expect(position.distanceTo(start)).toBe(0);
    for (let i = 0; i < 4 * 60; i++) {
      const step = chaseStep(state, { heading, dt, held: false, reducedMotion: false });
      state = step.state;
      const pose = chaseCameraPose(state.yaw!, 1.3);
      position.lerp(pose.position, step.blend); target.lerp(pose.target, step.blend);
    }
    expect(position.distanceTo(goal.position)).toBeLessThan(0.05 * start.distanceTo(goal.position));
    expect(flat(position.clone().sub(target)).dot(bowOf(heading))).toBeLessThan(-0.95);
  });
});

// Package 8 (R-9): the race camera. The horizon sits in the top quarter and
// the deck in the lower third of the picture on a phone and a wide screen,
// the camera stands behind the stern, further back for a longer hull and at
// speed, and the mast is smaller than in the close orbit view.
describe("race camera framing", () => {
  const screenY = (pose: ReturnType<typeof raceCameraPose>, aspect: number, point: Vector3) => {
    const camera = new PerspectiveCamera(pose.fov, aspect, .5, 20000);
    camera.position.copy(pose.position); camera.lookAt(pose.target); camera.updateMatrixWorld();
    return (1 - point.clone().project(camera).y) / 2;
  };

  it("puts the horizon in the top quarter and the deck in the lower third at every course", () => {
    for (const aspect of [.7, 1.3, 2.2]) for (const heading of [0, 45, 200, 315]) {
      const pose = raceCameraPose("race", { ...NEUTRAL_YACHT, heading }, aspect, tactical, { hull: 13, speedKn: 6 });
      const bow = new Vector3(Math.sin(heading * Math.PI / 180), 0, -Math.cos(heading * Math.PI / 180));
      const horizon = screenY(pose, aspect, bow.clone().multiplyScalar(15000));
      expect(horizon).toBeCloseTo(RACE_VIEW.horizon, 1);
      expect(horizon).toBeLessThan(0.25);
      expect(screenY(pose, aspect, new Vector3(0, 2, 0))).toBeCloseTo(RACE_VIEW.boat, 2);
      const fromBoat = new Vector3(pose.position.x, 0, pose.position.z).normalize();
      expect(fromBoat.dot(bow)).toBeLessThan(-0.99);
      expect(pose.position.y).toBeGreaterThan(20.5); // above the masthead: it never hides the water ahead
    }
  });

  it("stands back by the hull length and the speed, within a cap", () => {
    const at = (hull: number, speedKn: number) => raceCameraPose("race", NEUTRAL_YACHT, .7, tactical, { hull, speedKn }).position.distanceTo(new Vector3(0, 2, 0));
    expect(at(13, 0)).toBeCloseTo(13 * 5.2, 1);
    expect(at(13, 8)).toBeGreaterThan(at(13, 0));
    expect(at(10, 4)).toBeLessThan(at(13, 4));
    expect(at(13, 80)).toBeCloseTo(13 * 7, 1);
    expect(at(Number.NaN, Number.NaN)).toBeCloseTo(13 * 5.2, 1);
  });

  it("shows the yacht smaller than the close orbit view and the follow pose matches the preset", () => {
    const aspect = .7;
    const race = projectedRig(raceCameraPose("race", NEUTRAL_YACHT, aspect, tactical), aspect, 90);
    const orbit = projectedRig(raceCameraPose("orbit", NEUTRAL_YACHT, aspect, tactical), aspect, 90);
    const height = (points: Vector3[]) => Math.abs(points[1].y - points[0].y);
    expect(height(race)).toBeLessThan(height(orbit) * 0.75);
    expect(height(race)).toBeGreaterThan(0.25);
    const preset = raceCameraPose("race", NEUTRAL_YACHT, aspect, tactical, { hull: 13, speedKn: 5 });
    const follow = raceViewPose(90, aspect, 13, 5);
    expect(follow.position.distanceTo(preset.position)).toBeLessThan(1e-9);
    expect(follow.target.distanceTo(preset.target)).toBeLessThan(1e-9);
  });
});
