jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { RACE_STORAGE_BRIDGE_SCRIPT, RACE_WEB_STORAGE_KEYS, parseRaceStorageEntries, persistRaceStorage } from "../src/persistence/race-web-storage";
import { GHOST_STORAGE_KEY, GHOST_STORE_MAX_CHARS, ghostClassKey, makeGhostTrack, readGhostStore } from "../../src/lib/race-ghost";
import { LEGACY_RACE_CONTEXT } from "../../src/lib/race-context";

// Contract (M4-4): the personal ghost row the offline race WebView writes
// after a finish crosses the bridge, is checked whole, reaches AsyncStorage
// and comes back to the page with the other race rows, so the app races
// against your best of the class after a relaunch. A corrupt or oversized
// row is refused instead of overwriting the stored one.
const key = ghostClassKey({ raceContext: LEGACY_RACE_CONTEXT, mode: "simple", difficulty: "easy", windStrength: "medium", missionId: null });
const track = makeGhostTrack(key, 300, Array.from({ length: 600 }, (_, i) => ({ t: i * .5, x: 400 + i / 3, y: 1000 - i, heading: 352.25, speed: 5.5, lap: i < 300 ? 0 : 1 })), [150])!;
const row = JSON.stringify({ [key]: track });

beforeEach(async () => { await AsyncStorage.clear(); });

it("lets a 5-minute ghost row cross the bridge and persists it", async () => {
  expect(RACE_WEB_STORAGE_KEYS).toContain(GHOST_STORAGE_KEY);
  expect(RACE_STORAGE_BRIDGE_SCRIPT).toContain(`"${GHOST_STORAGE_KEY}"`);
  expect(row.length).toBeGreaterThan(16000);
  expect(parseRaceStorageEntries({ [GHOST_STORAGE_KEY]: row })).toEqual({ [GHOST_STORAGE_KEY]: row });
  await persistRaceStorage({ [GHOST_STORAGE_KEY]: row });
  const stored = await AsyncStorage.getItem(GHOST_STORAGE_KEY);
  expect(stored).toBe(row);
  const back = readGhostStore({ getItem: () => stored })[key];
  expect(back.finishTimeSec).toBe(300);
  expect(back.marks).toEqual([150]);
  expect(back.samples).toHaveLength(600);
});

it("refuses a corrupt or oversized ghost row and keeps the stored one", async () => {
  await persistRaceStorage({ [GHOST_STORAGE_KEY]: row });
  const corrupt = JSON.stringify({ [key]: { ...track, samples: [...track.samples].reverse() } });
  expect(parseRaceStorageEntries({ [GHOST_STORAGE_KEY]: corrupt })).toBeNull();
  expect(parseRaceStorageEntries({ [GHOST_STORAGE_KEY]: "x".repeat(GHOST_STORE_MAX_CHARS + 1) })).toBeNull();
  await expect(persistRaceStorage({ [GHOST_STORAGE_KEY]: corrupt })).rejects.toThrow();
  expect(await AsyncStorage.getItem(GHOST_STORAGE_KEY)).toBe(row);
  // The other rows keep their old 16 000 character limit.
  expect(parseRaceStorageEntries({ "regatta.race.view.v1": "x".repeat(16001) })).toBeNull();
});
