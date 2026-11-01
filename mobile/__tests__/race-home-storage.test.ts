jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { RACE_STORAGE_BRIDGE_SCRIPT, RACE_WEB_STORAGE_KEYS, parseRaceStorageEntries, persistRaceStorage } from "../src/persistence/race-web-storage";
import { EMPTY_RACE_HOME, RACE_HOME_STORAGE_KEY, parseRaceHomeStore, recordRaceEnd } from "../../src/lib/race-next-step";

// Contract (M4-6): the Race hub's next-step row (race days, the last race's
// goal, the last finished daily race) that the offline race WebView writes
// at a race end crosses the bridge, is checked whole and reaches AsyncStorage,
// so the hub reads it after the race and after an app relaunch. A corrupt row
// is refused instead of overwriting the stored one.
const row = JSON.stringify(recordRaceEnd({ ...EMPTY_RACE_HOME, days: [] }, { now: new Date(2026, 10, 2, 12), goal: "tacks", dailyDay: "2026-11-02", finished: true }));

beforeEach(async () => { await AsyncStorage.clear(); });

it("lets the race home row cross the bridge and persists it", async () => {
  expect(RACE_HOME_STORAGE_KEY).toBe("regatta.race.home.v1");
  expect(RACE_WEB_STORAGE_KEYS).toContain(RACE_HOME_STORAGE_KEY);
  expect(RACE_STORAGE_BRIDGE_SCRIPT).toContain(`"${RACE_HOME_STORAGE_KEY}"`);
  expect(parseRaceStorageEntries({ [RACE_HOME_STORAGE_KEY]: row })).toEqual({ [RACE_HOME_STORAGE_KEY]: row });
  await persistRaceStorage({ [RACE_HOME_STORAGE_KEY]: row });
  expect(parseRaceHomeStore(await AsyncStorage.getItem(RACE_HOME_STORAGE_KEY))).toEqual({ schema: 1, days: ["2026-11-02"], goal: "tacks", dailyDone: "2026-11-02" });
});

it("refuses a corrupt race home row and keeps the stored one", async () => {
  await persistRaceStorage({ [RACE_HOME_STORAGE_KEY]: row });
  const corrupt = JSON.stringify({ ...JSON.parse(row), goal: "laylines" });
  expect(parseRaceStorageEntries({ [RACE_HOME_STORAGE_KEY]: corrupt })).toBeNull();
  expect(parseRaceStorageEntries({ [RACE_HOME_STORAGE_KEY]: "{not json" })).toBeNull();
  await expect(persistRaceStorage({ [RACE_HOME_STORAGE_KEY]: corrupt })).rejects.toThrow();
  expect(await AsyncStorage.getItem(RACE_HOME_STORAGE_KEY)).toBe(row);
});
