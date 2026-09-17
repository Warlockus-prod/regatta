import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createTrimRig } from "./trim-rig";
import { sailPoint } from "../../simulator-3d/sails/geometry";
import { projectSailPoint } from "../../simulator-v3/ui/sail-projection";

describe("the same trim geometry in 2D and 3D", () => {
  it("keeps the synthetic soft vang, including displayed slack, above the measured cabin roof", () => {
    const model = new THREE.Group(), overlay = createTrimRig(model);
    for (const yaw of [-85, -45, 0, 45, 85]) for (const rise of [0, 6, 12]) {
      overlay.update({ pose: { yaw, rise }, traveler: 0, slack: 0, vangSlack: 1 });
      const vang = model.getObjectByName("Teaching_SoftVang") as THREE.LineSegments;
      const vertices = vang.geometry.getAttribute("position");
      for (let i = 0; i < vertices.count; i++) expect(vertices.getY(i)).toBeGreaterThan(2.18);
    }
    overlay.dispose();
    expect(model.children).toHaveLength(0);
  });
  it("pitches only the boom and restores its original parent on disposal", () => {
    const model = new THREE.Group(), main = new THREE.Group(), boom = new THREE.Group();
    main.name = "MainRig"; boom.name = "Boom"; main.position.set(.3, 2.74, 0);
    boom.position.set(-.3, -2.74, 0); main.add(boom); model.add(main);
    const before = boom.position.clone();
    const overlay = createTrimRig(model);
    overlay.update({ pose: { yaw: -20, rise: 6 }, traveler: .4, slack: 0 });
    expect(main.rotation.z).toBe(0);
    expect(boom.parent?.rotation.z).toBeCloseTo(-6 * Math.PI / 180);
    expect(model.getObjectByName("Teaching_MainTackle")?.visible).toBe(true);
    overlay.update(undefined);
    expect(boom.parent?.rotation.z).toBeCloseTo(0, 12);
    overlay.dispose();
    expect(boom.parent).toBe(main);
    expect(boom.position).toEqual(before);
    expect(model.getObjectByName("Teaching_MainTackle")).toBeUndefined();
  });
  it("keeps the head and luff fixed while raising the clew", () => {
    const shape = { camber: .6, twist: .4, luff: 0, reef: 0, side: -1, time: 0 };
    const at = (u: number, v: number, boomRise: number) => sailPoint("main", u, v, { ...shape, boomRise }, new THREE.Vector3());
    expect(at(0, .5, 10)).toEqual(at(0, .5, 0));
    expect(at(1, 1, 10).distanceTo(at(1, 1, 0))).toBeLessThan(1e-12);
    expect(at(1, 0, 10).y).toBeGreaterThan(at(1, 0, 0).y);
  });
  it("projects the rendered main leech with the same rise and section twist on both tacks", () => {
    for (const side of [-1, 1]) for (const rise of [0, 5, 12]) for (const v of [0, .25, .5, .75, 1]) {
      const point = sailPoint("main", 1, v, { camber: .6, twist: .7, luff: 0, reef: 0, side, time: 0, boomRise: rise }, new THREE.Vector3());
      point.applyAxisAngle(new THREE.Vector3(0, 1, 0), side * 25 * Math.PI / 180).add(new THREE.Vector3(.3, 2.74, 0));
      for (const rear of [true, false]) {
        const flat = projectSailPoint("main", 1, v, 25, side, 0, 0, rear, .7, rise);
        expect(flat.x).toBeCloseTo((rear ? point.z : point.x) * 16, 8);
        expect(flat.y).toBeCloseTo(-point.y * 16, 8);
      }
    }
  });
});
