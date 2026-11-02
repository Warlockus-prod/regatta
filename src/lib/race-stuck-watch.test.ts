import { describe, expect, it } from "vitest";
import { createRaceStuckWatch, physicalPlayerPinned, RACE_STUCK_WATCH, stepRaceStuckWatch, type RaceStuckWatchFrame } from "./race-stuck-watch";
import { physicalCourseWaterBounds } from "./race-courses";

// Contract (M5, ADR-0015 point 7): the player is told once when it covers
// under 1 m of path in 6 s while touching a hull or the water bound, and at
// most once in 30 s; free sailing never fires.
function run(frames: (t: number) => Omit<RaceStuckWatchFrame, "t">, seconds: number) {
  let state = createRaceStuckWatch();
  const hints: number[] = [];
  for (let tick = 1; tick <= seconds * 30; tick++) {
    const t = tick / 30, out = stepRaceStuckWatch(state, { t, ...frames(t) });
    state = out.state;
    if (out.hint) hints.push(Math.round(t * 30) / 30);
  }
  return hints;
}

describe("race stuck watchdog", () => {
  it("never fires while sailing free, slow or not touching", () => {
    expect(run(() => ({ racing: true, touching: false, stepMetres: 0 }), 120)).toEqual([]);
    expect(run(() => ({ racing: true, touching: false, stepMetres: 2.5 / 30 }), 120)).toEqual([]);
    // Touching but sliding along at 0.5 m/s: 3 m in 6 s.
    expect(run(() => ({ racing: true, touching: true, stepMetres: .5 / 30 }), 120)).toEqual([]);
    // Pinned, but before the start or after the finish.
    expect(run(() => ({ racing: false, touching: true, stepMetres: 0 }), 120)).toEqual([]);
  });

  it("gives one hint after 6 s pinned and suppresses a second within 30 s", () => {
    const hints = run(() => ({ racing: true, touching: true, stepMetres: .01 / 30 }), 35);
    // The window opens on the first touching tick (1/30 s) and closes 6 s later.
    expect(hints).toEqual([6 + 1 / 30].map(t => Math.round(t * 30) / 30));
    // Still pinned: the next one only after the quiet time.
    const longer = run(() => ({ racing: true, touching: true, stepMetres: 0 }), 65);
    expect(longer).toHaveLength(2);
    expect(longer[1] - longer[0]).toBeGreaterThanOrEqual(RACE_STUCK_WATCH.quietSeconds);
    expect(longer[1] - longer[0]).toBeLessThan(RACE_STUCK_WATCH.quietSeconds + RACE_STUCK_WATCH.windowSeconds + .1);
  });

  it("starts the window again when the touch ends or a metre is covered", () => {
    // 5 s pinned, a tick free, 5 s pinned: no 6 s window.
    expect(run(t => ({ racing: true, touching: Math.abs(t - 5) > .02, stepMetres: 0 }), 10)).toEqual([]);
    // Creeping 1.2 m every 5 s while touching: no hint.
    expect(run(t => ({ racing: true, touching: true, stepMetres: Math.round(t * 30) % 150 === 0 ? 1.2 : 0 }), 60)).toEqual([]);
  });

  it("knows a touching hull and the water bound in race units", () => {
    const water = physicalCourseWaterBounds("short");
    const p = { x: 400, y: 900 };
    expect(physicalPlayerPinned("short", p, [])).toBe(false);
    expect(physicalPlayerPinned("short", p, [{ x: 400 + 13.2 / .6, y: 900 }])).toBe(true);
    expect(physicalPlayerPinned("short", p, [{ x: 400 + 14 / .6, y: 900 }])).toBe(false);
    expect(physicalPlayerPinned("short", { x: water.minX, y: 900 }, [])).toBe(true);
    expect(physicalPlayerPinned("short", { x: 400, y: water.maxY - .1 }, [])).toBe(true);
  });
});
