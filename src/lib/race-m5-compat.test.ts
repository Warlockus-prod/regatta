// ADR-0015 point 11, "nothing earned is lost". Contract: the race rows that
// TestFlight 74 wrote (literal fixtures in race-m5-compat.fixtures.ts) are
// read by the current readers to exactly the values build 74 read, and a
// write of one entry keeps every other entry byte for byte. Rows written by
// the current writers still pass the frozen build 74 validators
// (race-m5-compat.parsers74.ts) without losing an entry, so a TestFlight
// rollback to 74 or 73 is safe. Later M5 steps must keep this file green.
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  BUILD74_BEST_TIMES_ROW, BUILD74_GHOST_ROW, BUILD74_HINTS_SEEN_ROW, BUILD74_MEDALS_ROW,
  BUILD74_NATIVE_HISTORY_ROW, BUILD74_RACE_HOME_ROW, BUILD74_RACE_ROWS, BUILD74_RESUME_ROWS, BUILD74_SHARED_REPLAY_RESPONSE,
} from "./race-m5-compat.fixtures";
import {
  isGhostStoreText74, isMedalStoreText74, isRaceHomeStoreText74, parseMedalStore74,
  raceComparisonKey74, readRaceComparison74, readRaceContext74,
} from "./race-m5-compat.parsers74";
import { BEST_TIMES_STORAGE_KEY, getBestRecord, planBestRecordUpdate } from "./best-times";
import { LEGACY_RACE_CONTEXT, physicalRaceContext, readRaceContext } from "./race-context";
import { raceComparisonKey } from "./race-record-class";
import {
  GHOST_STORAGE_KEY, ghostClassKey, ghostMarkTimes, isGhostStoreText, makeGhostTrack, readGhostStore, rememberGhost,
} from "./race-ghost";
import {
  RACE_MEDALS_STORAGE_KEY, awardRaceMedal, courseMedal, isMedalStoreText, parseMedalStore, readMedalStore, type MedalStore,
} from "./race-medals";
import {
  RACE_HOME_STORAGE_KEY, hasRacedBefore, isRaceHomeStoreText, parseRaceHomeStore, readRaceHomeStore, recordRaceEnd, writeRaceHomeStore,
} from "./race-next-step";
import { inspectRaceSetup } from "./race-resume";
import { FIRST_RACE_HINTS_KEY, readFirstRaceHints } from "@/features/race-hud/first-race-hints";
import { sharedReplay } from "./race-replay";
import { validateNativeRace } from "./race-native";

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

class MemoryStorage {
  readonly rows = new Map<string, string>();
  constructor(rows: Readonly<Record<string, string>> = {}) { for (const [k, v] of Object.entries(rows)) this.rows.set(k, v); }
  getItem(key: string) { return this.rows.get(key) ?? null; }
  setItem(key: string, value: string) { this.rows.set(key, String(value)); }
  removeItem(key: string) { this.rows.delete(key); }
  snapshot() { return Object.fromEntries(this.rows); }
}

/** Every other top-level entry keeps its position and its exact text. */
function expectOthersByteForByte(before: string, after: string, changedKey: string) {
  const a = JSON.parse(before) as Record<string, unknown>, b = JSON.parse(after) as Record<string, unknown>;
  const keep = Object.keys(a).filter(k => k !== changedKey);
  expect(Object.keys(b).filter(k => k !== changedKey)).toEqual(keep);
  for (const key of keep) expect(JSON.stringify(b[key]), key).toBe(JSON.stringify(a[key]));
  // And the text itself: the row is the old row with only the changed entry replaced or appended.
  for (const key of keep) expect(after.includes(`${JSON.stringify(key)}:${JSON.stringify(a[key])}`), key).toBe(true);
}

afterEach(() => { vi.unstubAllGlobals(); });

