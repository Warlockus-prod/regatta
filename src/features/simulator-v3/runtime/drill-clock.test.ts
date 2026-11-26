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

// Package 13 stage D: "Show me" (and "Best", a course preset or the auto-trim
// during an attempt) is never the learner's pass.
import { describe } from "vitest";
import { advanceDrillAttempt, newDrillAttempt, showDrill } from "./drill-clock";
describe("a shown attempt never passes", () => {
  const limits = { holdDuration: 10, timeLimit: 40 };
  const sail = (attempt: ReturnType<typeof newDrillAttempt>, from: number, seconds: number, ok = true) => {
    let a = attempt;
    for (let t = from + 0.1; t <= from + seconds + 1e-9; t += 0.1) a = advanceDrillAttempt(a, t, ok, limits);
    return a;
  };
  it("the condition held for the whole hold and past the time limit after Show me: shown, not won", () => {
    const shown = showDrill(sail(newDrillAttempt(), 0, 4));
    expect(shown).toMatchObject({ outcome: "shown", heldFor: 0 });
    const later = sail(shown, 4, 60);
    expect(later.outcome).toBe("shown");
    expect(later.heldFor).toBe(0);
  });
  it("Show me after a failed attempt is shown too; a won attempt stays the learner's", () => {
    const failed = sail(newDrillAttempt(), 0, 41, false);
    expect(failed.outcome).toBe("fail");
    expect(showDrill(failed).outcome).toBe("shown");
    const won = sail(newDrillAttempt(), 0, 10.2);
    expect(won.outcome).toBe("win");
    expect(showDrill(won)).toBe(won);
  });
  it("after Show me only a new attempt the learner sails can pass", () => {
    const again = sail(newDrillAttempt(0), 0, 10.2);
    expect(again.outcome).toBe("win");
    expect(sail(newDrillAttempt(0), 0, 9.5).outcome).toBe("pending");
  });
});
