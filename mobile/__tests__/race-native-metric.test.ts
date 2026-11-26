jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
// M5 step 7: switch A is mocked on here, never in production code (it ships
// false; the flip is M5 step 11). The pinned "gate is OFF" checks stay in
// race-record-presentation.test.ts.
jest.mock("../../src/lib/race-context", () => ({ ...jest.requireActual("../../src/lib/race-context"), PHYSICAL_RACE_EMISSION_ENABLED: true }));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { projectNativeRaceRecord } from "../src/persistence/race-record-presentation";
import { saveNativeRace } from "../src/persistence/race-native";
import { parseRaceStorageEntries } from "../src/persistence/race-web-storage";
import { physicalRaceContext } from "../../src/lib/race-context";
import { makePhysicalRaceCourse } from "../../src/lib/race-courses";
import { GHOST_STORAGE_KEY, ghostClassKey, makeGhostTrack } from "../../src/lib/race-ghost";
import { BEST_TIMES_STORAGE_KEY } from "../../src/lib/best-times";
import { RACE_HOME_STORAGE_KEY } from "../../src/lib/race-next-step";
import type { NativeRaceSnapshot } from "../../src/lib/race-native";

// Contract (M5 step 7, ADR-0015 point 10): with switch A on, the snapshot the
// web race loop posts for a finished metric race (its metric context, mode
// and course) is stored in the app's race history under its metric class and
// shown as a classified result, physical daily and mission races stay
// refused, and the race rows the loop writes (best time under the metric
// key, the metric ghost, the home row) cross the app's storage bridge.
function metricSnapshot(profile: "short" | "medium" | "long" = "short"): NativeRaceSnapshot {
  const course = makePhysicalRaceCourse(profile);
  return { schema: 1, id: "metric-race-1", mode: "simple", difficulty: "easy", windStrength: "medium", missionId: null,
    raceContext: physicalRaceContext(profile), finishTimeSec: 301.5, penaltySeconds: 0, position: 2, totalBoats: 4,
    course: { ...course, marks: course.marks.map(mark => ({ ...mark, label: "Знак", labelEn: "Mark", labelPl: "Znak" })) },
    samples: [{ t: 0, x: 400, y: 1050, heading: 45, twa: -45, speed: 0, lap: 0 },
      { t: 150, x: 420, y: 800, heading: 315, twa: 45, speed: 5.6, lap: 1 },
      { t: 301.5, x: 400, y: 1000, heading: 180, twa: 180, speed: 6.1, lap: 2 }],
    events: [{ type: "start", t: 0 }, { type: "mark-rounded", t: 150 }, { type: "finish", t: 301.5 }],
    coaching: { overall: "Saved analysis", score: 72, mistakes: [], strengths: [], nextGoalRu: "Practice" },
  };
}

beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); });

it.each(["short", "medium", "long"] as const)("stores a finished metric %s race under its class and shows it as classified", async profile => {
  const saved = await saveNativeRace(metricSnapshot(profile), "en");
  expect(saved.courseId).toBe(`physical-cruiser-v1:${profile}:r1`);
  expect(saved.webRace?.raceContext).toEqual(physicalRaceContext(profile));
  expect(projectNativeRaceRecord(saved)).toMatchObject({ kind: "classified", classId: `physical-cruiser-v1:${profile}:r1` });
});

it("still refuses a metric daily race and a metric mission", async () => {
  await expect(saveNativeRace(metricSnapshot(), "en", true)).rejects.toThrow("invalid-race");
  await expect(saveNativeRace({ ...metricSnapshot(), missionId: "sub-90" }, "en")).rejects.toThrow("invalid-race");
});

it("carries the metric race rows across the storage bridge", () => {
  const key = ghostClassKey({ raceContext: physicalRaceContext("short"), mode: "simple", difficulty: "easy", windStrength: "medium", missionId: null });
  const samples = Array.from({ length: 2400 }, (_, i) => ({ t: i * .5, x: 400 + i * .05, y: 1050 - i * .2, heading: 45, speed: 5.5, lap: i === 2399 ? 2 : 0 }));
  const ghost = makeGhostTrack(key, 1199.5, samples)!;
  expect(ghost.samples).toHaveLength(1600);
  const entries = {
    [BEST_TIMES_STORAGE_KEY]: JSON.stringify({ "ctx:physical-cruiser-v1:short:r1:simple:easy:medium": { timeSec: 301.5, ts: 1762000000000 } }),
    [GHOST_STORAGE_KEY]: JSON.stringify({ [key]: ghost }),
    [RACE_HOME_STORAGE_KEY]: JSON.stringify({ schema: 1, days: ["2026-11-02"], goal: null, dailyDone: null }),
  };
  expect(parseRaceStorageEntries(entries)).toEqual(entries);
});