describe("build 74 race rows are pinned literals", () => {
  // A fixture is evidence of what is already on devices: any edit is red here.
  it.each([
    ["best times", BUILD74_BEST_TIMES_ROW, "cfbcf03c7322da197c352457089dbfc51148659e32f218dafee2868a63e9e832"],
    ["ghost", BUILD74_GHOST_ROW, "34ba4896e91b9d5624f9adcf7e662a742a1b4f766a5006ba8b23377c5ea9362f"],
    ["medals", BUILD74_MEDALS_ROW, "7f53e9b603373aabf90e85a302802f47c72bc82e2ee1c15b5d6d69a404549175"],
    ["race home", BUILD74_RACE_HOME_ROW, "86e4053ed2d637b81ff4ce2975108339d4e6fd5a28d8885e321406fc1c88f706"],
    ["resume legacy", BUILD74_RESUME_ROWS.legacy, "261aa1b795f46a8dbe8f4222d0fa2799223d7f18cd3c6a2476837f0685723999"],
    ["resume historical", BUILD74_RESUME_ROWS.historical, "d058ccc7a7b8ba1445644af140e7f4ba9afcbce533ba2265508b3ae0834546b8"],
    ["resume physical", BUILD74_RESUME_ROWS.physical, "f249b4774298b592d4357fc2854c4c2fd2cbee9539175d29315c554b460a677d"],
    ["hints seen", BUILD74_HINTS_SEEN_ROW, "ba3e5ead48e6fb5e220ef3f49578ec0356e6aeaa6304453d8dd5950b95261a42"],
    ["native race history", BUILD74_NATIVE_HISTORY_ROW, "167af0fb99fb0cabaeda0c4f333ef9965491cefb6bc307bf308783f8fb8095eb"],
    ["shared replay answer", BUILD74_SHARED_REPLAY_RESPONSE, "3d9249b43ed84d3fe61461f5ebfc5083d39dc16cd561372f967c0c85b1aedd03"],
  ])("%s", (_name, row, hash) => { expect(sha256(row)).toBe(hash); });

  it("keys the device snapshot by the live storage keys", () => {
    expect(Object.keys(BUILD74_RACE_ROWS).sort()).toEqual([BEST_TIMES_STORAGE_KEY, FIRST_RACE_HINTS_KEY, GHOST_STORAGE_KEY,
      RACE_HOME_STORAGE_KEY, RACE_MEDALS_STORAGE_KEY, "regatta.race-resume.v1"].sort());
  });
});

