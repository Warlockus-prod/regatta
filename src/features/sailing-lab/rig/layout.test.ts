import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { Matrix4, Quaternion, Vector3 } from "three";
import { RIG_PASSPORT as P, fromGlb, toGlb } from "./passport";
import { boomPoint, distance, mainsheetGeometry, mainsheetPath, riseLimitAtYaw } from "./layout";

describe("rig passport and shared line geometry", () => {
  it("matches the exported world MainRig pivot, not a nested mesh translation", () => {
    const bytes = readFileSync(P.asset);
    const glb = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    const matches: Vector3[] = [];
    function walk(index: number, parent: Matrix4) {
      const node = glb.nodes[index];
      const local = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
        new Vector3(...(node.translation ?? [0, 0, 0]) as [number, number, number]),
        new Quaternion(...(node.rotation ?? [0, 0, 0, 1]) as [number, number, number, number]),
        new Vector3(...(node.scale ?? [1, 1, 1]) as [number, number, number]));
      const world = parent.clone().multiply(local);
      if (node.name === "MainRig") matches.push(new Vector3().setFromMatrixPosition(world));
      for (const child of node.children ?? []) walk(child, world);
    }
    for (const root of glb.scenes[glb.scene ?? 0].nodes) walk(root, new Matrix4());
    expect(matches).toHaveLength(1);
    toGlb(P.mainPivot).forEach((coordinate, i) => expect(matches[0].getComponent(i)).toBeCloseTo(coordinate, 5));
  });
  it("preserves named axes and transforms the boom without moving the mast", () => {
    const p = { starboard: 2, forward: -3, up: 4 };
    expect(fromGlb(toGlb(p))).toEqual(p);
    expect(boomPoint({ yaw: 30, rise: 0 }).starboard).toBeGreaterThan(0);
    expect(boomPoint({ yaw: 30, rise: 10 }).up).toBeGreaterThan(boomPoint({ yaw: 30, rise: 0 }).up);
    expect(boomPoint({ yaw: -30, rise: 10 }, 0, 0)).toEqual(P.mainPivot);
  });
  it("uses six moving parts and returns a downward unit pull, not fake tension", () => {
    const geometry = mainsheetGeometry({ yaw: 15, rise: 3 }, 0);
    const path = mainsheetPath({ yaw: 15, rise: 3 }, 0);
    expect(path).toHaveLength(12);
    let working = 0;
    for (let i = 0; i < path.length; i += 2) working += distance(path[i], path[i + 1]);
    expect(working).toBeCloseTo(geometry.workingLength, 10);
    expect(Math.hypot(...Object.values(geometry.pull))).toBeCloseTo(1, 12);
    expect(geometry.pull.up).toBeLessThan(0);
  });
  it("distinguishes equal boom yaw with different rise, payout and pull direction", () => {
    const a = mainsheetGeometry({ yaw: -15, rise: 1 }, 0);
    const b = mainsheetGeometry({ yaw: -15, rise: 5 }, .65);
    expect(b.workingLength).toBeGreaterThan(a.workingLength);
    expect(b.boom.up).toBeGreaterThan(a.boom.up);
    expect(b.pull).not.toEqual(a.pull);
    for (const [pose, car] of [[{ yaw: -15, rise: 1 }, 0], [{ yaw: -15, rise: 5 }, .65]] as const) {
      const result = riseLimitAtYaw(pose.yaw, car, mainsheetGeometry(pose, car).workingLength);
      expect(result.feasible && result.rise).toBeCloseTo(pose.rise, 8);
    }
  });
  it("is mirrored on the other tack and monotonically increases required length with rise", () => {
    for (let yaw = -85; yaw <= 85; yaw += 5) for (let car = -.8; car <= .80001; car += .1) {
      let previous = 0;
      for (let rise = 0; rise <= 12; rise++) {
        const result = mainsheetGeometry({ yaw, rise }, car);
        expect(result.workingLength).toBeGreaterThan(previous);
        expect(result.workingLength).toBeCloseTo(mainsheetGeometry({ yaw: -yaw, rise }, -car).workingLength, 10);
        previous = result.workingLength;
      }
    }
  });
  it("reports infeasible length instead of inventing tension or pushing a slack boom", () => {
    expect(riseLimitAtYaw(40, 0, 0).feasible).toBe(false);
    const slack = riseLimitAtYaw(10, 0, 80);
    expect(slack.feasible && slack.slackAtUpperStop).toBeGreaterThan(0);
    expect(() => mainsheetGeometry({ yaw: NaN, rise: 0 }, 0)).toThrow();
    expect(() => mainsheetGeometry({ yaw: 0, rise: 13 }, 0)).toThrow();
    expect(() => mainsheetGeometry({ yaw: 0, rise: 0 }, 1)).toThrow();
    expect(() => riseLimitAtYaw(0, 0, Infinity)).toThrow();
  });
});
