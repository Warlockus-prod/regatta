jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { projectNativeRaceRecord } from "../src/persistence/race-record-presentation";
import { buildNativeRaceRecord, saveNativeRace } from "../src/persistence/race-native";
import type { RaceRecord } from "../src/persistence/race-history";
import { LEGACY_RACE_CONTEXT, PHYSICAL_RACE_EMISSION_ENABLED, PHYSICAL_RACE_PROFILES, physicalRaceContext } from "../../src/lib/race-context";
import { makeStandardCourse } from "../../src/lib/race-physics";
import { makePhysicalRaceCourse } from "../../src/lib/race-courses";
import type { NativeRaceSnapshot } from "../../src/lib/race-native";

const pixel: RaceRecord = { id: "pixel-48", courseId: "short", timeSec: 75, score: 90, finishedAt: 1,
  replay: [{ x: 160, y: 300, t: 0 }, { x: 160, y: 60, t: 40 }] };
function snapshot(profile?: typeof PHYSICAL_RACE_PROFILES[number]): NativeRaceSnapshot {
  const course = profile ? makePhysicalRaceCourse(profile) : makeStandardCourse();
  return { schema: 1, id: "world-result", mode: "pro", difficulty: "easy", windStrength: "medium", missionId: null,
    raceContext: profile ? physicalRaceContext(profile) : LEGACY_RACE_CONTEXT,
    finishTimeSec: 120, penaltySeconds: 7.25, position: 1, totalBoats: 3,
    course: { ...course, marks: course.marks.map(mark => ({ ...mark, label: "Знак", labelEn: "Mark", labelPl: "Znak" })) },
    samples: [{ t: 0, x: 400, y: 1050, heading: 45, twa: -45, speed: 4, lap: 0 },
      { t: 120, x: 400, y: 1000, heading: 180, twa: 180, speed: 4, lap: 2 }],
    events: [{ type: "finish", t: 120 }],
    coaching: { overall: "Saved analysis", score: 85, mistakes: [], strengths: [], nextGoalRu: "Practice" },
  };
}

beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); });

it("preserves every historical pixel course and uses a generic descriptor for unknown titles", () => {
  for (const courseId of ["short", "medium", "long", "daily", "PRIVATE_CUSTOM_COURSE"]) {
    const record = { ...pixel, courseId }, bytes = JSON.stringify(record);
    expect(projectNativeRaceRecord(record)).toEqual({ kind: "legacy-pixel", title: { kind: "historical", course: courseId === "PRIVATE_CUSTOM_COURSE" ? null : courseId }, historicalKey: courseId });
    expect(JSON.stringify(record)).toBe(bytes);
  }
});

it("never infers Simple or standard provenance for absent metadata or compatible custom legacy geometry", () => {
  const base = snapshot();
  const custom = { ...base.course, marks: base.course.marks.map((mark, i) => i ? mark : { ...mark, pos: { ...mark.pos, y: mark.pos.y + 20 } }) };
  for (const webRace of [{ ...base, raceContext: undefined }, { ...base, raceContext: null }, { ...base, mode: undefined }, { ...base, course: custom }, { ...base, missionId: "legacy-mission" }]) {
    const record = { ...pixel, webRace } as RaceRecord, bytes = JSON.stringify(record);
    expect(projectNativeRaceRecord(record)).toEqual({ kind: "historical-world-unclassified", title: { kind: "historical", course: "short" }, historicalKey: "short" });
    expect(JSON.stringify(record)).toBe(bytes);
  }
  expect(projectNativeRaceRecord({ ...pixel, courseId: "daily", webRace: base }).kind).toBe("historical-world-unclassified");
});

it("classifies explicit registered legacy data separately from the historical score projection", () => {
  const projected = projectNativeRaceRecord({ ...pixel, webRace: snapshot() });
  expect(projected).toMatchObject({ kind: "classified", classId: "legacy-race-v1:standard:r1", comparisonKey: "pro:easy-medium", adjustedTimeSec: 127.25,
    comparison: { raceContext: LEGACY_RACE_CONTEXT, mode: "pro", difficulty: "easy", windStrength: "medium" } });
});

it.each(PHYSICAL_RACE_PROFILES)("uses the actual %s context and snapshot raw plus penalty despite historical aliases and wrapper values", profile => {
  for (const courseId of ["short", "daily"]) {
    const record = { ...pixel, courseId, timeSec: 1, score: 100, webRace: snapshot(profile) }, bytes = JSON.stringify(record);
    expect(projectNativeRaceRecord(record)).toMatchObject({ kind: "classified", title: { kind: "registered", classId: `physical-cruiser-v1:${profile}:r1` },
      classId: `physical-cruiser-v1:${profile}:r1`, comparisonKey: `ctx:physical-cruiser-v1:${profile}:r1:pro:easy:medium`,
      rawFinishTimeSec: 120, penaltySeconds: 7.25, adjustedTimeSec: 127.25 });
    expect(JSON.stringify(record)).toBe(bytes);
  }
});

