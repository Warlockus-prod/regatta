import { describe, expect, it } from "vitest";
import { resolveCollisions, stepBoat, WORLD, type RaceBoat, type Vec2 } from "./race-physics";
import { createGroundSpeedWindow, displayedBoatSpeed, GROUND_SPEED_WINDOW_SEC, recordGroundStep } from "./race-ground-speed";
import { raceScale } from "./race-scale";
import { physicalRaceContext } from "./race-context";
import { makePhysicalRaceCourse } from "./race-courses";
import { stepPhysicalRaceFleet } from "./race-physical-fleet";
import type { PhysicalBotState } from "./race-physical-bot";
import { physicalTrialSteering } from "./race-trial";

const DT = 1 / 30;
const WIND = 0; // from the north

/** Drive the real legacy integrator the way the solo loop does (player:
 * responsive steering, automatic trim) and record every step. */
function run(start: Vec2, heading: number, seconds: number, turn: (t: number) => number = () => 0, speed = 0) {
  const boat: RaceBoat = { id: "player", name: "You", color: "#fff", pos: { ...start }, heading, speed, lapDone: 0 };
  let window = createGroundSpeedWindow();
  const shown: { t: number; boat: number; shown: number; leeway: number; heading: number }[] = [];
  for (let i = 1; i <= Math.round(seconds / DT); i++) {
    const prev = { ...boat.pos };
    stepBoat(boat, DT, WIND, 1, { turn: turn(i * DT), autoTrim: true }, { steering: "responsive" });
    window = recordGroundStep(window, prev, boat.pos, boat.speed, DT);
    shown.push({ t: i * DT, boat: boat.speed, shown: displayedBoatSpeed(window, boat.speed), leeway: boat.physics?.leeway ?? 0, heading: boat.heading });
  }
  return { boat, shown, window };
}

describe("displayedBoatSpeed", () => {
  it("equals the boat speed in open water, accelerating, straight or turning", () => {
    // From rest on a beam reach, then weaving: never near the bounds.
    const { shown } = run({ x: WORLD.width / 2, y: WORLD.height / 2 }, 90, 12, t => (t > 6 ? Math.sin(t * 1.5) : 0));
    expect(shown.at(-1)!.boat).toBeGreaterThan(3);
    for (const row of shown) expect(Math.abs(row.shown - row.boat)).toBeLessThan(0.02);
  });

  it("shows about 0 for a boat pinned in a corner and only the leeway drift when held against a side", () => {
    // Close-hauled into the north-east corner: both axes clamped.
    const corner = run({ x: WORLD.width - 20, y: 20 }, 45, 6);
    const last = corner.shown.at(-1)!;
    expect(last.boat).toBeGreaterThan(1.5);
    expect(last.shown).toBeLessThan(0.01);
    // Beam reach straight into the east side: only leeway moves it along the wall.
    const side = run({ x: WORLD.width - 20, y: WORLD.height / 2 }, 90, 6);
    const held = side.shown.at(-1)!;
    expect(held.boat).toBeGreaterThan(1.5);
    expect(held.shown).toBeLessThan(0.15 * held.boat);
    expect(held.shown).toBeCloseTo(held.boat * Math.abs(Math.sin((held.leeway * Math.PI) / 180)), 1);
  });

  it("shows the part of the speed that slides along the wall", () => {
    // Heading 60 into the east side: x is clamped, y keeps cos(60 + leeway) of the speed.
    const { shown } = run({ x: WORLD.width - 20, y: WORLD.height - 40 }, 60, 6);
    const row = shown.at(-1)!;
    const along = row.boat * Math.abs(Math.cos(((row.heading + row.leeway) * Math.PI) / 180));
    expect(row.boat).toBeGreaterThan(2);
    expect(row.shown).toBeGreaterThan(0.3 * row.boat);
    expect(row.shown).toBeLessThan(0.7 * row.boat);
    expect(Math.abs(row.shown - along)).toBeLessThan(0.05);
  });

  it("comes back to the boat speed within the window after leaving the wall", () => {
    let window = createGroundSpeedWindow();
    for (let i = 0; i < 30; i++) window = recordGroundStep(window, { x: 780, y: 600 }, { x: 780, y: 600 }, 5, DT);
    expect(displayedBoatSpeed(window, 5)).toBe(0);
    for (let i = 0; i < Math.ceil(GROUND_SPEED_WINDOW_SEC / DT) + 1; i++) {
      window = recordGroundStep(window, { x: 700, y: 600 }, { x: 700, y: 600 - 5 * 8 * DT }, 5, DT);
    }
    expect(displayedBoatSpeed(window, 5)).toBeCloseTo(5, 6);
    expect(window.steps.length).toBeLessThanOrEqual(Math.ceil(GROUND_SPEED_WINDOW_SEC / DT) + 1);
  });

  it("never shows more than the boat speed when a collision pushes the boat along", () => {
    // A boat right astern overlaps the player; resolveCollisions shoves the
    // player forward, so it covers more ground than its speed asked for.
    const player: RaceBoat = { id: "player", name: "You", color: "#fff", pos: { x: 400, y: 600 }, heading: 90, speed: 4, lapDone: 0 };
    const other: RaceBoat = { id: "bot", name: "Bot", color: "#000", pos: { x: 392, y: 600 }, heading: 90, speed: 4, lapDone: 0 };
    let window = createGroundSpeedWindow();
    let pushed = false;
    for (let i = 0; i < 15; i++) {
      const prev = { ...player.pos };
      stepBoat(player, DT, WIND, 1, { turn: 0, autoTrim: true }, { steering: "responsive" });
      stepBoat(other, DT, WIND, 1, { turn: 0 });
      resolveCollisions([player, other], DT);
      const travelled = Math.hypot(player.pos.x - prev.x, player.pos.y - prev.y);
      if (travelled > player.speed * 8 * DT * 1.5) pushed = true;
      window = recordGroundStep(window, prev, player.pos, player.speed, DT);
      expect(displayedBoatSpeed(window, player.speed)).toBeLessThanOrEqual(player.speed);
    }
    expect(pushed).toBe(true);
    expect(displayedBoatSpeed(window, player.speed)).toBeCloseTo(player.speed, 6);
  });

  it("trusts the boat when there is nothing to compare and ignores bad input", () => {
    expect(displayedBoatSpeed(createGroundSpeedWindow(), 4)).toBe(4);
    expect(displayedBoatSpeed(createGroundSpeedWindow(), 0)).toBe(0);
    const w = createGroundSpeedWindow();
    expect(recordGroundStep(w, { x: 0, y: 0 }, { x: NaN, y: 0 }, 5, DT)).toBe(w);
    expect(recordGroundStep(w, { x: 0, y: 0 }, { x: 1, y: 0 }, 5, 0)).toBe(w);
  });
});

