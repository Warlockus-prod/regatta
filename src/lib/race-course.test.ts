import { describe, expect, it } from "vitest";
import { makeStandardCourse, raceAutopilotTurn, stepBoat, updateLap, resolveCollisions, windAt, type RaceBoat } from "./race-physics";
const boat = (): RaceBoat => ({ id: "one", name: "one", color: "white", pos: {x:365,y:1080}, heading:45, speed:0, lapDone:0 });
// Race one boat with the autopilot; wind 0 unless a ws-server style seed and
// strength are given. Returns the boat at the end. The server ticks at 0.05 s;
// the bulk sweeps use 0.1 s, which the autopilot sails the same (every start in
// four winds finishes at 1/60, 0.05, 0.1 and 0.2 s, medians within 1 s).
function sail(b: RaceBoat, wind?: { seed: number; mul: number }, dt = .05): RaceBoat {
  const c = makeStandardCourse();
  for (let t = 0; t < 600 && b.lapDone < 2; t += dt) {
    const w = wind ? windAt(t, wind.seed) : { dir: 0, gust: 1 };
    const prev = { ...b.pos };
    stepBoat(b, dt, w.dir, w.gust, { turn: raceAutopilotTurn(b, c, w.dir) }, { windStrengthMul: wind?.mul ?? 1 });
    updateLap(b, prev, c, t);
  }
  return b;
}
// ws-server/server.js spawnBoat for 2 to 8 boats: 19 distinct places on the line.
function spawnSpots() {
  const line = makeStandardCourse().startLine, cx = (line.a.x + line.b.x) / 2, seen = new Map<string, { x: number; heading: number }>();
  for (let total = 2; total <= 8; total++) for (let i = 0; i < total; i++) {
    const t = (i / (total - 1)) * 2 - 1, x = cx + t * 80, heading = t > 0 ? 315 : 45;
    seen.set(`${x.toFixed(1)}/${heading}`, { x, heading });
  }
  return [...seen.values()];
}
describe("one complete fair regatta", () => {
  it("does not award a touched mark or wrong-side shortcut", () => {
    const b = boat(), c = makeStandardCourse();
    b.started = true; b.pos = {...c.marks[0].pos};
    expect(updateLap(b,{x:400,y:200},c,10)).toBeNull();
    expect(b.lapDone).toBe(0);
    b.pos = {x:350,y:160};
    expect(updateLap(b,{x:350,y:200},c,11)).toBeNull();
    expect(b.roundPhase ?? 0).toBe(0);
  });
  it("finishes through start, port-rounding gates and finish with the common engine", () => {
    const b = sail(boat());
    expect(b.lapDone, JSON.stringify(b)).toBe(2);
    expect(b.finishTime).toBeGreaterThan(20);
  });
  // A boat over the line before the gun sails a loop beside the line and
  // restarts. With the old pure-pursuit autopilot this start orbited 60 units
  // under the line (inside its own turning circle) or, pointing downwind at an
  // upwind target, flipped between the two close-hauled headings and sat on
  // the bottom edge of the world.
  it("returns after crossing early during countdown and finishes legally", () => {
    const b = boat(), c = makeStandardCourse();
    b.pos.y = c.startLine.a.y - 40;
    b.speed = 4;
    sail(b);
    expect(b.lapDone, JSON.stringify(b)).toBe(2);
  });
  // Bots are placed exactly as ws-server/server.js spawnBoat places them for 2
  // to 8 boats, then raced by the autopilot. Before the rewrite only 16/19
  // finished from a normal start and 11/19 after starting early; the rest never
  // finished, which players saw as bots that sail off and never come back.
  // Every one must finish; never lower these to make a change pass.
  it("finishes from every real spawn position, on time and early", () => {
    const c = makeStandardCourse(), line = c.startLine;
    const finished = { spawn: 0, early: 0 };
    const spots = spawnSpots();
    for (const { x, heading } of spots) for (const mode of ["spawn", "early"] as const) {
      const b = sail({ ...boat(), pos: { x, y: line.a.y + (mode === "spawn" ? 30 : -40) }, heading, speed: mode === "spawn" ? 0 : 4 });
      if (b.lapDone === 2) finished[mode]++;
    }
    expect(spots.length).toBe(19);
    expect(finished.spawn).toBe(19);
    expect(finished.early).toBe(19);
  }, 30_000); // 38 full races: about 2 s alone, over the 5 s default when files run in parallel
  // Starts around the line on any heading, standing still or moving: the old
  // autopilot finished 66 of these 120.
  it("finishes from varied starts around the line", () => {
    let finished = 0, n = 0;
    for (const x of [300, 330, 365, 400, 430]) for (const dy of [-40, 20, 60]) for (const heading of [45, 90, 270, 315]) for (const speed of [0, 4]) {
      n++;
      if (sail({ ...boat(), pos: { x, y: 1050 + dy }, heading, speed }, undefined, .1).lapDone === 2) finished++;
    }
    expect(finished).toBe(n);
  }, 60_000);
  // The multiplayer server shifts the wind and ends a race after 300 s. The
  // turning circle grows with boat speed, so the heavy breeze is the hard case
  // for the rounding gates (the old autopilot finished 11 of these 19 there).
  it("finishes inside the server's 300 s in light, normal and heavy shifting wind", () => {
    const line = makeStandardCourse().startLine;
    for (const mul of [0.65, 1, 1.3]) for (const { x, heading } of spawnSpots()) {
      const b = sail({ ...boat(), pos: { x, y: line.a.y + 30 }, heading }, { seed: 3, mul }, .1);
      expect(b.lapDone, `wind x${mul} from x ${x.toFixed(0)}`).toBe(2);
      expect(b.finishTime!).toBeLessThan(300);
    }
  }, 60_000);
  // The server reuses a bot's object across rematches; the autopilot keeps its
  // memory on the boat and must sail the new race like a fresh boat.
  it("sails a reused boat through a new race like a fresh one", () => {
    const b = sail(boat()), first = b.finishTime!;
    expect(b.lapDone).toBe(2);
    Object.assign(b, { pos: { x: 365, y: 1080 }, heading: 45, speed: 0, lapDone: 0, started: false, roundPhase: 0, finishTime: undefined });
    sail(b);
    expect(b.lapDone).toBe(2);
    expect(Math.abs(b.finishTime! - first)).toBeLessThan(1);
  });
  it("has no rudder authority while stationary and separates coincident boats", () => {
    const a=boat(), b={...boat(),id:"two",pos:{...boat().pos}};
    stepBoat(a,.05,0,1,{turn:1});
    expect(a.heading).toBe(45);
    a.pos={...b.pos}; resolveCollisions([a,b]);
    expect(Math.hypot(a.pos.x-b.pos.x,a.pos.y-b.pos.y)).toBeCloseTo(22);
  });
});
