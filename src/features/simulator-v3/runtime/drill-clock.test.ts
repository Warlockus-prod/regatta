import { expect, it } from "vitest";
import { advanceDrillClock } from "./drill-clock";
it("does not finish a drill while paused, hidden or telemetry was unobserved", () => {
  const initial = { time: 4, heldFor: 2 };
  for (let i = 0; i < 100; i++) expect(advanceDrillClock(initial, 4, true)).toBe(initial);
  expect(advanceDrillClock(initial, 4.1, true).heldFor).toBeCloseTo(2.1);
  expect(advanceDrillClock(initial, 4.1, false).heldFor).toBe(0);
  expect(advanceDrillClock(initial, 12, true).heldFor).toBe(0);
  expect(advanceDrillClock(initial, 0, true)).toEqual({ time: 0, heldFor: 0 });
});
