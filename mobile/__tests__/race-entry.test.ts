import { raceEntryQuery, raceNativeDestination } from "../src/navigation/race-entry";

it("opens the same non-debug 3D race for a normal and legacy daily entry", () => {
  const date = new Date("2026-10-24T12:00:00Z");
  expect(raceEntryQuery({}, "pro", date)).toEqual({ view: "3d", scene: "next", camera: "high", mode: "pro" });
  expect(raceEntryQuery({ course: "daily" }, "simple", date)).toMatchObject({ daily: "2026-10-24", difficulty: "medium", wind: "heavy" });
  expect(raceEntryQuery({ daily: "2026-10-24" }, "simple", date)).toEqual(raceEntryQuery({ course: "daily" }, "simple", date));
});

it("keeps safe mission/replay links and rejects malformed daily or external data", () => {
  expect(raceEntryQuery({ mission: "clean-laps", replayId: "web-race-10" }, "pro")).toMatchObject({ mission: "clean-laps", replayId: "web-race-10" });
  expect(raceEntryQuery({ daily: "2026-02-30", replayId: "https://example.com" }, "simple")).not.toHaveProperty("daily");
  expect(raceEntryQuery({ replayId: "https://example.com" }, "simple")).not.toHaveProperty("replayId");
});

it("confines native navigation to known race destinations", () => {
  expect(raceNativeDestination("/")).toBe("/race");
  expect(raceNativeDestination("/replay/web-race-10")).toBe("/replay/web-race-10");
  for (const href of ["//evil.test", "https://evil.test", "/settings", "/replay/../../settings", null]) expect(raceNativeDestination(href)).toBeNull();
});