it("isolates all54 physical comparison buckets without changing input records", () => {
  const keys = new Set<string>();
  for (const profile of PHYSICAL_RACE_PROFILES) for (const mode of ["simple", "pro"] as const)
    for (const difficulty of ["easy", "medium", "hard"] as const) for (const windStrength of ["light", "medium", "heavy"] as const) {
      const record = { ...pixel, webRace: { ...snapshot(profile), mode, difficulty, windStrength } }, bytes = JSON.stringify(record);
      const projection = projectNativeRaceRecord(record);
      expect(projection.kind).toBe("classified");
      if (projection.kind === "classified") keys.add(projection.comparisonKey);
      expect(JSON.stringify(record)).toBe(bytes);
    }
  expect(keys.size).toBe(54);
});

it("keeps future, corrupt and contradicting world metadata unavailable without a historical PB key", () => {
  const base = snapshot("short");
  const rejected = [
    { ...base, schema: 2 }, { ...base, raceContext: { ...base.raceContext, model: "future-model" } },
    { ...base, raceContext: { ...base.raceContext, geometryRevision: 2 } },
    { ...base, raceContext: { ...base.raceContext, coordinateUnits: "pixels" } },
    { ...base, course: { ...base.course, marks: base.course.marks.map((mark, i) => i ? mark : { ...mark, radius: mark.radius + 1 }) } },
    { ...base, missionId: "mission" }, { ...base, samples: [] }, null,
  ];
  for (const webRace of rejected) {
    const record = { ...pixel, webRace } as unknown as RaceRecord, bytes = JSON.stringify(record);
    const projection = projectNativeRaceRecord(record);
    expect(projection.kind).toBe("unavailable");
    expect(projection).not.toHaveProperty("historicalKey");
    expect(projection).not.toHaveProperty("comparisonKey");
    expect(JSON.stringify(record)).toBe(bytes);
  }
  expect(projectNativeRaceRecord({ ...pixel, courseId: "physical-cruiser-v1:long:r1", webRace: base })).toEqual({ kind: "unavailable", title: { kind: "unavailable" }, reason: "corrupt" });
  expect(projectNativeRaceRecord({ ...pixel, courseId: "physical-cruiser-v2:short:r1", webRace: base })).toEqual({ kind: "unavailable", title: { kind: "unavailable" }, reason: "unsupported" });
});

it.each(PHYSICAL_RACE_PROFILES)("builds a pure canonical %s result but never emits a physical save while the gate is OFF", async profile => {
  const race = snapshot(profile), bytes = JSON.stringify(race);
  const prepared = buildNativeRaceRecord(race, "en");
  expect(prepared).toMatchObject({ id: race.id, courseId: `physical-cruiser-v1:${profile}:r1`, timeSec: 127.25, score: 85, webRace: race });
  expect(prepared).not.toHaveProperty("finishedAt");
  expect(prepared?.replay).toHaveLength(2);
  expect(JSON.stringify(race)).toBe(bytes);
  expect(buildNativeRaceRecord(race, "en", true)).toBeNull();
  expect(buildNativeRaceRecord({ ...race, missionId: "mission" }, "en")).toBeNull();
  expect(PHYSICAL_RACE_EMISSION_ENABLED).toBe(false);
  await expect(saveNativeRace(race, "en")).rejects.toThrow("invalid-race");
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

it("keeps old unclassified short/daily builder aliases and rejects invalid input without writes", () => {
  const race = { ...snapshot(), raceContext: undefined };
  expect(buildNativeRaceRecord(race, "en")?.courseId).toBe("short");
  expect(buildNativeRaceRecord(race, "en", true)?.courseId).toBe("daily");
  expect(buildNativeRaceRecord({ ...race, samples: [] }, "en")).toBeNull();
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
});

it("does not manufacture explicit legacy context from null metadata while preparing or saving a historical result", async () => {
  const raw = { ...snapshot(), raceContext: null };
  const prepared = buildNativeRaceRecord(raw, "en");
  expect(prepared?.courseId).toBe("short");
  expect(prepared?.webRace?.raceContext).toBeNull();
  const saved = await saveNativeRace(raw, "en");
  expect(projectNativeRaceRecord(saved).kind).toBe("historical-world-unclassified");
  expect(saved.courseId).toBe("short");
  expect(raw.raceContext).toBeNull();
});
