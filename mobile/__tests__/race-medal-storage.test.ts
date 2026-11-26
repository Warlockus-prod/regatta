jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { RACE_STORAGE_BRIDGE_SCRIPT, RACE_WEB_STORAGE_KEYS, parseRaceStorageEntries, persistRaceStorage } from "../src/persistence/race-web-storage";
import { RACE_MEDALS_STORAGE_KEY, awardRaceMedal, courseMedal, readMedalStore } from "../../src/lib/race-medals";
import { LEGACY_RACE_CONTEXT } from "../../src/lib/race-context";

// Contract (M4-5): the course medals the offline race WebView writes after a
// finish cross the bridge, are checked whole, reach AsyncStorage and come
// back to the page with the other race rows, so a medal survives an app
// relaunch. A corrupt row is refused instead of overwriting stored medals.
const course = { raceContext: LEGACY_RACE_CONTEXT, difficulty: "easy" as const, windStrength: "medium" as const };
const row = JSON.stringify(awardRaceMedal({}, course, 90, false)!.store);

beforeEach(async () => { await AsyncStorage.clear(); });

it("lets the medal row cross the bridge and persists it", async () => {
  expect(RACE_MEDALS_STORAGE_KEY).toBe("regatta.race.medals.v1");
  expect(RACE_WEB_STORAGE_KEYS).toContain(RACE_MEDALS_STORAGE_KEY);
  expect(RACE_STORAGE_BRIDGE_SCRIPT).toContain(`"${RACE_MEDALS_STORAGE_KEY}"`);
  expect(parseRaceStorageEntries({ [RACE_MEDALS_STORAGE_KEY]: row })).toEqual({ [RACE_MEDALS_STORAGE_KEY]: row });
  await persistRaceStorage({ [RACE_MEDALS_STORAGE_KEY]: row });
  const stored = await AsyncStorage.getItem(RACE_MEDALS_STORAGE_KEY);
  expect(stored).toBe(row);
  expect(courseMedal(readMedalStore({ getItem: () => stored }), course)).toBe("gold");
});

it("refuses a corrupt medal row and keeps the stored one", async () => {
  await persistRaceStorage({ [RACE_MEDALS_STORAGE_KEY]: row });
  const key = Object.keys(JSON.parse(row))[0];
  const corrupt = JSON.stringify({ [key]: { ...JSON.parse(row)[key], medal: "platinum" } });
  expect(parseRaceStorageEntries({ [RACE_MEDALS_STORAGE_KEY]: corrupt })).toBeNull();
  expect(parseRaceStorageEntries({ [RACE_MEDALS_STORAGE_KEY]: "{not json" })).toBeNull();
  await expect(persistRaceStorage({ [RACE_MEDALS_STORAGE_KEY]: corrupt })).rejects.toThrow();
  expect(await AsyncStorage.getItem(RACE_MEDALS_STORAGE_KEY)).toBe(row);
});
