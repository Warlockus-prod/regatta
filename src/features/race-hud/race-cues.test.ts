import { describe, expect, it } from "vitest";
import { MIN_BOAT_SEPARATION, calcTWA, stepBoat, type RaceBoat } from "@/lib/race-physics";
import { classifyManoeuvre, createManoeuvreState } from "@/lib/race-manoeuvres";
import { RACE_START_JOSTLE_SECONDS } from "@/lib/race-start-jostle";
import { CONTACT_CUE, TURN_COST, contactCue, createContactCueState, playerTouching, watchTurn, type TurnWatch } from "./race-cues";

// Contract (M1-3): the cost of a tack is told when the boat is slowest (as
// soon as it picks up again), not 4 s after the tack; it is the drop from the
// best speed before to the true minimum. A contact frame is raised once per
// contact, never in the start jostle, and not again within the cooldown.
describe("tack cost at the speed minimum", () => {
  // The race loop's own sequence: stepBoat, classifyManoeuvre, a 3 s speed log, watchTurn.
  function tack() {
    const dt = 1 / 30;
    const boat: RaceBoat = { id: "player", name: "p", color: "w", pos: { x: 400, y: 1000 }, heading: 45, speed: 0, lapDone: 0, isPlayer: true };
    let state = createManoeuvreState();
    const log: { t: number; speed: number }[] = [];
    let watch: TurnWatch | null = null, settledAt = NaN, reportedAt = NaN, loss = NaN;
    let minSpeed = Infinity, minAt = NaN;
    for (let i = 0; i < 30 * 40; i++) {
      const t = i * dt;
      const turning = t >= 20 && boat.heading > 180 ? boat.heading > 316 : t >= 20 && boat.heading <= 180;
      stepBoat(boat, dt, 0, 1, { turn: turning ? -1 : 0 }, { steering: "responsive" });
      log.push({ t, speed: boat.speed });
      while (log[0].t < t - 3) log.shift();
      if (t > 19) { if (boat.speed < minSpeed) { minSpeed = boat.speed; minAt = t; } }
      const c = classifyManoeuvre(state, { twa: calcTWA(boat.heading, 0), speedKn: boat.speed, pinned: false });
      state = c.state;
      if (c.manoeuvre && t > 19) {
        settledAt = t;
        watch = { kind: c.manoeuvre, t, before: Math.max(...log.map(s => s.speed)), min: Math.min(...log.filter(s => s.t >= t - 1).map(s => s.speed)) };
      }
      if (watch) {
        const w = watchTurn(watch, t, boat.speed);
        watch = w.turn;
        if (w.cost && Number.isNaN(reportedAt)) { reportedAt = t; loss = w.cost.lossKn; }
      }
    }
    return { settledAt, reportedAt, loss, minAt, minSpeed };
  }

  it("tells the cost right after the slowest moment, with the real drop", () => {
    const r = tack();
    expect(Number.isFinite(r.settledAt)).toBe(true);
    expect(Number.isFinite(r.reportedAt)).toBe(true);
    // Not the old fixed 4 s after the tack ...
    expect(r.reportedAt - r.settledAt).toBeLessThan(TURN_COST.timeoutSec - 1);
    // ... but within a moment of the true minimum, never before it.
    expect(r.reportedAt).toBeGreaterThanOrEqual(r.minAt);
    expect(r.reportedAt - r.minAt).toBeLessThan(0.5);
    expect(r.loss).toBeGreaterThan(TURN_COST.minLossKn);
  });

  it("waits while the boat still slows down and gives up at the timeout", () => {
    const start: TurnWatch = { kind: "tack", t: 10, before: 6, min: 5 };
    let w = watchTurn(start, 10.1, 4);
    expect(w.cost).toBeNull();
    w = watchTurn(w.turn!, 10.2, 3.5);
    expect(w.cost).toBeNull();
    w = watchTurn(w.turn!, 10.3, 3.5 + TURN_COST.recoverKn - .01);
    expect(w.cost).toBeNull();
    w = watchTurn(w.turn!, 10.4, 3.5 + TURN_COST.recoverKn);
    expect(w.turn).toBeNull();
    expect(w.cost).toEqual({ kind: "tack", lossKn: 2.5 });
    const stuck = watchTurn({ ...start, min: 3 }, 10 + TURN_COST.timeoutSec, 3);
    expect(stuck).toEqual({ turn: null, cost: { kind: "tack", lossKn: 3 } });
    expect(watchTurn({ kind: "gybe", t: 0, before: 5, min: 4.9 }, 1, 5.5)).toEqual({ turn: null, cost: null });
  });
});

describe("contact frame cue", () => {
  const boats = (gap: number, lapDone = 0) => [
    { id: "player", pos: { x: 100, y: 100 }, lapDone: 0, isPlayer: true },
    { id: "bot", pos: { x: 100 + gap, y: 100 }, lapDone },
  ];

  it("sees an overlap with a boat still racing only", () => {
    expect(playerTouching(boats(MIN_BOAT_SEPARATION - 1), MIN_BOAT_SEPARATION)).toBe(true);
    expect(playerTouching(boats(MIN_BOAT_SEPARATION + 1), MIN_BOAT_SEPARATION)).toBe(false);
    expect(playerTouching(boats(5, 2), MIN_BOAT_SEPARATION)).toBe(false);
  });

  it("cues once per contact, after the start jostle and outside the cooldown", () => {
    const t0 = RACE_START_JOSTLE_SECONDS + 5;
    let s = createContactCueState();
    const step = (touching: boolean, t: number, racing = true) => { const r = contactCue(s, { touching, t, racing }); s = r.state; return r.cue; };
    expect(step(true, t0)).toBe(true);
    expect(step(true, t0 + .1)).toBe(false);
    expect(step(false, t0 + .2)).toBe(false);
    expect(step(true, t0 + .3)).toBe(false);
    expect(step(false, t0 + .4)).toBe(false);
    expect(step(true, t0 + CONTACT_CUE.cooldownSec)).toBe(true);
    // One long contact is one frame, however long the hulls stay together.
    expect(step(true, t0 + 3 * CONTACT_CUE.cooldownSec)).toBe(false);
    s = createContactCueState();
    expect(step(true, RACE_START_JOSTLE_SECONDS - .1)).toBe(false);
    expect(step(false, RACE_START_JOSTLE_SECONDS + 1)).toBe(false);
    expect(step(true, 30, false)).toBe(false);
  });
});
