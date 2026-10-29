import { describe, expect, it } from "vitest";
import { LEGACY_RACE_CONTEXT, physicalRaceContext } from "./race-context";
import { GHOST_MAX_SAMPLES, GHOST_STORAGE_KEY, ghostClassKey, ghostPose, isGhostTrack, makeGhostTrack, readGhostStore, rememberGhost, writeGhostStore } from "./race-ghost";

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
