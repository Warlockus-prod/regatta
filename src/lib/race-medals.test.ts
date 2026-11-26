import { describe, expect, it } from "vitest";
import { MEDAL_THRESHOLDS_REVISION } from "@/data/race-medals";
import { LEGACY_RACE_CONTEXT, PHYSICAL_RACE_PROFILES, physicalRaceContext } from "./race-context";
import {
  MEDAL_STORE_MAX_CHARS, RACE_MEDALS_STORAGE_KEY, awardRaceMedal, courseMedal, entryMedal, gradeRaceMedal, isMedalStoreText, medalCourseKey,
  medalThresholds, nextMedalGoal, parseMedalStore, raceUsesHints, readMedalStore, writeMedalStore, type MedalCourse, type MedalStore,
} from "./race-medals";

// Contract (M4-5, decision #8): any finish inside the limit is at least
// bronze; gold only without route and trim hints; a course medal never goes
// down; the physical trial never gets one.
const easy: MedalCourse = { raceContext: LEGACY_RACE_CONTEXT, difficulty: "easy", windStrength: "medium" };
const t = medalThresholds(easy)!;
const memory = () => { const rows = new Map<string, string>(); return { getItem: (k: string) => rows.get(k) ?? null, setItem: (k: string, v: string) => void rows.set(k, v), rows }; };

describe("grading one race", () => {
  it("gives bronze for a slow finish, silver under silver, gold under gold only without hints", () => {
    expect(gradeRaceMedal(t, t.bronzeSec, false)).toBe("bronze");
    expect(gradeRaceMedal(t, t.silverSec + 1, false)).toBe("bronze");
    expect(gradeRaceMedal(t, t.silverSec, true)).toBe("silver");
    expect(gradeRaceMedal(t, t.goldSec, false)).toBe("gold");
    expect(gradeRaceMedal(t, t.goldSec - 10, true)).toBe("silver");
  });
  it("gives bronze to a finish that penalties pushed past the race limit, nothing without a finish time", () => {
    expect(gradeRaceMedal(t, t.bronzeSec + 10, false)).toBe("bronze");
    for (const time of [null, undefined, Infinity, NaN, 0, -5]) expect(gradeRaceMedal(t, time, false)).toBeNull();
  });
  it("reads hints from route guidance in both modes and trim hints only in Pro", () => {
    expect(raceUsesHints({ mode: "simple", guidance: true, trimHints: false })).toBe(true);
    expect(raceUsesHints({ mode: "simple", guidance: false, trimHints: true })).toBe(false);
    expect(raceUsesHints({ mode: "pro", guidance: false, trimHints: true })).toBe(true);
    expect(raceUsesHints({ mode: "pro", guidance: false, trimHints: false })).toBe(false);
  });
});

describe("the course medal", () => {
  it("starts with bronze on the first finish and names the next goal", () => {
    const first = awardRaceMedal({}, easy, t.bronzeSec - 1, true)!;
    expect(first.award).toMatchObject({ earned: "bronze", previous: null, medal: "bronze", improved: true });
    expect(first.award.entry).toEqual({ schema: 1, raceClass: "legacy-race-v1:standard:r1", thresholdsRevision: MEDAL_THRESHOLDS_REVISION,
      medal: "bronze", bestSec: t.bronzeSec - 1, bestNoHintsSec: null });
    expect(nextMedalGoal(null, easy)).toEqual({ medal: "bronze", underSec: t.bronzeSec, noHints: false });
    expect(nextMedalGoal("bronze", easy)).toEqual({ medal: "silver", underSec: t.silverSec, noHints: false });
    expect(nextMedalGoal("silver", easy)).toEqual({ medal: "gold", underSec: t.goldSec, noHints: true });
    expect(nextMedalGoal("gold", easy)).toBeNull();
  });

  it("never goes down after a slower race, and a fast race with hints stays silver", () => {
    let store: MedalStore = awardRaceMedal({}, easy, t.silverSec, true)!.store;
    const slow = awardRaceMedal(store, easy, t.bronzeSec - 1, false)!;
    expect(slow.award).toMatchObject({ earned: "bronze", previous: "silver", medal: "silver", improved: false });
    store = slow.store;
    expect(store[medalCourseKey(easy)].bestSec).toBe(t.silverSec);
    const hinted = awardRaceMedal(store, easy, t.goldSec - 5, true)!;
    expect(hinted.award.medal).toBe("silver");
    const clean = awardRaceMedal(hinted.store, easy, t.goldSec, false)!;
    expect(clean.award).toMatchObject({ earned: "gold", previous: "silver", medal: "gold", improved: true });
    expect(clean.award.entry).toMatchObject({ bestSec: t.goldSec - 5, bestNoHintsSec: t.goldSec });
  });

  it("keeps courses apart by class, difficulty and wind", () => {
    const store = awardRaceMedal({}, easy, t.goldSec, false)!.store;
    expect(courseMedal(store, easy)).toBe("gold");
    expect(courseMedal(store, { ...easy, windStrength: "heavy" })).toBeNull();
    expect(courseMedal(store, { ...easy, difficulty: "hard" })).toBeNull();
  });

  it("never awards the physical trial and leaves the store untouched", () => {
    for (const profile of PHYSICAL_RACE_PROFILES) {
      const trial: MedalCourse = { ...easy, raceContext: physicalRaceContext(profile) };
      expect(medalThresholds(trial)).toBeNull();
      expect(awardRaceMedal({}, trial, 60, false)).toBeNull();
      expect(nextMedalGoal(null, trial)).toBeNull();
    }
    expect(awardRaceMedal({}, easy, null, false)).toBeNull();
  });

  it("regrades stored evidence under new thresholds without lowering a medal", () => {
    const entry = awardRaceMedal({}, easy, t.silverSec, false)!.award.entry;
    expect(entry.medal).toBe("silver");
    // A later revision (say M5 in metres) makes that clean time a gold:
    expect(entryMedal(entry, { goldSec: t.silverSec, silverSec: t.silverSec + 10, bronzeSec: 300 })).toBe("gold");
    // A stricter one never takes the silver away:
    expect(entryMedal(entry, { goldSec: 10, silverSec: 20, bronzeSec: 300 })).toBe("silver");
  });
});