describe("current readers return what build 74 read", () => {
  it("best times: every legacy, Pro and metric bucket", () => {
    vi.stubGlobal("window", { localStorage: new MemoryStorage({ [BEST_TIMES_STORAGE_KEY]: BUILD74_BEST_TIMES_ROW }) });
    expect(getBestRecord("easy", "light")).toEqual({ timeSec: 238.4, ts: 1761000000000 });
    expect(getBestRecord("easy", "light", "simple", LEGACY_RACE_CONTEXT)).toEqual({ timeSec: 238.4, ts: 1761000000000 });
    expect(getBestRecord("medium", "medium")).toEqual({ timeSec: 101.25, ts: 1761000100000 });
    expect(getBestRecord("hard", "heavy", "simple")).toEqual({ timeSec: 75.5, ts: 1761000200000 });
    expect(getBestRecord("easy", "light", "pro")).toEqual({ timeSec: 244.75, ts: 1761000300000 });
    expect(getBestRecord("hard", "medium", "pro", LEGACY_RACE_CONTEXT)).toEqual({ timeSec: 90.125, ts: 1761000400000 });
    expect(getBestRecord("easy", "light", "simple", physicalRaceContext("short"))).toEqual({ timeSec: 301.5, ts: 1761000500000 });
    // A metric class never reads a legacy bucket, and the other way round.
    expect(getBestRecord("easy", "light", "pro", physicalRaceContext("short"))).toBeNull();
    expect(getBestRecord("hard", "heavy", "simple", physicalRaceContext("short"))).toBeNull();
    expect(getBestRecord("medium", "light")).toBeNull();
  });

  it("best times: the key format of build 74", () => {
    const keys = Object.keys(JSON.parse(BUILD74_BEST_TIMES_ROW));
    expect(keys).toEqual(["easy-light", "medium-medium", "hard-heavy", "pro:easy-light", "pro:hard-medium",
      "ctx:physical-cruiser-v1:short:r1:simple:easy:light"]);
    expect(raceComparisonKey({ difficulty: "easy", windStrength: "light", mode: "simple", raceContext: physicalRaceContext("short") }))
      .toBe("ctx:physical-cruiser-v1:short:r1:simple:easy:light");
    expect(raceComparisonKey({ difficulty: "hard", windStrength: "medium", mode: "pro" })).toBe("pro:hard-medium");
  });

  it("ghosts: three classes with their marks", () => {
    expect(isGhostStoreText(BUILD74_GHOST_ROW)).toBe(true);
    const store = readGhostStore(new MemoryStorage({ [GHOST_STORAGE_KEY]: BUILD74_GHOST_ROW }));
    expect(Object.keys(store)).toEqual([
      "legacy-race-v1:standard:r1|simple|easy|light|-",
      "legacy-race-v1:standard:r1|pro|hard|heavy|-",
      "legacy-race-v1:standard:r1|simple|medium|medium|clean-laps",
    ]);
    expect(store).toEqual(JSON.parse(BUILD74_GHOST_ROW));
    const summary = Object.values(store).map(t => [t.finishTimeSec, t.samples.length, t.marks ?? null, ghostMarkTimes(t)]);
    expect(summary).toEqual([[9.5, 20, [5.01], [5.01]], [7, 15, null, [4]], [5.5, 12, [3], [3]]]);
    expect(store["legacy-race-v1:standard:r1|pro|hard|heavy|-"].samples.at(-1))
      .toEqual({ t: 7, x: 426.66, y: 971.12, heading: 62.28, speed: 4.44, lap: 2 });
    expect(ghostClassKey({ raceContext: LEGACY_RACE_CONTEXT, mode: "simple", difficulty: "medium", windStrength: "medium", missionId: "clean-laps" }))
      .toBe("legacy-race-v1:standard:r1|simple|medium|medium|clean-laps");
  });

  it("medals: revision 2 gold, silver and bronze", () => {
    expect(isMedalStoreText(BUILD74_MEDALS_ROW)).toBe(true);
    const parsed = parseMedalStore(BUILD74_MEDALS_ROW);
    expect(parsed).toEqual({
      "legacy-race-v1:standard:r1|easy|light": { schema: 1, raceClass: "legacy-race-v1:standard:r1", thresholdsRevision: 2, medal: "gold", bestSec: 230.5, bestNoHintsSec: 230.5 },
      "legacy-race-v1:standard:r1|medium|medium": { schema: 1, raceClass: "legacy-race-v1:standard:r1", thresholdsRevision: 2, medal: "silver", bestSec: 100.25, bestNoHintsSec: null },
      "legacy-race-v1:standard:r1|hard|heavy": { schema: 1, raceClass: "legacy-race-v1:standard:r1", thresholdsRevision: 2, medal: "bronze", bestSec: 200, bestNoHintsSec: 200 },
    });
    expect(readMedalStore(new MemoryStorage({ [RACE_MEDALS_STORAGE_KEY]: BUILD74_MEDALS_ROW }))).toEqual(parsed);
    const medal = (difficulty: "easy" | "medium" | "hard", windStrength: "light" | "medium" | "heavy") =>
      courseMedal(parsed, { raceContext: LEGACY_RACE_CONTEXT, difficulty, windStrength });
    expect([medal("easy", "light"), medal("medium", "medium"), medal("hard", "heavy"), medal("easy", "heavy")]).toEqual(["gold", "silver", "bronze", null]);
  });

  it("race home: days, goal and the finished daily race", () => {
    expect(isRaceHomeStoreText(BUILD74_RACE_HOME_ROW)).toBe(true);
    const home = readRaceHomeStore(new MemoryStorage({ [RACE_HOME_STORAGE_KEY]: BUILD74_RACE_HOME_ROW }));
    expect(home).toEqual({ schema: 1, days: ["2026-10-27", "2026-10-30", "2026-10-31"], goal: "tacks", dailyDone: "2026-10-30" });
    expect(parseRaceHomeStore(BUILD74_RACE_HOME_ROW)).toEqual(home);
    expect(hasRacedBefore({ home })).toBe(true);
  });

  it("race resume: legacy, historical and metric intents", () => {
    const at = 1761900000000 + 60_000;
    expect(inspectRaceSetup(BUILD74_RESUME_ROWS.legacy, at)).toEqual({ kind: "ready", setup: { v: 1, difficulty: "medium", windStrength: "light",
      missionId: null, phase: "racing", ts: 1761900000000, mode: "pro", raceContext: null, dailyDay: null } });
    expect(inspectRaceSetup(BUILD74_RESUME_ROWS.historical, at)).toEqual({ kind: "ready", setup: { v: 1, difficulty: "easy", windStrength: "medium",
      missionId: "clean-laps", phase: "briefing", ts: 1761900000000 } });
    expect(inspectRaceSetup(BUILD74_RESUME_ROWS.physical, at)).toEqual({ kind: "ready", setup: { v: 1, difficulty: "hard", windStrength: "heavy",
      missionId: null, phase: "countdown", ts: 1761900000000, mode: "simple", raceContext: physicalRaceContext("medium") } });
    expect(inspectRaceSetup(BUILD74_RESUME_ROWS.physical, 1761900000000 + 31 * 60_000).kind).toBe("expired");
  });

  it("first race hints: the two hints already shown", () => {
    expect([...readFirstRaceHints(new MemoryStorage({ [FIRST_RACE_HINTS_KEY]: BUILD74_HINTS_SEEN_ROW }))]).toEqual(["no-go", "mark-approach"]);
  });

  it("the frozen build 74 validators agree with the current ones on every fixture", () => {
    expect(isGhostStoreText74(BUILD74_GHOST_ROW)).toBe(true);
    expect(isMedalStoreText74(BUILD74_MEDALS_ROW)).toBe(true);
    expect(parseMedalStore74(BUILD74_MEDALS_ROW)).toEqual(parseMedalStore(BUILD74_MEDALS_ROW));
    expect(isRaceHomeStoreText74(BUILD74_RACE_HOME_ROW)).toBe(true);
    for (const row of Object.values(BUILD74_RESUME_ROWS)) {
      const context = (JSON.parse(row) as { raceContext?: unknown }).raceContext;
      expect(readRaceContext74(context)).toEqual(readRaceContext(context));
    }
    for (const c of [{ difficulty: "easy", windStrength: "light" }, { difficulty: "hard", windStrength: "medium", mode: "pro", raceContext: LEGACY_RACE_CONTEXT },
      { difficulty: "easy", windStrength: "light", mode: "simple", raceContext: physicalRaceContext("short") }, { difficulty: "easy", windStrength: "light", raceContext: physicalRaceContext("long") }]) {
      expect(raceComparisonKey74(c)).toBe(raceComparisonKey(c));
      expect(readRaceComparison74(c).ok).toBe(raceComparisonKey(c) !== null);
    }
  });
});

