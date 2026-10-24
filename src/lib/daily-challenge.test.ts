import { describe, expect, it } from "vitest";
import { dailySettings } from "./daily-challenge";

describe("offline daily settings", () => {
  it("keeps known server challenges stable, including a leap day", () => {
    expect(dailySettings("2026-10-24")).toEqual({ day: "2026-10-24", seed: 512, difficulty: "medium", windStrength: "heavy", missionId: null });
    expect(dailySettings("2026-10-25")).toMatchObject({ seed: 513, difficulty: "medium", windStrength: "heavy" });
    expect(dailySettings("2028-02-29")).toMatchObject({ seed: 556, difficulty: "medium", windStrength: "medium" });
  });
  it("rejects impossible days instead of silently using a different challenge", () => {
    for (const day of ["2026-02-30", "2026-13-01", "today", "2026-1-1"]) expect(() => dailySettings(day)).toThrow("Invalid daily date");
  });
});
