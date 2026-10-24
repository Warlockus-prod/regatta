import { describe, expect, it } from "vitest";
import { linkedRaceSetup } from "./race-setup";
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
