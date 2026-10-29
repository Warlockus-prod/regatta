import { describe, expect, it } from "vitest";
import { createSailingSession, stepSailingSession, type SessionInput } from "../features/sailing-lab/runtime/session";
import { physicalRaceContext } from "./race-context";
import { stepPhysicalBoat, type PhysicalRaceCrew } from "./race-physical-motion";
import type { RaceBoat } from "./race-physics";
import { createInitialState, getBoatParams } from "./sailing-physics";
import type { Controls } from "./sailing-physics/types";

// ADR-0014 contract: the player's physical race boat is the trainer's boat.
// Same start, wind, sheets and helm give the same heading, speed, heel,
// leeway, held sheets, sail positions and metres travelled on every tick.
const WIND = 20, dt = 1 / 30, context = physicalRaceContext("long");
type Scenario = { heading: number; speed: number; seconds: number; at(t: number): Pick<SessionInput, "controls" | "steering"> };
const sheets = (mainSheet: number, jibSheet: number): Controls =>
  ({ mainSheet, jibSheet, mainTwist: .3, jibTwist: .35, reef: 0, jibFurl: 0, jibSide: 1 });
const scenarios: Record<string, Scenario> = {
  "close-hauled with a fixed helm": { heading: 330, speed: 4, seconds: 20,
    at: () => ({ controls: sheets(.85, .8), steering: { mode: "helm", rudder: 0, lowSpeedAssist: false } }) },
  "a tack under full helm, then course assist": { heading: 335, speed: 5, seconds: 25,
    at: t => ({ controls: sheets(.85, .8), steering: t < 6 ? { mode: "helm", rudder: 1, lowSpeedAssist: true }
      : { mode: "course-assist", heading: 65 } }) },
  "bearing away while easing the sheets": { heading: 290, speed: 4.5, seconds: 25,
    at: t => ({ controls: t < 5 ? sheets(.85, .8) : sheets(.4, .35), steering: { mode: "course-assist", heading: t < 5 ? 290 : 150 } }) },
};

describe("one boat in the trainer and the physical race", () => {
  it.each(Object.entries(scenarios))("%s", (_name, scenario) => {
    const params = getBoatParams();
    const start = createInitialState({ tws: 12, trueWindDir: WIND, heading: scenario.heading, boatSpeed: scenario.speed });
    const input = (t: number): SessionInput => ({ ...scenario.at(t), wind: { speed: 12, direction: WIND, mode: "steady" } });
    let trainer = createSailingSession(start, input(0), params, 7);
    const race: RaceBoat & PhysicalRaceCrew = { id: "you", name: "You", color: "cyan", lapDone: 0,
      pos: { x: 400, y: 600 }, heading: scenario.heading, speed: scenario.speed, physics: { ...start } };
    let turned = 0, sailed = 0, last = { east: 0, north: 0 };
    for (let tick = 0; tick < scenario.seconds * 30; tick++) {
      const t = tick * dt, cmd = input(t);
      trainer = stepSailingSession(trainer, cmd, params);
      expect(stepPhysicalBoat(race, dt, WIND, 1, { steering: cmd.steering, autoTrim: false, trim: cmd.controls }, context)).not.toBeNull();
      expect(race.heading).toBeCloseTo(trainer.boat.heading, 9);
      expect(race.speed).toBeCloseTo(trainer.boat.boatSpeed, 9);
      expect(race.physics!.heel).toBeCloseTo(trainer.boat.heel, 9);
      expect(race.physics!.leeway).toBeCloseTo(trainer.boat.leeway, 9);
      expect(race.live).toEqual(trainer.live);
      expect(race.rig).toEqual(trainer.rig);
      expect((race.pos.x - 400) * .6).toBeCloseTo(trainer.position.east, 7);
      expect(-(race.pos.y - 600) * .6).toBeCloseTo(trainer.position.north, 7);
      sailed += Math.hypot(trainer.position.east - last.east, trainer.position.north - last.north);
      last = trainer.position;
      turned = Math.max(turned, Math.abs(((trainer.boat.heading - scenario.heading + 540) % 360) - 180));
    }
    // Each input actually exercises the boat: it moves and the tack/bear-away turn.
    expect(sailed).toBeGreaterThan(30);
    if (scenario !== scenarios["close-hauled with a fixed helm"]) expect(turned).toBeGreaterThan(60);
  });

  it("carries the trainer's sail transfer into the race: a tack costs speed while the sails cross", () => {
    const race: RaceBoat & PhysicalRaceCrew = { id: "you", name: "You", color: "cyan", lapDone: 0,
      pos: { x: 400, y: 600 }, heading: 335, speed: 5 };
    const maneuvers = new Set<string>();
    for (let tick = 0; tick < 8 * 30; tick++) {
      stepPhysicalBoat(race, dt, WIND, 1, { steering: { mode: "helm", rudder: tick < 6 * 30 ? 1 : 0, lowSpeedAssist: true },
        autoTrim: false, trim: sheets(.85, .8) }, context);
      maneuvers.add(race.rig!.maneuver);
    }
    expect(maneuvers.has("tacking")).toBe(true);
  });
});