describe("a write of one entry keeps every other entry byte for byte", () => {
  it("best times: a new bucket appends, a faster time replaces only its own bucket", () => {
    const store = JSON.parse(BUILD74_BEST_TIMES_ROW) as Record<string, unknown>;
    const added = planBestRecordUpdate(store, { difficulty: "medium", windStrength: "light", mode: "simple", raceContext: physicalRaceContext("medium") }, 512.5, 1762000000000);
    expect(added.status).toBe("candidate");
    if (added.status !== "candidate") return;
    expect(added.serialized).toBe(`${BUILD74_BEST_TIMES_ROW.slice(0, -1)},"ctx:physical-cruiser-v1:medium:r1:simple:medium:light":{"timeSec":512.5,"ts":1762000000000}}`);
    const faster = planBestRecordUpdate(store, { difficulty: "easy", windStrength: "light" }, 200, 1762000000000);
    expect(faster.status).toBe("candidate");
    if (faster.status !== "candidate") return;
    expectOthersByteForByte(BUILD74_BEST_TIMES_ROW, faster.serialized, "easy-light");
    // Build 74 still resolves every key of the new row to the same bucket.
    for (const key of Object.keys(JSON.parse(added.serialized))) expect(key.startsWith("ctx:") || /^(pro:)?(easy|medium|hard)-(light|medium|heavy)$/.test(key), key).toBe(true);
    expect(raceComparisonKey74({ difficulty: "medium", windStrength: "light", mode: "simple", raceContext: physicalRaceContext("medium") }))
      .toBe("ctx:physical-cruiser-v1:medium:r1:simple:medium:light");
  });

  it("medals: a new course appends, an improved course replaces only itself, and build 74 keeps them all", () => {
    const store = parseMedalStore(BUILD74_MEDALS_ROW);
    const added = awardRaceMedal(store, { raceContext: LEGACY_RACE_CONTEXT, difficulty: "easy", windStrength: "heavy" }, 90, true)!;
    expect(added).not.toBeNull();
    const addedText = JSON.stringify(added.store);
    expect(addedText.startsWith(BUILD74_MEDALS_ROW.slice(0, -1) + ",")).toBe(true);
    expectOthersByteForByte(BUILD74_MEDALS_ROW, addedText, "legacy-race-v1:standard:r1|easy|heavy");
    const improved = awardRaceMedal(store, { raceContext: LEGACY_RACE_CONTEXT, difficulty: "hard", windStrength: "heavy" }, 70, false)!;
    expect(improved.award.medal).toBe("silver");
    expectOthersByteForByte(BUILD74_MEDALS_ROW, JSON.stringify(improved.store), "legacy-race-v1:standard:r1|hard|heavy");
    for (const text of [addedText, JSON.stringify(improved.store)]) {
      expect(isMedalStoreText74(text)).toBe(true);
      expect(Object.keys(parseMedalStore74(text))).toEqual(Object.keys(JSON.parse(text)));
    }
    // The physical trial has no thresholds: the row is not touched at all.
    expect(awardRaceMedal(store, { raceContext: physicalRaceContext("short"), difficulty: "easy", windStrength: "light" }, 300, false)).toBeNull();
  });

  it("ghosts: a new class appends and a faster race replaces only its own class", () => {
    const store = readGhostStore(new MemoryStorage({ [GHOST_STORAGE_KEY]: BUILD74_GHOST_ROW }));
    const samples = Array.from({ length: 10 }, (_, i) => ({ t: i, x: 400 + i, y: 1000 - i * 5, heading: 45, speed: 4, lap: i === 9 ? 2 : i >= 5 ? 1 : 0 }));
    const key = ghostClassKey({ raceContext: LEGACY_RACE_CONTEXT, mode: "pro", difficulty: "easy", windStrength: "light", missionId: null });
    const added = rememberGhost(store, makeGhostTrack(key, 9, samples, [5])!);
    expect(added.replaced).toBe(true);
    const addedText = JSON.stringify(added.store);
    expect(addedText.startsWith(BUILD74_GHOST_ROW.slice(0, -1) + ",")).toBe(true);
    expectOthersByteForByte(BUILD74_GHOST_ROW, addedText, key);
    const own = "legacy-race-v1:standard:r1|simple|easy|light|-";
    const faster = rememberGhost(store, makeGhostTrack(own, 9, samples, [5])!);
    expect(faster.replaced).toBe(true);
    expectOthersByteForByte(BUILD74_GHOST_ROW, JSON.stringify(faster.store), own);
    for (const text of [addedText, JSON.stringify(faster.store)]) expect(isGhostStoreText74(text)).toBe(true);
  });

  it("race home: writing the row leaves every other race row of the device untouched", () => {
    const storage = new MemoryStorage(BUILD74_RACE_ROWS);
    const home = recordRaceEnd(readRaceHomeStore(storage), { now: new Date(2026, 10, 1, 12, 0), goal: "no-go", dailyDay: null, finished: true });
    expect(writeRaceHomeStore(storage, home)).toBe(true);
    const after = storage.snapshot();
    for (const [key, row] of Object.entries(BUILD74_RACE_ROWS)) if (key !== RACE_HOME_STORAGE_KEY) expect(after[key], key).toBe(row);
    expect(after[RACE_HOME_STORAGE_KEY]).toBe('{"schema":1,"days":["2026-10-27","2026-10-30","2026-10-31","2026-11-01"],"goal":"no-go","dailyDone":"2026-10-30"}');
    expect(isRaceHomeStoreText74(after[RACE_HOME_STORAGE_KEY])).toBe(true);
  });

  it("an award on a full medal row still evicts only by the build 74 rule (pinned until M5 step m5-07-context-producers changes it)", () => {
    // 64 courses: the oldest other course drops. ADR-0015 point 11 forbids
    // that for an earned medal; the step that changes eviction must flip this.
    const full: MedalStore = {};
    for (let i = 0; i < 64; i++) full[`legacy-race-v1:standard:r1|x${i}`] = { schema: 1, raceClass: "legacy-race-v1:standard:r1", thresholdsRevision: 2, medal: "bronze", bestSec: 100, bestNoHintsSec: null };
    const awarded = awardRaceMedal(full, { raceContext: LEGACY_RACE_CONTEXT, difficulty: "easy", windStrength: "light" }, 230, false)!;
    expect(Object.keys(awarded.store)).toHaveLength(64);
    expect(awarded.store["legacy-race-v1:standard:r1|x0"]).toBeUndefined();
  });
});

