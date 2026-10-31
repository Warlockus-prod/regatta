jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { RACE_STORAGE_BRIDGE_SCRIPT, RACE_WEB_STORAGE_KEYS, parseRaceStorageEntries, persistRaceStorage } from "../src/persistence/race-web-storage";

// Contract (M1-5): the race sound choice made in the offline race WebView
// survives an app relaunch: its row is allowed through the bridge, reaches
// AsyncStorage and is handed back to the page with the other race rows.
// Same literal as RACE_SOUND_KEY in src/lib/sounds.ts (the web test checks
// that this file lists it).
const RACE_SOUND_KEY = "regatta.race.sound.v1";

beforeEach(async () => { await AsyncStorage.clear(); });

it("lets the race sound row cross the bridge and persists both choices", async () => {
  expect(RACE_WEB_STORAGE_KEYS).toContain(RACE_SOUND_KEY);
  expect(RACE_STORAGE_BRIDGE_SCRIPT).toContain(`"${RACE_SOUND_KEY}"`);
  expect(parseRaceStorageEntries({ [RACE_SOUND_KEY]: "off" })).toEqual({ [RACE_SOUND_KEY]: "off" });
  await persistRaceStorage({ [RACE_SOUND_KEY]: "off" });
  expect(await AsyncStorage.getItem(RACE_SOUND_KEY)).toBe("off");
  await persistRaceStorage({ [RACE_SOUND_KEY]: "on" });
  expect(await AsyncStorage.getItem(RACE_SOUND_KEY)).toBe("on");
  // The old race mute row stays allowed, so an older explicit mute still reaches the page.
  expect(RACE_WEB_STORAGE_KEYS).toContain("regatta.muted.v1");
});

it("still rejects rows that are not race-owned", () => {
  expect(parseRaceStorageEntries({ [RACE_SOUND_KEY]: "on", "regatta.controls.v1": "{}" })).toBeNull();
});
