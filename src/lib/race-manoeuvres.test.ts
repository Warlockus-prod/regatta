import { describe, expect, it } from "vitest";
import { classifyManoeuvre, createManoeuvreState, inNoGoZone, pressedAgainstEdge, type Manoeuvre } from "./race-manoeuvres";
import { calcTWA, WORLD } from "./race-physics";

const BOUNDS = { minX: 20, maxX: WORLD.width - 20, minY: 20, maxY: WORLD.height - 20 };
interface Tick { heading: number; speed: number; pos?: { x: number; y: number } }

/** Feed headings with the wind from north, as the race loop does, and collect what the classifier calls a manoeuvre. */
function run(ticks: Tick[], windDir = 0): Manoeuvre[] {
  let state = createManoeuvreState();
  const out: Manoeuvre[] = [];
  for (const t of ticks) {
    const pinned = pressedAgainstEdge(t.pos ?? { x: 400, y: 600 }, t.heading, BOUNDS);
    const next = classifyManoeuvre(state, { twa: calcTWA(t.heading, windDir), speedKn: t.speed, pinned });
    state = next.state;
    if (next.manoeuvre) out.push(next.manoeuvre);
  }
  return out;
}
/** The rule this replaces: any sign flip of the TWA above 1 kn was a "tack". */
function oldRule(ticks: Tick[]): number {
  let last = 0, n = 0;
  for (const t of ticks) {
    const sign = calcTWA(t.heading, 0) > 0 ? 1 : -1;
    if (last !== 0 && sign !== last && t.speed > 1) n++;
    last = sign;
  }
  return n;
}
/** Turn from `from` to `to` (degrees, the short or the given way) at `step` degrees per tick. */
function turn(from: number, to: number, step: number, speed: (i: number) => number, pos?: Tick["pos"]): Tick[] {
  const ticks: Tick[] = [];
  const n = Math.ceil(Math.abs(to - from) / step);
  for (let i = 0; i <= n; i++) ticks.push({ heading: ((from + (to - from) * i / n) % 360 + 360) % 360, speed: speed(i), pos });
  return ticks;
}
const hold = (heading: number, speed: number, n: number, pos?: Tick["pos"]): Tick[] => Array.from({ length: n }, () => ({ heading, speed, pos }));

describe("manoeuvres in the race log (M0-4)", () => {
  it("counts a close-hauled tack from starboard to port once, as a tack", () => {
    // 315 is TWA -45 with the wind from north, 45 is TWA +45.
    const ticks = [...hold(315, 5.5, 20), ...turn(315, 405, 3, (i) => Math.max(2.5, 5.5 - i * 0.1)), ...hold(45, 4, 20)];
    expect(run(ticks)).toEqual(["tack"]);
    expect(oldRule(ticks)).toBe(1);
  });

  it("calls a turn through dead downwind a gybe, not a tack", () => {
    const ticks = [...hold(135, 6, 20), ...turn(135, 225, 3, () => 6), ...hold(225, 6, 20)];
    expect(run(ticks)).toEqual(["gybe"]);
  });

  it("ignores a wobble around dead downwind on a run", () => {
    const wobble: Tick[] = [];
    for (let k = 0; k < 12; k++) wobble.push(...turn(170, 190, 2, () => 6), ...turn(190, 170, 2, () => 6));
    const ticks = [...hold(150, 6, 10), ...wobble, ...hold(150, 6, 10)];
    expect(oldRule(ticks)).toBe(24);
    expect(run(ticks)).toEqual([]);
  });

  it("ignores a wobble around head to wind and a flip with no way on", () => {
    const shake: Tick[] = [];
    for (let k = 0; k < 6; k++) shake.push(...turn(345, 375, 3, () => 2), ...turn(375, 345, 3, () => 2));
    expect(run([...hold(315, 5, 10), ...shake, ...hold(315, 5, 10)])).toEqual([]);
    // In irons: the boat drifts across the wind below 1 kn.
    expect(run([...hold(315, 3, 10), ...turn(315, 405, 2, () => 0.6), ...hold(45, 2, 10)])).toEqual([]);
  });

  it("ignores heading flips while the world edge pins the boat, but not the same turn in open water", () => {
    const wall = { x: 400, y: BOUNDS.minY };
    const pinnedFlip = [...hold(30, 4, 10, wall), ...turn(30, -30, 3, () => 4, wall), ...hold(330, 4, 10, wall),
      ...turn(330, 390, 3, () => 4, wall), ...hold(30, 4, 10, wall)];
    expect(oldRule(pinnedFlip)).toBe(2);
    expect(run(pinnedFlip)).toEqual([]);
    expect(run(pinnedFlip.map((t) => ({ ...t, pos: undefined })))).toEqual(["tack", "tack"]);
  });

  it("counts a tack off the east edge: the boat leaves the wall as it turns", () => {
    const wall = { x: BOUNDS.maxX, y: 600 };
    const ticks = [...hold(45, 5, 10, wall), ...turn(45, 0, 3, () => 4, wall), ...turn(357, 315, 3, () => 4), ...hold(315, 4, 10)];
    expect(run(ticks)).toEqual(["tack"]);
  });

  it("does not count the first side it sees and keeps counting after a full circle", () => {
    expect(run(hold(45, 5, 10))).toEqual([]);
    // A 360 bearing away from port tack: a gybe, then a tack back onto port.
    const circle = [...hold(45, 5, 5), ...turn(45, 405, 3, () => 5), ...hold(45, 5, 5)];
    expect(run(circle)).toEqual(["gybe", "tack"]);
  });

  it("knows which edge holds the boat", () => {
    expect(pressedAgainstEdge({ x: 400, y: 20 }, 20, BOUNDS)).toBe(true);
    expect(pressedAgainstEdge({ x: 400, y: 20 }, 160, BOUNDS)).toBe(false);
    expect(pressedAgainstEdge({ x: BOUNDS.maxX, y: 600 }, 45, BOUNDS)).toBe(true);
    expect(pressedAgainstEdge({ x: BOUNDS.maxX, y: 600 }, 315, BOUNDS)).toBe(false);
    expect(pressedAgainstEdge({ x: 20, y: BOUNDS.maxY }, 200, BOUNDS)).toBe(true);
    expect(pressedAgainstEdge({ x: 400, y: 600 }, 0, BOUNDS)).toBe(false);
  });

  it("has one no-go definition: within 30 degrees and below 2 kn", () => {
    expect(inNoGoZone(-29, 1.9)).toBe(true);
    expect(inNoGoZone(29, 2)).toBe(false);
    expect(inNoGoZone(31, 0.5)).toBe(false);
    expect(inNoGoZone(Number.NaN, 0)).toBe(false);
  });
});
