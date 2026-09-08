import { describe, expect, it } from "vitest";
import { Vector3 } from "three";
import { sailResponse, signedSailIncidence } from "./response";
import { sailPoint, type SailShape } from "./geometry";

const base: SailShape = { camber: .7, twist: 0, luff: 0, reef: 0, side: 1, time: 0 };
describe("wind-driven cloth", () => {
  it("fills with pressure but remains bounded in strong wind", () => {
    const response = [0, 1, 4, 12, 30, 60].map(wind => sailResponse(wind, 10, false, false, false));
    expect(response[0]).toMatchObject({ fill: 0, luff: 0, status: "calm" });
    for (let i = 1; i < response.length; i++) {
      expect(response[i].fill).toBeGreaterThanOrEqual(response[i - 1].fill);
      expect(response[i].fill).toBeLessThanOrEqual(1);
    }
    expect(response[3].fill).toBeGreaterThan(.9);
  });
  it("distinguishes an unloaded luff from a full but stalled sail", () => {
    const luff = sailResponse(12, 0, false, false, false);
    const stall = sailResponse(12, 40, true, false, false);
    expect(luff).toMatchObject({ fill: 0, status: "luffing" });
    expect(luff.luff).toBeGreaterThan(.9);
    expect(stall).toMatchObject({ luff: 0, status: "stalled" });
    expect(stall.fill).toBeGreaterThan(.9);
    expect(sailResponse(12, 40, true, true, false).status).toBe("drawing");
    expect(sailResponse(12, 10, false, false, true).fill).toBe(0);
  });
  it("keeps cloth anchors fixed while draft fills independently for each sail", () => {
    for (const kind of ["main", "jib"] as const) {
      const calm = { ...base, ...sailResponse(0, 10, false, false, false) };
      const full = { ...base, ...sailResponse(12, 10, false, false, false) };
      for (const [u,v] of [[0,0], [0,.5], [0,1], [1,0]]) {
        expect(sailPoint(kind,u,v,calm,new Vector3()).distanceTo(sailPoint(kind,u,v,full,new Vector3()))).toBeLessThan(1e-8);
      }
      const unloaded = sailPoint(kind,.4,.5,calm,new Vector3());
      const loaded = sailPoint(kind,.4,.5,full,new Vector3());
      expect(loaded.z).toBeGreaterThan(unloaded.z * 5);
      expect(loaded.y).toBeGreaterThan(unloaded.y);
    }
  });
  it("does not call an over-eased sail full or recommend easing it further", () => {
    for (const awa of [-10, 10]) {
      const incidence = signedSailIncidence(awa, 50, .4);
      expect(incidence).toBeLessThan(0);
      expect(sailResponse(8, incidence, true, false, false)).toMatchObject({ fill: 0, status: "luffing" });
    }
    expect(sailResponse(12, 10, false, false, true).status).toBe("inIrons");
  });
  it("does not animate flutter without air, even when the luff control is on", () => {
    for (const kind of ["main", "jib"] as const) {
      const noAir = { ...base, luff: 1, airSpeed: 0, fill: 0 };
      expect(sailPoint(kind,.4,.5,noAir,new Vector3()).distanceTo(sailPoint(kind,.4,.5,{...noAir,time:7},new Vector3()))).toBe(0);
      const wind = { ...noAir, airSpeed: 12 };
      expect(sailPoint(kind,.4,.5,wind,new Vector3()).distanceTo(sailPoint(kind,.4,.5,{...wind,time:7},new Vector3()))).toBeGreaterThan(.01);
    }
  });
});
