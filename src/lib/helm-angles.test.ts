import { describe, expect, it } from "vitest";
import { helmProfileFor, polarFor, targetSpeed, type PolarProfile } from "@/features/race-hud/target";
import { bestVmg } from "./upwind-vmg";
import { legOf, legTarget, madeGood, polarAngles, sideOf } from "./helm-angles";

// Contracts of the helm assist's angle solver (ADR-0022):
// - the best angles are the one VMG solver on the race's own table, for the
//   classic boat of the legacy race and the cruiser of the metric race, on
//   three winds (AGENTS.md D1), and they are optima;
// - the leg comes from the bearing of the next mark, with hysteresis;
// - BEST VMG keeps the boat's side on every leg, takes the best VMC on a reach.

const WINDS = [6, 12, 20] as const;
// Measured 2026-11-02 on the 5-degree tables (features/race-hud/target.ts).
const EXPECTED: Record<PolarProfile, Record<(typeof WINDS)[number], { up: number; upVmg: number; down: number; downVmg: number }>> = {
  classic: { 6: { up: 40, upVmg: 2.09, down: 172, downVmg: 1.78 }, 12: { up: 40, upVmg: 4.00, down: 172, downVmg: 3.55 }, 20: { up: 40, upVmg: 5.95, down: 172, downVmg: 5.92 } },
  cruiser: { 6: { up: 45, upVmg: 3.04, down: 130, downVmg: 3.01 }, 12: { up: 40, upVmg: 4.68, down: 160, downVmg: 5.35 }, 20: { up: 40, upVmg: 5.38, down: 165, downVmg: 7.25 } },
};

describe("best angles from the polar on three winds", () => {
  for (const profile of ["classic", "cruiser"] as const) for (const tws of WINDS) {
    it(`${profile} ${tws} kn`, () => {
      const p = helmProfileFor(tws, profile), e = EXPECTED[profile][tws];
      expect(p.angles.upwind.twa).toBe(e.up);
      expect(p.angles.upwind.vmgKn).toBeCloseTo(e.upVmg, 2);
      expect(p.angles.downwind.twa).toBe(e.down);
      expect(p.angles.downwind.vmgKn).toBeCloseTo(e.downVmg, 2);
      // The one solver, not a fork: the same optimum as bestVmg on the same table.
      const table = polarFor(tws, profile), speedAt = (a: number) => targetSpeed(table, a);
      expect(polarAngles(speedAt)).toEqual({ upwind: bestVmg(speedAt, 1), downwind: bestVmg(speedAt, -1) });
      // An optimum: 5 degrees either side makes less good.
      for (const d of [-5, 5]) {
        expect(madeGood(speedAt(e.up + d), e.up + d, "upwind", 0)).toBeLessThan(p.angles.upwind.vmgKn);
        if (e.down + d <= 180) expect(madeGood(speedAt(e.down + d), e.down + d, "downwind", 180)).toBeLessThan(p.angles.downwind.vmgKn);
      }
    });
  }

  it("the cruiser runs deeper in more wind; the classic boat's angles do not move", () => {
    const down = WINDS.map(w => helmProfileFor(w, "cruiser").angles.downwind.twa);
    expect(down[0]).toBeLessThan(down[1]);
    expect(down[1]).toBeLessThan(down[2]);
    expect(new Set(WINDS.map(w => helmProfileFor(w, "classic").angles.downwind.twa)).size).toBe(1);
  });
});

describe("leg by the bearing of the next mark", () => {
  const angles = helmProfileFor(12, "cruiser").angles; // up 40, down 160

  it("beat, reach and run", () => {
    expect(legOf(0, angles)).toBe("upwind");
    expect(legOf(-30, angles)).toBe("upwind");
    expect(legOf(90, angles)).toBe("reach");
    expect(legOf(-120, angles)).toBe("reach");
    expect(legOf(175, angles)).toBe("downwind");
    expect(legOf(-180, angles)).toBe("downwind");
  });

  it("a mark on the border keeps the leg it was until it moves 5 degrees past", () => {
    expect(legOf(42, angles)).toBe("reach");
    expect(legOf(42, angles, "upwind")).toBe("upwind");
    expect(legOf(46, angles, "upwind")).toBe("reach");
    expect(legOf(157, angles, "downwind")).toBe("downwind");
    expect(legOf(154, angles, "downwind")).toBe("reach");
    expect(legOf(37, angles, "reach")).toBe("reach");
    expect(legOf(34, angles, "reach")).toBe("upwind");
  });
});

describe("BEST VMG's angle on each leg", () => {
  for (const tws of WINDS) {
    const p = helmProfileFor(tws, "cruiser");
    it(`keeps the side on a beat and a run, ${tws} kn`, () => {
      expect(legTarget(p.speedAt, p.angles, 5, 50).twa).toBe(p.angles.upwind.twa);
      expect(legTarget(p.speedAt, p.angles, 5, -50).twa).toBe(-p.angles.upwind.twa);
      expect(legTarget(p.speedAt, p.angles, 180, 120).twa).toBe(p.angles.downwind.twa);
      expect(legTarget(p.speedAt, p.angles, 180, -120).twa).toBe(-p.angles.downwind.twa);
      expect(legTarget(p.speedAt, p.angles, 0, 50).targetKn).toBeCloseTo(p.angles.upwind.vmgKn, 6);
    });
    it(`takes the best VMC to a reaching mark, ${tws} kn`, () => {
      const t = legTarget(p.speedAt, p.angles, 90, 60);
      expect(t.leg).toBe("reach");
      expect(Math.abs(t.twa - 90)).toBeLessThanOrEqual(6);
      for (let a = p.angles.upwind.twa; a <= p.angles.downwind.twa; a += 5) {
        expect(madeGood(p.speedAt(a), a, "reach", 90)).toBeLessThanOrEqual(t.targetKn + 1e-9);
      }
    });
  }

  it("never crosses the wind by itself: a reaching mark on the other side keeps this side", () => {
    const p = helmProfileFor(12, "classic");
    const t = legTarget(p.speedAt, p.angles, -100, 45);
    expect(Math.sign(t.twa)).toBe(1);
  });

  it("a boat head to wind or dead downwind takes the mark's side", () => {
    expect(sideOf(0, -20)).toBe(-1);
    expect(sideOf(180, 30)).toBe(1);
    expect(sideOf(-60, 30)).toBe(-1);
  });
});
