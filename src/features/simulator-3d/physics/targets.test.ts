import { describe, expect, it } from "vitest";
import { createTargetSolver } from "./targets";

describe("3D target instruments", () => {
  it("recomputes target speed after reefing without changing wind or heading", () => {
    const solve = createTargetSolver();
    const full = solve(90, 12, 0);
    const reefed = solve(90, 12, 1);
    expect(full.target).toBeGreaterThan(0);
    expect(reefed.target).toBeLessThan(full.target);
    expect(solve(90, 12, 0)).toEqual(full);
  });
  it("does not retain a sailing target across the no-go boundary in one angle bucket", () => {
    const solve = createTargetSolver();
    expect(solve(42.5, 12, 0).target).toBeGreaterThan(0);
    expect(solve(41.9, 12, 0).target).toBe(0);
  });
});
