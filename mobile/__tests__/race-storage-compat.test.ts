// ADR-0015 point 11. Contract: (1) every race row TestFlight 74 wrote
// (literal fixtures, src/lib/race-m5-compat.fixtures.ts) still crosses the
// app's race storage bridge whole; (2) every race storage key the web race
// code uses (the race folders, the shared files that own a race row, and any
// "regatta.race..." key anywhere in src) is either carried by the bridge (RACE_WEB_STORAGE_KEYS) or listed
// below as deliberately not persisted in the app. The injected bridge script
// silently ignores writes of an unlisted key (race-web-storage.ts,
// RACE_STORAGE_BRIDGE_SCRIPT), so a forgotten key would lose its data on
// every app restart without any error.
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RACE_WEB_STORAGE_KEYS, parseRaceStorageEntries } from "../src/persistence/race-web-storage";
import { RACE_HISTORY_STORAGE_KEY, readRaces } from "../src/persistence/race-history";
import { projectNativeRaceRecord } from "../src/persistence/race-record-presentation";
import { saveNativeRace } from "../src/persistence/race-native";
import { BUILD74_NATIVE_HISTORY_ROW, BUILD74_RACE_ROWS, BUILD74_RESUME_ROWS } from "../../src/lib/race-m5-compat.fixtures";

/** Race storage keys that stay web-only on purpose. Each needs its reason. */
const NOT_PERSISTED_IN_THE_APP: Readonly<Record<string, string>> = {
  // The desktop full-screen offer (src/app/game/race-fullscreen.ts): the app is full screen already and never shows it.
  "regatta.race.fullscreen-offer.v1": "web desktop only",
  // The device race counter for the first-race funnel (src/lib/funnel.ts, nextRaceNo). Accepted
  // and documented there: inside the app it may restart after a relaunch, so raceNo is an upper
  // bound. It is an analytics number only; no race result, medal or best time depends on it.
  "regatta.race-count.v1": "analytics race number, a restart per app launch is accepted",
};

const ROOT = path.resolve(__dirname, "../..");
/** Shared files outside the race folders that own a race row (they read or write it for the race). */
// regatta.muted.v1 is defined in src/features/trainer-controls/prefs.ts beside trainer-only keys,
// so that file is not scanned; the bridge carries it (RACE_WEB_STORAGE_KEYS).
const SHARED_RACE_FILES = ["src/lib/best-times.ts", "src/lib/funnel.ts", "src/lib/sounds.ts", "src/data/venues/venues.ts"];
const isSource = (name: string) => /\.(ts|tsx)$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name)
  // The step 1 fixtures and frozen validators are test data, not race code.
  && !/^race-m5-compat\./.test(name);
function walk(target: string, files: string[]) {
  if (!statSync(target).isDirectory()) { if (isSource(path.basename(target))) files.push(target); return; }
  for (const name of readdirSync(target)) walk(path.join(target, name), files);
}
/** The web race code: src/lib/race-*, src/features/race-*, src/app/game and SHARED_RACE_FILES. */
function raceSourceFiles(): string[] {
  const files: string[] = [];
  const lib = path.join(ROOT, "src/lib"), features = path.join(ROOT, "src/features");
  for (const name of readdirSync(lib)) if (name.startsWith("race-")) walk(path.join(lib, name), files);
  for (const name of readdirSync(features)) if (name.startsWith("race-")) walk(path.join(features, name), files);
  walk(path.join(ROOT, "src/app/game"), files);
  for (const shared of SHARED_RACE_FILES) walk(path.join(ROOT, shared), files);
  return files;
}
/** Every source file in src: a "regatta.race..." key is race-owned wherever it is defined. */
function allSourceFiles(): string[] {
  const files: string[] = [];
  walk(path.join(ROOT, "src"), files);
  return files;
}

