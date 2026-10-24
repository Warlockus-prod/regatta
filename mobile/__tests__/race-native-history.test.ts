jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { saveNativeRace } from "../src/persistence/race-native";
import { readRaces } from "../src/persistence/race-history";
import { parseRaceStorageEntries, persistRaceStorage } from "../src/persistence/race-web-storage";
import type { NativeRaceSnapshot } from "../../src/lib/race-native";

const key = "regatta.race-history.v1";
const legacy = { id: "legacy-1", courseId: "short", timeSec: 75, score: 90, finishedAt: 1, replay: [{ x: 160, y: 300, t: 0 }, { x: 160, y: 60, t: 40 }] };
const race: NativeRaceSnapshot = {
  schema: 1, id: "local-race-1", difficulty: "medium", windStrength: "medium", missionId: null,
  finishTimeSec: 10, position: 1, totalBoats: 3,
  course: { marks: [{ pos: { x: 400, y: 100 }, radius: 10, type: "windward", label: "Знак", labelEn: "Mark", labelPl: "Znak" }], startLine: { a: { x: 300, y: 1000 }, b: { x: 500, y: 1000 } }, finishLine: { a: { x: 300, y: 1000 }, b: { x: 500, y: 1000 } } },
  samples: [{ t: 0, x: 400, y: 990, heading: 45, twa: 45, speed: 4, lap: 0 }, { t: 10, x: 400, y: 1000, heading: 180, twa: 180, speed: 5, lap: 2 }],
  events: [{ type: "start", t: 0 }, { type: "finish", t: 10 }],
};

beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); });

it("adds world-space replay without rewriting a legacy pixel recording", async () => {
  await AsyncStorage.setItem(key, JSON.stringify([legacy]));
  const saved = await saveNativeRace(race, "en");
  expect(saved.webRace?.course).toEqual(race.course);
  expect(saved.samples).toEqual(race.samples);
  expect(saved.webRace?.coaching?.overall).toBeTruthy();
  expect(await readRaces()).toEqual([saved, legacy]);
  await saveNativeRace(race, "en");
  expect((await readRaces()).map(record => record.id)).toEqual([race.id, legacy.id]);
});

it("does not report persistence on disk failure or replace unreadable history", async () => {
  await AsyncStorage.setItem(key, JSON.stringify([legacy]));
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("disk full"));
  await expect(saveNativeRace(race, "en")).rejects.toThrow("disk full");
  expect(await readRaces()).toEqual([legacy]);
  await AsyncStorage.setItem(key, "unreadable history");
  await expect(saveNativeRace(race, "en")).rejects.toThrow();
  expect(await AsyncStorage.getItem(key)).toBe("unreadable history");
});

it("rejects malformed recordings and confines browser storage to race-owned keys", async () => {
  await expect(saveNativeRace({ ...race, samples: [] }, "en")).rejects.toThrow("invalid-race");
  expect(parseRaceStorageEntries({ "regatta.bootcamp": "erase" })).toBeNull();
  expect(parseRaceStorageEntries({ "regatta.race.mode.v1": 10 })).toBeNull();
  await persistRaceStorage({ "regatta.race.mode.v1": "pro", "regatta.race-resume.v1": null });
  expect(await AsyncStorage.getItem("regatta.race.mode.v1")).toBe("pro");
  expect(await AsyncStorage.getItem(key)).toBeNull();
});
