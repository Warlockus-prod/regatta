jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { RACE_STORAGE_BRIDGE_SCRIPT, RACE_WEB_STORAGE_KEYS, parseRaceStorageEntries, persistRaceStorage } from "../src/persistence/race-web-storage";

// Contract (F5): the race intro finished or skipped in the offline race
// WebView stays seen after an app relaunch: the row crosses the bridge,
// reaches AsyncStorage and is handed back to the page with the other race rows.
// Same literal as RACE_INTRO_KEY in src/features/race-hud/race-intro.ts (the
// web test checks that this file lists it; that module's "@/" imports do not
// resolve here).
const RACE_INTRO_KEY = "regatta.race.intro-seen.v1";

beforeEach(async () => { await AsyncStorage.clear(); });

it("lets the race intro row cross the bridge and persist", async () => {
  expect(RACE_WEB_STORAGE_KEYS).toContain(RACE_INTRO_KEY);
  expect(RACE_STORAGE_BRIDGE_SCRIPT).toContain(`"${RACE_INTRO_KEY}"`);
  expect(parseRaceStorageEntries({ [RACE_INTRO_KEY]: "1" })).toEqual({ [RACE_INTRO_KEY]: "1" });
  await persistRaceStorage({ [RACE_INTRO_KEY]: "1" });
  expect(await AsyncStorage.getItem(RACE_INTRO_KEY)).toBe("1");
});

it("still rejects an oversized row", () => {
  expect(parseRaceStorageEntries({ [RACE_INTRO_KEY]: "x".repeat(16001) })).toBeNull();
});
