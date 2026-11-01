import { describe, expect, it } from "vitest";
import { makeStandardCourse, updateLap, type RaceBoat, type Vec2 } from "./race-physics";
import { createMissedMarkState, detectMissedMark, MISSED_MARK_CLEARANCE, MISSED_MARK_COOLDOWN_SEC } from "./race-missed-mark";

const course = makeStandardCourse();
const lineY = course.finishLine.a.y; // 1050, x 320..480
const DT = 1 / 30;

/** Sail a polyline in 4-unit steps at 30 Hz the way the race loop does:
 * the detector reads lapDone before updateLap, then updateLap runs. */
function sail(path: Vec2[], opts: { racing?: boolean } = {}) {
  const racing = opts.racing ?? true;
  const boat: RaceBoat = { id: "player", name: "You", color: "#fff", pos: { ...path[0] }, heading: 0, speed: 5, lapDone: 0 };
  let state = createMissedMarkState();
  let time = 0;
  const notices: number[] = [];
  const laps: string[] = [];
  for (let i = 1; i < path.length; i++) {
    const from = path[i - 1], to = path[i];
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 4));
    for (let s = 1; s <= steps; s++) {
      const prevPos = { ...boat.pos };
      boat.pos = { x: from.x + (to.x - from.x) * s / steps, y: from.y + (to.y - from.y) * s / steps };
      time += DT;
      if (!racing) continue;
      const checked = detectMissedMark(state, { prevPos, pos: boat.pos, lapDone: boat.lapDone, started: boat.started, course, time });
      state = checked.state;
      if (checked.missed) notices.push(time);
      const event = updateLap(boat, prevPos, course, time);
      if (event) laps.push(event);
    }
  }
  return { boat, notices, laps, time };
}

describe("detectMissedMark", () => {
  it("stays silent on a proper lap: start, round the windward mark to port, finish", () => {
    const run = sail([
      { x: 450, y: 1100 }, { x: 450, y: 150 },          // start, climb east of the mark
      { x: 350, y: 150 },                               // pass north of it
      { x: 350, y: 1100 },                              // run down west of it and finish
    ]);
    expect(run.laps).toEqual(["mark", "finish"]);
    expect(run.boat.lapDone).toBe(2);
    expect(run.notices).toEqual([]);
  });

  it("gives one notice when the boat comes back down across the line without rounding", () => {
    const run = sail([{ x: 400, y: 1100 }, { x: 400, y: 600 }, { x: 400, y: 1100 }, { x: 400, y: 1180 }]);
    expect(run.laps).toEqual([]);
    expect(run.boat.lapDone).toBe(0);
    expect(run.notices).toHaveLength(1);
    // Said on the tick it crossed the line, not before.
    const crossedAt = (1100 - 600) / 4 * DT + (lineY + 2 - 600) / 4 * DT;
    expect(run.notices[0]).toBeGreaterThan(crossedAt - 2 * DT);
    expect(run.notices[0]).toBeLessThan(crossedAt + 2 * DT);
  });

  it("does not speak for a wobble across the line near the start, before or right after the gun", () => {
    const wobble = [{ x: 400, y: lineY + 15 }];
    for (let i = 0; i < 6; i++) wobble.push({ x: 400 + i * 10, y: lineY - 15 }, { x: 405 + i * 10, y: lineY + 15 });
    expect(sail(wobble, { racing: false }).notices).toEqual([]);
    const afterGun = sail(wobble);
    expect(afterGun.boat.started).toBe(true);
    expect(afterGun.notices).toEqual([]);
  });

  it("ignores a crossing upwards and one beside the line", () => {
    // Back down outside the line's ends, then up through it: never a finish-direction crossing.
    const run = sail([{ x: 400, y: 1100 }, { x: 400, y: 700 }, { x: 600, y: 700 }, { x: 600, y: 1100 }, { x: 400, y: 1100 }, { x: 400, y: 900 }]);
    expect(run.notices).toEqual([]);
  });

  it("repeats only after the cooldown and a new climb clear of the line", () => {
    const leg = (n: number) => [{ x: 400, y: 1100 }, { x: 400, y: lineY - MISSED_MARK_CLEARANCE - 10 - n }];
    // Two quick returns: the second is inside the cooldown.
    const quick = sail([...leg(0), ...leg(0), { x: 400, y: 1100 }]);
    expect(quick.time).toBeLessThan(MISSED_MARK_COOLDOWN_SEC + 2);
    expect(quick.notices).toHaveLength(1);
    // A long climb outlasts the cooldown, so the second return is told again.
    const slow = sail([...leg(0), ...leg(780), { x: 400, y: 1100 }]);
    expect(slow.notices).toHaveLength(2);
    expect(slow.notices[1] - slow.notices[0]).toBeGreaterThanOrEqual(MISSED_MARK_COOLDOWN_SEC);
    // Dipping back over the line straight after a notice does not re-arm it.
    const dip = sail([...leg(400), { x: 400, y: 1100 }, { x: 400, y: lineY - 20 }, { x: 400, y: 1100 }]);
    expect(dip.notices).toHaveLength(1);
    // Loitering just above the line past the cooldown does not re-arm it either:
    // only a new climb clear of the line does.
    const loiter: Vec2[] = [...leg(400), { x: 400, y: 1100 }, { x: 330, y: lineY - 20 }];
    for (let i = 0; i < 15; i++) loiter.push({ x: 470, y: lineY - 20 }, { x: 330, y: lineY - 20 });
    loiter.push({ x: 400, y: 1100 });
    const lingered = sail(loiter);
    expect(lingered.time - lingered.notices[0]).toBeGreaterThan(MISSED_MARK_COOLDOWN_SEC + 2);
    expect(lingered.notices).toHaveLength(1);
  });

  it("is silent once the mark is rounded", () => {
    const state = { armed: true, lastNoticeAt: null };
    const frame = { prevPos: { x: 400, y: lineY - 3 }, pos: { x: 400, y: lineY + 3 }, started: true, course, time: 100 };
    expect(detectMissedMark(state, { ...frame, lapDone: 0 }).missed).toBe(true);
    expect(detectMissedMark(state, { ...frame, lapDone: 1 }).missed).toBe(false);
    expect(detectMissedMark(state, { ...frame, lapDone: 0, started: false }).missed).toBe(false);
  });
});