describe("the stored row", () => {
  it("round-trips under its versioned key", () => {
    const storage = memory();
    const store = awardRaceMedal({}, easy, t.goldSec, false)!.store;
    expect(writeMedalStore(storage, store)).toBe(true);
    expect(storage.rows.has(RACE_MEDALS_STORAGE_KEY)).toBe(true);
    expect(RACE_MEDALS_STORAGE_KEY).toBe("regatta.race.medals.v1");
    expect(readMedalStore(storage)).toEqual(store);
    expect(isMedalStoreText(storage.getItem(RACE_MEDALS_STORAGE_KEY)!)).toBe(true);
  });

  it("drops corrupt entries on read and refuses a corrupt row whole for the app bridge", () => {
    const good = awardRaceMedal({}, easy, t.goldSec, false)!.store;
    const key = medalCourseKey(easy);
    const bad = { ...good, "legacy-race-v1:standard:r1|hard|medium": { ...good[key], medal: "platinum" },
      "physical-cruiser-v1:short:r1|easy|medium": good[key] };
    expect(parseMedalStore(JSON.stringify(bad))).toEqual(good);
    expect(isMedalStoreText(JSON.stringify(bad))).toBe(false);
    expect(isMedalStoreText(JSON.stringify({ [key]: { ...good[key], bestNoHintsSec: 1 } }))).toBe(false);
    expect(isMedalStoreText("x".repeat(16_001))).toBe(false);
    expect(parseMedalStore("{not json")).toEqual({});
    expect(readMedalStore(null)).toEqual({});
  });
});

// Contract (M5 step 7, ADR-0015 point 11): an earned medal is never evicted.
// A new course on a full row (64 courses, or past the character bound) is
// refused: the award says saved false and the store is the same object,
// every earned entry kept. An improved existing course still saves. A read
// keeps every valid entry in its stored order and never writes.
describe("a full medal row never loses a medal (M5 step 7)", () => {
  const entry = (bestSec: number) => ({ schema: 1 as const, raceClass: "legacy-race-v1:standard:r1" as const, thresholdsRevision: 2, medal: "bronze" as const, bestSec, bestNoHintsSec: null });
  const full = (n = 64) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`legacy-race-v1:standard:r1|x${i}`, entry(100 + i)])) as MedalStore;

  it("refuses the 65th course with saved false and evicts nothing", () => {
    const store = full();
    const before = JSON.stringify(store);
    const awarded = awardRaceMedal(store, easy, t.goldSec, false)!;
    expect(awarded.award).toMatchObject({ earned: "gold", medal: "gold", saved: false });
    expect(awarded.store).toBe(store);
    expect(JSON.stringify(awarded.store)).toBe(before);
    expect(Object.keys(awarded.store)).toHaveLength(64);
  });

  it("still saves a faster race on a course the full row already has", () => {
    const store = { ...full(63), [medalCourseKey(easy)]: entry(t.silverSec + 1) };
    const awarded = awardRaceMedal(store, easy, t.goldSec, false)!;
    expect(awarded.award.saved).toBeUndefined();
    expect(awarded.store[medalCourseKey(easy)].medal).toBe("gold");
    expect(Object.keys(awarded.store)).toHaveLength(64);
    expect(Object.keys(awarded.store).slice(0, 63)).toEqual(Object.keys(store).filter(k => k !== medalCourseKey(easy)));
  });

  it("refuses a course that would pass the character bound, under 64 courses", () => {
    // Long keys fill the row by size first; each entry stays valid.
    const wide: MedalStore = {};
    for (let i = 0; JSON.stringify(wide).length < MEDAL_STORE_MAX_CHARS - 100; i++) {
      wide[`legacy-race-v1:standard:r1|${"w".repeat(200)}${i}`] = entry(100 + i);
      if (JSON.stringify(wide).length > MEDAL_STORE_MAX_CHARS) { delete wide[`legacy-race-v1:standard:r1|${"w".repeat(200)}${i}`]; break; }
    }
    expect(Object.keys(wide).length).toBeLessThan(64);
    expect(JSON.stringify(wide).length).toBeGreaterThan(MEDAL_STORE_MAX_CHARS - 150);
    expect(JSON.stringify(wide).length).toBeLessThanOrEqual(MEDAL_STORE_MAX_CHARS);
    const awarded = awardRaceMedal(wide, easy, t.goldSec, false)!;
    expect(awarded.award.saved).toBe(false);
    expect(awarded.store).toBe(wide);
  });

  it("reads every valid entry in order without writing", () => {
    const text = JSON.stringify(full());
    const storage = { getItem: () => text, setItem: () => { throw new Error("a read must not write"); } };
    expect(Object.keys(readMedalStore(storage))).toEqual(Object.keys(JSON.parse(text)));
  });
});