/** Quoted storage-key literals ("regatta.<name>.vN"); comments and template text are not keys. */
function storageKeysIn(file: string): string[] {
  const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'])\/\/.*$/gm, "$1");
  // Plain template literals count too (`regatta.race.sound.v1`); one with ${...} is not a single key.
  return [...code.matchAll(/(["'`])(regatta\.[A-Za-z0-9._-]+\.v\d+)\1/g)].map(m => m[2]);
}

describe("build 74 race rows cross the bridge", () => {
  it("accepts the whole device snapshot unchanged", () => {
    expect(parseRaceStorageEntries(BUILD74_RACE_ROWS)).toEqual(BUILD74_RACE_ROWS);
  });

  it.each(Object.entries(BUILD74_RACE_ROWS))("accepts %s alone", (key, row) => {
    expect(parseRaceStorageEntries({ [key]: row })).toEqual({ [key]: row });
  });

  it.each(Object.entries(BUILD74_RESUME_ROWS))("accepts the %s resume intent", (_kind, row) => {
    expect(parseRaceStorageEntries({ "regatta.race-resume.v1": row })).toEqual({ "regatta.race-resume.v1": row });
  });
});

describe("every web race storage key is carried or deliberately web-only", () => {
  const found = new Map<string, string[]>();
  const add = (key: string, file: string) => found.set(key, [...new Set([...(found.get(key) ?? []), path.relative(ROOT, file)])]);
  for (const file of raceSourceFiles()) for (const key of storageKeysIn(file)) add(key, file);
  for (const file of allSourceFiles()) for (const key of storageKeysIn(file)) if (/^regatta\.race[.-]/.test(key)) add(key, file);

  it("finds the race keys it is meant to watch", () => {
    // A broken scan would pass everything: these keys are known to be in scope.
    for (const key of ["regatta.race.ghost.v1", "regatta.race.medals.v1", "regatta.race.home.v1", "regatta.race.hints-seen.v1",
      "regatta.race.intro-seen.v1", "regatta.race-resume.v1", "regatta.race.fullscreen-offer.v1",
      // Owned by shared files outside the race folders, and a template-literal key.
      "regatta.best-times.v1", "regatta.race-count.v1", "regatta.venue.v1", "regatta.shore.v1", "regatta.race.sound.v1"]) expect([...found.keys()]).toContain(key);
  });

  it.each([...found.keys()].sort())("%s", key => {
    const carried = (RACE_WEB_STORAGE_KEYS as readonly string[]).includes(key);
    const webOnly = Object.prototype.hasOwnProperty.call(NOT_PERSISTED_IN_THE_APP, key);
    expect({ key, files: found.get(key), carried, webOnly }).toEqual(expect.objectContaining({ carried: !webOnly, webOnly: !carried }));
  });

  it("lists no web-only key that the bridge carries anyway", () => {
    for (const key of Object.keys(NOT_PERSISTED_IN_THE_APP)) expect(RACE_WEB_STORAGE_KEYS as readonly string[]).not.toContain(key);
  });
});

// The app's own race history (AsyncStorage regatta.race-history.v1) as build 74
// wrote it: a free legacy race, a daily legacy race and an old pixel-only record.
// Steps m5-07 and m5-11 change race-native and race-record-presentation; these
// records must keep reading, titling and surviving a new save exactly as now.
describe("the build 74 native race history still reads the same", () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  it("reads every record unchanged", async () => {
    await AsyncStorage.setItem(RACE_HISTORY_STORAGE_KEY, BUILD74_NATIVE_HISTORY_ROW);
    expect(await readRaces()).toEqual(JSON.parse(BUILD74_NATIVE_HISTORY_ROW));
  });

  it("titles each record as build 74 did", () => {
    const records = JSON.parse(BUILD74_NATIVE_HISTORY_ROW);
    expect(records.map((record: Parameters<typeof projectNativeRaceRecord>[0]) => projectNativeRaceRecord(record))).toEqual([
      { kind: "historical-world-unclassified", title: { kind: "historical", course: "short" }, historicalKey: "short" },
      { kind: "historical-world-unclassified", title: { kind: "historical", course: "daily" }, historicalKey: "daily" },
      { kind: "legacy-pixel", title: { kind: "historical", course: "short" }, historicalKey: "short" },
    ]);
  });

  it("a new save keeps every build 74 record byte for byte", async () => {
    await AsyncStorage.setItem(RACE_HISTORY_STORAGE_KEY, BUILD74_NATIVE_HISTORY_ROW);
    const first = JSON.parse(BUILD74_NATIVE_HISTORY_ROW)[0];
    await saveNativeRace({ ...first.webRace, id: "after-74", coaching: undefined }, "en");
    const after = JSON.parse((await AsyncStorage.getItem(RACE_HISTORY_STORAGE_KEY))!) as unknown[];
    expect(after.map(r => (r as { id: string }).id)).toEqual(["after-74", "b74-free-1", "b74-daily-1", "b74-pixel-1"]);
    expect(after.slice(1).map(r => JSON.stringify(r))).toEqual(JSON.parse(BUILD74_NATIVE_HISTORY_ROW).map((r: unknown) => JSON.stringify(r)));
  });
});
