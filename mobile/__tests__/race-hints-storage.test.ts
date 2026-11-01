jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { RACE_STORAGE_BRIDGE_SCRIPT, RACE_WEB_STORAGE_KEYS, parseRaceStorageEntries, persistRaceStorage } from "../src/persistence/race-web-storage";

// Contract (M4-7): a first race hint shown in the offline race WebView stays
// shown after an app relaunch, and "Show hints again" (the row removed)
// survives too: the row crosses the bridge, reaches AsyncStorage and is
// handed back to the page with the other race rows.
// Same literal as FIRST_RACE_HINTS_KEY in src/features/race-hud/first-race-hints.ts
// (the web test checks that this file lists it; that module's "@/" imports do not resolve here).
const FIRST_RACE_HINTS_KEY = "regatta.race.hints-seen.v1";

beforeEach(async () => { await AsyncStorage.clear(); });

it("lets the first race hints row cross the bridge, persist and be cleared", async () => {
  expect(RACE_WEB_STORAGE_KEYS).toContain(FIRST_RACE_HINTS_KEY);
  expect(RACE_STORAGE_BRIDGE_SCRIPT).toContain(`"${FIRST_RACE_HINTS_KEY}"`);
  const row = JSON.stringify(["no-go", "mark-approach"]);
  expect(parseRaceStorageEntries({ [FIRST_RACE_HINTS_KEY]: row })).toEqual({ [FIRST_RACE_HINTS_KEY]: row });
  await persistRaceStorage({ [FIRST_RACE_HINTS_KEY]: row });
  expect(await AsyncStorage.getItem(FIRST_RACE_HINTS_KEY)).toBe(row);
  await persistRaceStorage({ [FIRST_RACE_HINTS_KEY]: null });
  expect(await AsyncStorage.getItem(FIRST_RACE_HINTS_KEY)).toBeNull();
});

it("still rejects an oversized row", () => {
  expect(parseRaceStorageEntries({ [FIRST_RACE_HINTS_KEY]: "x".repeat(16001) })).toBeNull();
});
