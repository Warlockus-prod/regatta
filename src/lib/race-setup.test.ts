import { describe, expect, it } from "vitest";
import { linkedRaceSetup, planRaceResume, raceSetupWindMultiplier } from "./race-setup";
import type { SavedRaceSetup } from "./race-resume";
import { dailySettings } from "./daily-challenge";
import { missions } from "@/data/missions";

describe("linked solo race conditions", () => {
  it("keeps a mission's declared difficulty and wind despite generic overrides", () => {
    const mission = missions.find(item => item.windStrength === "light")!;
    expect(linkedRaceSetup(new URLSearchParams({ mission: mission.id, wind: "heavy", difficulty: "hard" }))).toEqual({
      difficulty: mission.difficulty, windStrength: mission.windStrength, missionId: mission.id, dailyDay: null,
    });
  });
  it("uses the same deterministic daily conditions on bare and parameterized links", () => {
    const day = "2026-10-24";
    const expected = { ...dailySettings(day), dailyDay: day };
    expect(linkedRaceSetup(new URLSearchParams({ daily: day }))).toEqual(expected);
    expect(linkedRaceSetup(new URLSearchParams({ daily: day, mission: missions[0].id, difficulty: "easy", wind: "heavy" }))).toEqual(expected);
  });
  it("ignores malformed daily dates and unsupported options", () => {
    expect(linkedRaceSetup(new URLSearchParams("daily=2026-02-31"))).toBeNull();
    expect(linkedRaceSetup(new URLSearchParams("difficulty=bogus&wind=bogus"))).toEqual({ difficulty: "medium", windStrength: "medium", missionId: null, dailyDay: null });
    expect(linkedRaceSetup(new URLSearchParams())).toBeNull();
  });
});

describe("explicit saved briefing restart", () => {
  const saved: SavedRaceSetup = { v: 1, ts: 10, difficulty: "easy", windStrength: "light", missionId: null, phase: "racing" };
  it("keeps a recorded mode and uses current preferences only for historical mode-less intents", () => {
    expect(planRaceResume({ ...saved, mode: "pro" }, new URLSearchParams(), "simple")?.mode).toBe("pro");
    expect(planRaceResume({ ...saved, mode: "simple" }, new URLSearchParams("mode=pro"), "pro")?.mode).toBe("simple");
    expect(planRaceResume(saved, new URLSearchParams("difficulty=hard&wind=heavy&mode=pro&embed=1"), "pro")).toEqual({ ...saved, mode: "pro" });
    expect(saved).not.toHaveProperty("mode");
  });
  it.each(["mission", "daily", "fromLesson", "replay", "replayId", "profile", "courseProfile"])("preserves explicit %s activity ownership", key => {
    expect(planRaceResume(saved, new URLSearchParams({ [key]: "new-activity" }), "simple")).toBeNull();
  });
  it("uses known mission conditions and preserves unknown mission intents without turning them into free races", () => {
    const mission = missions[0];
    expect(planRaceResume({ ...saved, missionId: mission.id }, new URLSearchParams(), "simple")).toEqual({ ...saved,
      mode: "simple", missionId: mission.id, difficulty: mission.difficulty, windStrength: mission.windStrength });
    expect(planRaceResume({ ...saved, missionId: "unknown-mission" }, new URLSearchParams(), "simple")).toBeNull();
  });
  it("retains additive daily identity and unchanged wind multipliers", () => {
    const day = "2026-10-26", daily = dailySettings(day);
    const value = { ...saved, dailyDay: day, difficulty: daily.difficulty, windStrength: daily.windStrength, mode: "pro" as const };
    expect(planRaceResume(value, new URLSearchParams(), "simple")).toEqual(value);
    expect(["light", "medium", "heavy"].map(wind => raceSetupWindMultiplier(wind as SavedRaceSetup["windStrength"]))).toEqual([.65, 1, 1.3]);
  });
});
