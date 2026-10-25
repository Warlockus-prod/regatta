import { raceEntryQuery, raceNativeDestination } from "../src/navigation/race-entry";
import { bootcampLessons } from "../../src/data/bootcamp";

it("opens the same non-debug 3D race for a normal and legacy daily entry", () => {
  const date = new Date("2026-10-24T12:00:00Z");
  expect(raceEntryQuery({}, "pro", date)).toEqual({ view: "3d", scene: "next", mode: "pro" });
  expect(raceEntryQuery({ course: "daily" }, "simple", date)).toMatchObject({ daily: "2026-10-24", difficulty: "medium", wind: "heavy" });
  expect(raceEntryQuery({ daily: "2026-10-24" }, "simple", date)).toEqual(raceEntryQuery({ course: "daily" }, "simple", date));
});

it("keeps safe mission/replay links and rejects malformed daily or external data", () => {
  expect(raceEntryQuery({ mission: "clean-laps", replayId: "web-race-10" }, "pro")).toMatchObject({ mission: "clean-laps", replayId: "web-race-10" });
  expect(raceEntryQuery({ daily: "2026-02-30", replayId: "https://example.com" }, "simple")).not.toHaveProperty("daily");
  expect(raceEntryQuery({ replayId: "https://example.com" }, "simple")).not.toHaveProperty("replayId");
  for (const camera of ["orbit", "stern", "high"]) expect(raceEntryQuery({ camera }, "simple").camera).toBe(camera);
  expect(raceEntryQuery({ camera: "https://example.com" }, "simple")).not.toHaveProperty("camera");
});

it("confines native navigation to known race destinations", () => {
  expect(raceNativeDestination("/")).toBe("/race");
  expect(raceNativeDestination("/replay/web-race-10")).toBe("/replay/web-race-10");
  for (const href of ["//evil.test", "https://evil.test", "/settings", "/replay/../../settings", null]) expect(raceNativeDestination(href)).toBeNull();
});

it("preserves only the eight real lesson return IDs and keeps history and replay destinations intact", () => {
  expect(bootcampLessons).toHaveLength(8);
  for (const { id } of bootcampLessons) {
    expect(raceEntryQuery({ fromLesson: id }, "simple").fromLesson).toBe(id);
    for (const href of ["/", "/race"]) expect(raceNativeDestination(href, id)).toBe(`/bootcamp/${id}`);
    for (const href of ["/history", "/leaderboard", "/replay/web-race-10"]) expect(raceNativeDestination(href, id)).toBe(href);
  }
  for (const id of ["unknown", "../../settings", "https://example.com", "mini-race?target=evil", ["mini-race"], undefined]) {
    expect(raceEntryQuery({ fromLesson: id }, "pro")).not.toHaveProperty("fromLesson");
    expect(raceNativeDestination("/race", id)).toBe("/race");
  }
  expect(raceNativeDestination("/bootcamp/mini-race", "mini-race")).toBeNull();
});
