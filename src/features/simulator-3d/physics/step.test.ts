import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { createInitialState, getBoatParams, tick, type Controls } from "@/lib/sailing-physics";
import { FORESTAY_AXIS, sailPoint } from "../sails/geometry";
import { advanceRig, initialRig, type RigMotion } from "../sails/transfer";
import { stepWithRig } from "./step";

const params = getBoatParams();
const controls: Controls = { mainSheet: .8, jibSheet: .8, mainTwist: .35,
  jibTwist: .4, reef: 0, jibFurl: 0, jibSide: 1 };
const shape = { camber: .6, twist: 0, luff: 0, reef: 0, side: 1, time: 0 };

describe("3D assisted rig and force integration", () => {
  it("places both actual clews and the heeling mast to leeward on either tack at every heading", () => {
    for (const heading of [0, 90, 180, 270]) for (const twa of [-65, 65]) {
      const result = stepWithRig(createInitialState({ tws: 12, twa, heading }), { ...controls, mainSheet: .55, jibSheet: .35 }, params, null, .05);
      const lee = twa > 0 ? -1 : 1;
      for (const [kind, angle, axis] of [
        ["main", result.motion.main, new Vector3(0, 1, 0)],
        ["jib", result.motion.jib, FORESTAY_AXIS],
      ] as const) {
        const clew = sailPoint(kind, 1, 0, shape, new Vector3()).applyAxisAngle(axis, angle * Math.PI / 180);
        expect(Math.sign(clew.z)).toBe(lee);
      }
      // Positive X roll moves the Y-up mast to +Z (starboard).
      const mast = new Vector3(0, 18, 0).applyAxisAngle(new Vector3(1, 0, 0), result.state.heel * Math.PI / 180);
      expect(Math.sign(mast.z)).toBe(lee);
      expect(result.diag.drive).toBeGreaterThan(0);
    }
  });

  it("unloads and trails both sails head to wind instead of holding them out on slack sheets", () => {
    let state = createInitialState({ tws: 12, twa: 0, boatSpeed: 4 });
    let motion: RigMotion | null = initialRig({ awa: -60, aws: 12, mainLimit: 60, jibLimit: 45 });
    for (let i = 0; i < 120; i++) {
      const result = stepWithRig(state, controls, params, motion, 1 / 30);
      state = result.state; motion = result.motion;
      expect(result.main.fill).toBe(0);
      expect(result.jib.fill).toBe(0);
      expect(result.diag.drive).toBe(0);
    }
    expect(Math.abs(motion.main)).toBeLessThan(.1);
    expect(Math.abs(motion.jib)).toBeLessThan(.1);
    expect(state.boatSpeed).toBeLessThan(4);
  });

  for (const direction of [-1, 1]) for (const gybe of [false, true]) {
    it(`${gybe ? "gybes" : "tacks"} in direction ${direction}, preserves sheet levels and fills on the new side`, () => {
      const sheets = { ...controls, mainSheet: gybe ? .05 : .8, jibSheet: gybe ? .05 : .8 };
      const saved = { ...sheets };
      let state = createInitialState({ tws: 12, trueWindDir: 0, heading: (360 - direction * (gybe ? 145 : 55)) % 360, boatSpeed: 4 });
      let motion: RigMotion | null = null;
      let sawTransfer = false, sawUnloaded = false;
      let result = stepWithRig(state, sheets, params, motion, 1 / 60);
      const originalSide = result.motion.lee;
      for (let i = 0; i <= 720; i++) {
        const f = Math.min(1, i / 480);
        const twa = direction * (gybe ? 145 + 70 * f : 55 - 110 * f);
        state.heading = (360 - twa + 360) % 360;
        result = stepWithRig(state, sheets, params, motion, 1 / 60);
        if (motion) {
          expect(Math.abs(result.motion.main - motion.main)).toBeLessThanOrEqual(100 / 60 + 1e-9);
          expect(Math.abs(result.motion.jib - motion.jib)).toBeLessThanOrEqual(75 / 60 + 1e-9);
        }
        sawTransfer ||= result.motion.maneuver === (gybe ? "gybing" : "tacking");
        sawUnloaded ||= result.main.fill < .1 && result.jib.fill < .1;
        if (gybe) expect(result.main.status).not.toBe("inIrons");
        state = result.state; motion = result.motion;
        expect(Number.isFinite(state.boatSpeed + state.heel + state.leeway)).toBe(true);
      }
      expect(sheets).toEqual(saved);
      expect(sawTransfer).toBe(true);
      expect(sawUnloaded).toBe(true);
      expect(motion!.lee).toBe(-originalSide);
      expect(Math.sign(motion!.main)).toBe(-originalSide);
      expect(Math.sign(motion!.jib)).toBe(-originalSide);
      expect(result.main.fill).toBeGreaterThan(.65);
      expect(result.jib.fill).toBeGreaterThan(.65);
      expect(result.motion.maneuver).toBe("sailing");
    });
  }

  it("retains the previous tack through wind-axis jitter and at zero air speed", () => {
    for (const base of [0, 180]) {
      const input = { awa: base === 180 ? 172 : 8, aws: 12, mainLimit: 80, jibLimit: 55 };
      let rig = initialRig(input);
      const side = rig.lee;
      for (let i = 0; i < 200; i++) {
        const awa = base + (i % 2 ? -1 : 1);
        rig = advanceRig(rig, { ...input, awa: awa > 180 ? awa - 360 : awa }, .05);
        expect(rig.lee).toBe(side);
        expect(rig.maneuver).toBe("sailing");
      }
      expect(advanceRig(rig, { ...input, awa: -90, aws: 0 }, .05).lee).toBe(side);
    }
  });

  it("passes settled loaded trim unchanged to the shared engine", () => {
    const state = createInitialState({ tws: 12, twa: -65 });
    const simple = tick(state, controls, params, .05);
    const resolved = stepWithRig(state, controls, params, null, .05);
    expect(resolved.state.boatSpeed).toBeCloseTo(simple.state.boatSpeed, 8);
    expect(resolved.state.heel).toBeCloseTo(simple.state.heel, 8);
  });

  it("keeps a central hard-sheeted main on the remembered tack", () => {
    const input = { awa: 60, aws: 12, mainLimit: 0, jibLimit: 15 };
    let rig = initialRig(input);
    for (let i = 0; i < 120; i++) rig = advanceRig(rig, { ...input, awa: -60 }, 1 / 30);
    expect(Math.abs(rig.main)).toBe(0);
    expect(rig.lee).toBe(1);
    expect(rig.maneuver).toBe("sailing");
  });

  it("converges to the same opposite-tack pose at 20 and 60 frames per second", () => {
    const run = (fps: number) => {
      const input = { awa: -150, aws: 12, mainLimit: 80, jibLimit: 55 };
      let rig = initialRig(input);
      for (let i = 0; i < fps * 4; i++) rig = advanceRig(rig, { ...input, awa: 150 }, 1 / fps);
      return rig;
    };
    const phone = run(20), desktop = run(60);
    expect(Math.abs(phone.main - desktop.main)).toBeLessThan(.1);
    expect(Math.abs(phone.jib - desktop.jib)).toBeLessThan(.1);
    expect(phone.maneuver).toBe(desktop.maneuver);
    expect(phone.lee).toBe(desktop.lee);
  });
});
