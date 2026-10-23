import { describe, expect, it } from "vitest";
import { stepBoat, type RaceBoat } from "@/lib/race-physics";
import { polarFor, targetSpeed } from "./target";

// Contract: the HUD's target is what the race's own boat can make. A boat
// sailing steadily at a reach in the race reaches about its target, nothing
// is expected inside the no-go zone, and the target is the same on both tacks.
describe("race HUD target speed", () => {
  const table = polarFor(12);

  it("expects nothing head to wind and more on a reach than close-hauled", () => {
    expect(targetSpeed(table, 15)).toBe(0);
    expect(targetSpeed(table, 90)).toBeGreaterThan(targetSpeed(table, 45));
    expect(targetSpeed(table, -60)).toBeCloseTo(targetSpeed(table, 60), 6);
  });

  it("matches the speed the race boat settles at", () => {
    for (const heading of [50, 90, 140]) {
      const b: RaceBoat = { id: "a", name: "a", color: "w", pos: { x: 400, y: 900 }, heading, speed: 0, lapDone: 0 };
      for (let i = 0; i < 1200; i++) stepBoat(b, .05, 0, 1, { turn: 0 });
      const target = targetSpeed(table, heading);
      expect(b.speed / target, `heading ${heading}`).toBeGreaterThan(0.9);
      expect(b.speed / target, `heading ${heading}`).toBeLessThan(1.1);
    }
  });
});
