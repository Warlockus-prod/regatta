import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { fitYachtCamera } from "@/features/simulator-3d/camera";
import { NEUTRAL_YACHT } from "@/features/simulator-3d/types";
import { raceCameraPose } from "./orbit-camera";

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
