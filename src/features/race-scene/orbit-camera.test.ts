import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { fitYachtCamera } from "@/features/simulator-3d/camera";
import { NEUTRAL_YACHT } from "@/features/simulator-3d/types";
import { chaseCameraPose, createChasePose, raceCameraPose } from "./orbit-camera";
import { CHASE_RETURN_DELAY, CHASE_START, chaseStep, type ChaseState } from "./camera";

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
