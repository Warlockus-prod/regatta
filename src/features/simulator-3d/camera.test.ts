import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { fitCamera, fitSailCamera } from "./camera";

describe("responsive yacht framing", () => {
  for (const aspect of [0.65, 390 / 320, 16 / 9, 2.4]) {
    it(`keeps the full mast and hull inside the frame at aspect ${aspect}`, () => {
      const min = new Vector3(-7, -2.2, -2.5);
      const max = new Vector3(7, 20.5, 2.5);
      const fit = fitCamera(min, max, new Vector3(-0.8, 0.2, 1), aspect, 42);
      const camera = new PerspectiveCamera(42, aspect, 0.1, 400);
      camera.position.copy(fit.position); camera.lookAt(fit.target); camera.updateMatrixWorld();
      for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) {
        const projected = new Vector3(x, y, z).project(camera);
        expect(Math.abs(projected.x)).toBeLessThan(1);
        expect(Math.abs(projected.y)).toBeLessThan(1);
        expect(projected.z).toBeLessThan(1);
      }
    });
  }
  it("supports a top view without a degenerate camera basis", () => {
    const result = fitCamera(new Vector3(-7, -2, -2), new Vector3(7, 20, 2), new Vector3(0, 1, 0), 1, 35);
    expect(result.position.toArray().every(Number.isFinite)).toBe(true);
    expect(result.position.y).toBeGreaterThan(20);
  });
});


describe("sail inspection cameras", () => {
  it("mirrors both target and viewing side when the tack changes", () => {
    for (const kind of ["main", "jib"] as const) for (const aspect of [.65, 2]) {
      const state = { boomAngle: 52, jibAngle: 40, camber: .7, twist: .35, luff: 0, reef: 0, rudderAngle: 0, heel: 0 };
      const a = fitSailCamera(kind, state, aspect);
      const b = fitSailCamera(kind, { ...state, boomAngle: -52, jibAngle: -40 }, aspect);
      for (const key of ["target", "position"] as const) {
        expect(a[key].x).toBeCloseTo(b[key].x);
        expect(a[key].y).toBeCloseTo(b[key].y);
        expect(a[key].z).toBeCloseTo(-b[key].z);
        expect(a[key].toArray().every(Number.isFinite)).toBe(true);
      }
    }
  });
});
