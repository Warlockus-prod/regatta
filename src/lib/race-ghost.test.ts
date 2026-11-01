import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEGACY_RACE_CONTEXT, physicalRaceContext } from "./race-context";
import { GHOST_MAX_SAMPLES, GHOST_STORAGE_KEY, GHOST_STORE_MAX_CHARS, ghostClassKey, ghostMarkTimes, ghostPose, isGhostStoreText, isGhostTrack,
  makeGhostTrack, readGhostStore, rememberGhost, writeGhostStore, type GhostTrack } from "./race-ghost";

const conditions = { raceContext: LEGACY_RACE_CONTEXT, mode: "simple" as const, difficulty: "easy", windStrength: "medium", missionId: null };
const key = ghostClassKey(conditions);
const track = (finish: number, n = 5) => makeGhostTrack(key, finish,
  Array.from({ length: n }, (_, i) => ({ t: i * .5, x: 400 + i * 10, y: 1000 - i * 10, heading: 350 + i * 5, speed: i, lap: 0 })))!;

describe("personal ghost", () => {
  it("separates every condition that changes the race", () => {
    const keys = new Set([key,
      ghostClassKey({ ...conditions, mode: "pro" }), ghostClassKey({ ...conditions, difficulty: "hard" }),
      ghostClassKey({ ...conditions, windStrength: "heavy" }), ghostClassKey({ ...conditions, missionId: "m1" }),
      ghostClassKey({ ...conditions, raceContext: physicalRaceContext("short") })]);
    expect(keys.size).toBe(6);
  });

  it("keeps only the faster race of the same class", () => {
    const slow = track(90), fast = track(80);
    let s = rememberGhost({}, slow);
    expect(s.replaced).toBe(true);
    s = rememberGhost(s.store, fast);
    expect(s.replaced).toBe(true);
    expect(s.store[key].finishTimeSec).toBe(80);
    expect(rememberGhost(s.store, track(85)).replaced).toBe(false);
  });

  it("interpolates position and the short way round through north, waits at start and stops at the end", () => {
    const g = track(80);
    expect(ghostPose(g, -1)).toMatchObject({ pos: { x: 400, y: 1000 }, speed: 0 });
    const mid = ghostPose(g, .25);
    expect(mid.pos.x).toBeCloseTo(405, 10);
    expect(mid.heading).toBeCloseTo(352.5, 10);
    expect(ghostPose(g, .75).heading).toBeCloseTo(357.5, 10);
    expect(ghostPose(g, 1.25).heading).toBeCloseTo(2.5, 10);
    expect(ghostPose(g, 99)).toMatchObject({ pos: { x: 440, y: 960 }, speed: 0 });
  });

  it("refuses unfair or corrupt tracks instead of guessing", () => {
    expect(makeGhostTrack(key, 80, [{ t: 0, x: 0, y: 0, heading: 0, speed: 0, lap: 0 }])).toBeNull();
    expect(makeGhostTrack(key, 80, Array.from({ length: GHOST_MAX_SAMPLES + 1 }, (_, i) => ({ t: i, x: 0, y: 0, heading: 0, speed: 0, lap: 0 })))).toBeNull();
    const backwards = { ...track(80), samples: [...track(80).samples].reverse() };
    expect(isGhostTrack(backwards)).toBe(false);
    expect(isGhostTrack(track(80), "other-class")).toBe(false);
  });

  it("reads back what it wrote and drops invalid stored entries", () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); } };
    expect(writeGhostStore(storage, { [key]: track(80) })).toBe(true);
    expect(readGhostStore(storage)[key].finishTimeSec).toBe(80);
    mem.set(GHOST_STORAGE_KEY, JSON.stringify({ [key]: track(80), wrong: track(70), bad: { schema: 2 } }));
    expect(Object.keys(readGhostStore(storage))).toEqual([key]);
    mem.set(GHOST_STORAGE_KEY, "{not json");
    expect(readGhostStore(storage)).toEqual({});
    expect(writeGhostStore({ setItem: () => { throw new Error("quota"); } }, {})).toBe(false);
  });
});

// Contract (M4-4): the ghost row keeps each track's mark times through a
// storage round trip, stays under the size the iOS app's race bridge carries
// (dropping the oldest other classes first) and is listed in that bridge.
describe("personal ghost row for splits and the iOS app", () => {
  const long = (finish: number, k: string, n = 1200) => makeGhostTrack(k, finish,
    Array.from({ length: n }, (_, i) => ({ t: i * .5, x: 400.123 + i, y: 1000.456 - i, heading: 123.45, speed: 5.67, lap: i < n / 2 ? 0 : 1 })), [n / 4])!;

  it("round-trips the mark times and checks them", () => {
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); } };
    const withMarks = makeGhostTrack(key, 80, track(80).samples, [1.234])!;
    expect(withMarks.marks).toEqual([1.23]);
    expect(writeGhostStore(storage, { [key]: withMarks })).toBe(true);
    expect(readGhostStore(storage)[key].marks).toEqual([1.23]);
    expect(isGhostStoreText(mem.get(GHOST_STORAGE_KEY)!)).toBe(true);
    expect(ghostMarkTimes(readGhostStore(storage)[key])).toEqual([1.23]);
    expect(isGhostTrack({ ...withMarks, marks: [90] })).toBe(false);
    expect(isGhostTrack({ ...withMarks, marks: [2, 1] })).toBe(false);
    expect(isGhostTrack({ ...withMarks, marks: [] })).toBe(false);
    expect(isGhostStoreText(JSON.stringify({ [key]: withMarks, other: withMarks }))).toBe(false);
    expect(isGhostStoreText("{not json")).toBe(false);
  });

  it("drops the oldest other classes to stay under the bridge size", () => {
    let store = {};
    const keys = ["easy", "medium", "hard", "light", "heavy", "pro", "m1", "m2", "m3", "m4", "m5", "m6"].map(d => ghostClassKey({ ...conditions, difficulty: d }));
    for (const k of keys) store = rememberGhost(store, long(700, k)).store;
    const kept = Object.keys(store);
    expect(JSON.stringify(store).length).toBeLessThanOrEqual(GHOST_STORE_MAX_CHARS);
    expect(kept.length).toBeLessThan(keys.length);
    expect(kept).toEqual(keys.slice(-kept.length));
    expect(isGhostStoreText(JSON.stringify(store))).toBe(true);
  });

  it("drops the class improved least recently, not the one first saved", () => {
    let store: Record<string, GhostTrack> = {};
    const keys = Array.from({ length: 14 }, (_, i) => ghostClassKey({ ...conditions, difficulty: `k${i}` }));
    for (const k of keys) store = rememberGhost(store, long(700, k)).store;
    const first = Object.keys(store)[0];
    // A new best in the oldest kept class moves it to the end of the row.
    store = rememberGhost(store, long(650, first)).store;
    expect(Object.keys(store).at(-1)).toBe(first);
    const next = ghostClassKey({ ...conditions, difficulty: "new" });
    store = rememberGhost(store, long(700, next)).store;
    expect(store[first]?.finishTimeSec).toBe(650);
    expect(store[next]).toBeDefined();
    expect(JSON.stringify(store).length).toBeLessThanOrEqual(GHOST_STORE_MAX_CHARS);
  });

  it("is listed for the iOS app's race storage bridge", () => {
    const file = readFileSync(join(process.cwd(), "mobile/src/persistence/race-web-storage.ts"), "utf8");
    expect(file).toContain(`"${GHOST_STORAGE_KEY}"`);
  });
});
