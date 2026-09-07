import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { FORESTAY_AXIS, sailPoint, type SailShape } from "./geometry";

const shape: SailShape = { camber: 0.7, twist: 0.9, luff: 1, reef: 0, side: 1, time: 1.7 };
describe("sail attachment geometry", () => {
  it("keeps every jib luff point on the forestay through sheet rotation and flutter", () => {
    for (const angle of [-70, -30, 0, 30, 70]) for (const v of [0, 0.2, 0.5, 0.8, 1]) {
      const point = sailPoint("jib", 0, v, shape, new THREE.Vector3());
      point.applyAxisAngle(FORESTAY_AXIS, THREE.MathUtils.degToRad(angle));
      expect(point.clone().cross(FORESTAY_AXIS).length()).toBeLessThan(1e-8);
    }
  });
  it("keeps the main luff on the mast and clew on the boom when reefed", () => {
    for (const reef of [0, 0.5, 1]) {
      const s = { ...shape, reef };
      for (const v of [0, 0.3, 0.8, 1]) {
        const point = sailPoint("main", 0, v, s, new THREE.Vector3());
        expect(point.x).toBe(0); expect(point.z).toBe(0);
      }
      const clew = sailPoint("main", 1, 0, s, new THREE.Vector3());
      expect(clew.y).toBeCloseTo(0.16);
      expect(clew.z).toBeCloseTo(0);
    }
  });
  it("mirrors draft and twist for the opposite tack", () => {
    for (const kind of ["main", "jib"] as const) {
      const a = sailPoint(kind, 0.4, 0.5, { ...shape, side: 1 }, new THREE.Vector3());
      const b = sailPoint(kind, 0.4, 0.5, { ...shape, side: -1 }, new THREE.Vector3());
      expect(a.x).toBeCloseTo(b.x); expect(a.y).toBeCloseTo(b.y); expect(a.z).toBeCloseTo(-b.z);
    }
  });
});
