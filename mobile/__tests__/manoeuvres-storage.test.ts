jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { MANOEUVRES_STORAGE_BRIDGE_SCRIPT, MANOEUVRES_WEB_STORAGE_KEY, isManoeuvresStoreText, parseManoeuvresStorageEntries, persistManoeuvresStorage } from "../src/persistence/manoeuvres-web-storage";
import { invalidateNativeDataEpoch, nativeDataEpoch } from "../src/persistence/data-epoch";
import { sailingNativeDestination } from "../src/navigation/sailing-entry";
import { destinations } from "../../src/lib/product/catalog";

// Contract: the stars a learner earns in the bundled Manoeuvres page survive an
// app relaunch. The one progress row crosses the bridge to AsyncStorage and only
// a well-formed row does; the Practice hub opens the native screen.
// Same literal as MANOEUVRES_STORAGE_KEY in src/features/manoeuvres/progress.ts.
const KEY = "regatta.manoeuvres.v1";
const row = JSON.stringify({ version: 1, stars: { "alongside-onshore": 3, "spring-off": 1 } });

beforeEach(async () => { await AsyncStorage.clear(); });

it("lets the progress row cross the bridge, persist and be removed", async () => {
  expect(MANOEUVRES_WEB_STORAGE_KEY).toBe(KEY);
  expect(MANOEUVRES_STORAGE_BRIDGE_SCRIPT).toContain(`"${KEY}"`);
  expect(parseManoeuvresStorageEntries({ [KEY]: row })).toEqual({ [KEY]: row });
  await persistManoeuvresStorage({ [KEY]: row });
  expect(await AsyncStorage.getItem(KEY)).toBe(row);
  await persistManoeuvresStorage({ [KEY]: null });
  expect(await AsyncStorage.getItem(KEY)).toBeNull();
});

it("refuses other keys, corrupt rows and out-of-range stars", () => {
  expect(parseManoeuvresStorageEntries({ "regatta.race.ghost.v1": row })).toBeNull();
  expect(parseManoeuvresStorageEntries({ [KEY]: "{not json" })).toBeNull();
  expect(isManoeuvresStoreText(JSON.stringify({ version: 2, stars: {} }))).toBe(false);
  expect(isManoeuvresStoreText(JSON.stringify({ version: 1, stars: { a: 4 } }))).toBe(false);
  expect(isManoeuvresStoreText(JSON.stringify({ version: 1, stars: { a: 0 } }))).toBe(false);
  expect(isManoeuvresStoreText(JSON.stringify({ version: 1, stars: {} }))).toBe(true);
  expect(isManoeuvresStoreText("x".repeat(5000))).toBe(false);
});

it("does not write after a global clear started", async () => {
  const ticket = nativeDataEpoch();
  invalidateNativeDataEpoch();
  await expect(persistManoeuvresStorage({ [KEY]: row }, ticket)).rejects.toThrow("stale-manoeuvres-storage");
  expect(await AsyncStorage.getItem(KEY)).toBeNull();
});

it("is reachable from the app's Practice hub", () => {
  expect(destinations.find(d => d.id === "manoeuvres")).toMatchObject({ section: "practice", native: "/manoeuvres" });
  expect(sailingNativeDestination("/manoeuvres")).toBe("/manoeuvres");
});