// The two race records that live outside localStorage: the app's native race
// history (its readers are tested in mobile/__tests__/race-storage-compat.test.ts)
// and the shared replay the /r/<code> viewer reads. Steps m5-07, m5-09 and
// m5-11 change these readers; a build 74 record must keep reading the same.
describe("build 74 native history and shared replay records still read the same", () => {
  it("the shared replay viewer reads the build 74 answer to the same replay", () => {
    const replay = sharedReplay(JSON.parse(BUILD74_SHARED_REPLAY_RESPONSE));
    expect(replay).not.toBeNull();
    const { samples, course, ...rest } = replay!;
    expect(rest).toEqual({ code: "BGMQY8", ts: 1761950000000, nickname: "Skipper", difficulty: "medium", windStrength: "light",
      finishTimeSec: 95.2, views: 0, metadata: { schema: 1, mode: "pro", penaltySeconds: 2 },
      // The ribbon keeps start, tacks and the rounding; the gybe and the finish stay in the row only.
      events: [{ type: "start", t: 0 }, { type: "tack", t: 27.2 }, { type: "mark-rounded", t: 54.4 }] });
    expect(samples).toHaveLength(8);
    expect(samples).toEqual(JSON.parse(BUILD74_SHARED_REPLAY_RESPONSE).samples);
    expect(samples[7]).toEqual({ t: 95.2, x: 429.8, y: 983.5, heading: 52, twa: 37, speed: 5.2, lap: 2,
      trim: { mainSheet: 0.5, jibSheet: 0.45, reef: 0, jibFurl: 0, mainHoisted: true }, windDir: 0 });
    expect(Object.keys(course)).toEqual(["marks", "startLine", "finishLine"]);
    expect(course.marks.map(m => [m.type, m.label, m.labelEn, m.labelPl])).toEqual([
      ["windward", "Верхний знак", "Windward mark", "Znak nawietrzny"],
      ["start", "Старт/Финиш Л", "Start/Finish L", "Start/Meta L"],
      ["start", "Старт/Финиш П", "Start/Finish R", "Start/Meta P"]]);
  });

  it("the native race validator accepts every build 74 snapshot of the history unchanged", () => {
    const records = JSON.parse(BUILD74_NATIVE_HISTORY_ROW) as Array<{ id: string; webRace?: unknown }>;
    expect(records.map(r => r.id)).toEqual(["b74-free-1", "b74-daily-1", "b74-pixel-1"]);
    for (const record of records) if (record.webRace !== undefined) expect(validateNativeRace(record.webRace), record.id).toEqual(record.webRace);
    expect(records[2].webRace).toBeUndefined();
  });
});