// M5 step 2: the metric race moves a boat at real speed, so the HUD compares
// the path with the race's own scale (race-scale.ts). Driven through the real
// physical fleet (one boat, short course, wind from the north, strength x1.3).
describe("displayedBoatSpeed in the metric race", () => {
  const scale = raceScale("short");
  function sailMetric(start: Vec2, heading: number, until: (boat: RaceBoat, t: number) => boolean) {
    const context = physicalRaceContext("short"), course = makePhysicalRaceCourse("short");
    let boats: RaceBoat[] = [{ id: "player", name: "You", color: "#fff", pos: { ...start }, heading, speed: 0, lapDone: 0, isPlayer: true, started: true }];
    let window = createGroundSpeedWindow(), navigation: ReadonlyMap<string, PhysicalBotState> | undefined;
    const rows: { t: number; speed: number; shown: number; legacyShown: number }[] = [];
    let legacyWindow = createGroundSpeedWindow();
    for (let i = 1; i <= 30 * 120; i++) {
      const prev = { ...boats[0].pos };
      const stepped = stepPhysicalRaceFleet({ context, course, dt: DT, raceTime: i * DT, racing: true, windDir: WIND, gust: 1, windStrengthMul: 1.3,
        navigation, entries: [{ boat: boats[0], input: { steering: physicalTrialSteering(0, true, heading), autoTrim: true } }] });
      if (!stepped) throw new Error("rejected frame");
      boats = stepped.boats; navigation = stepped.navigation;
      window = recordGroundStep(window, prev, boats[0].pos, boats[0].speed, DT, scale.unitsPerKnotSecond);
      legacyWindow = recordGroundStep(legacyWindow, prev, boats[0].pos, boats[0].speed, DT);
      rows.push({ t: i * DT, speed: boats[0].speed, shown: displayedBoatSpeed(window, boats[0].speed, scale.unitsPerKnotSecond),
        legacyShown: displayedBoatSpeed(legacyWindow, boats[0].speed) });
      if (until(boats[0], i * DT)) break;
    }
    return rows;
  }

  it("shows the model speed in open water, where the legacy scale would show a ninth of it", () => {
    // A run from rest across open water, well clear of the marks and the walls.
    const rows = sailMetric({ x: 700, y: 300 }, 180, b => b.speed >= 4.5);
    const last = rows.at(-1)!;
    expect(last.speed).toBeGreaterThanOrEqual(4.5);
    expect(Math.abs(last.shown - last.speed)).toBeLessThan(0.05);
    expect(last.legacyShown).toBeLessThan(last.speed * 0.2);
  });

  it("shows under 0.3 kn within 1 s for a boat held at the water bound with 4.5 kn of model speed", () => {
    // Running dead downwind into the south wall: the force model keeps its speed, the hull does not move.
    const water = scale.water;
    const rows = sailMetric({ x: 700, y: water.maxY - 0.01 }, 180, (b, t) => b.speed >= 4.5 && t > 1);
    const fast = rows.findIndex(r => r.speed >= 4.5);
    expect(fast).toBeGreaterThan(-1);
    const after = rows.slice(fast).filter(r => r.t <= rows[fast].t + 1);
    expect(after.at(-1)!.shown).toBeLessThan(0.3);
    expect(Math.max(...rows.filter(r => r.t >= 1).map(r => r.shown))).toBeLessThan(0.3);
  });
});
