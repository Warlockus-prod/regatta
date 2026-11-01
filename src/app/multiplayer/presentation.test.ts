import { describe, expect, it } from "vitest";
import type { Snapshot } from "@/lib/mp-client";
import { FLEET_COLORS as BOAT_FLEET_COLORS, PLAYER_COLOR } from "@/features/race-hud/boat-colors";
import { FLEET_COLORS, createMultiplayerPresentation, multiplayerTurn, withMultiplayerCourse } from "./presentation";

function snapshot(): Snapshot {
  return { t: 12, recvAt: 5000, wind: { dir: 350, gust: 1.1 }, boats: [
    { id: "p_opaque", x: 400, y: 900, h: 45, s: 5.75, l: 0, f: null, target: { x: 470, y: 220 } },
    { id: "bot_1", x: 440, y: 800, h: 180, s: 6.5, l: 1, f: 88.25 },
  ] };
}
const players = [{ id: "p_opaque", nickname: "Skipper" }, { id: "bot_1", nickname: "Mistral" }];

describe("authoritative multiplayer presentation", () => {
  it("maps the opaque player id, race units, speed, lap and finish without advancing them", () => {
    const source = snapshot();
    const before = structuredClone(source);
    const adapter = createMultiplayerPresentation();
    const frame = adapter.frame(source, players, "p_opaque", "heavy");
    expect(frame.boats[0]).toMatchObject({ id: "p_opaque", name: "Skipper", pos: { x: 400, y: 900 }, heading: 45, speed: 5.75, lapDone: 0, isPlayer: true });
    expect(frame.boats[0].finishTime).toBeUndefined();
    expect(frame.boats[1]).toMatchObject({ isPlayer: false, lapDone: 1, finishTime: 88.25 });
    expect(frame.windKnots).toBeCloseTo(12 * 1.3 * 1.1);
    expect(frame.guidance?.target).toEqual(source.boats[0].target);
    expect(frame.guidance?.leg).toBe("waypoint");
    expect(source).toEqual(before);
    for (let i = 1; i <= 20; i++) {
      const next = adapter.frame({ ...source, t: source.t + i }, players, "p_opaque", "heavy");
      expect(next.boats[0].pos).toEqual({ x: 400, y: 900 });
      expect(next.boats[0].speed).toBe(5.75);
    }
  });

  it("paints the boats in the shared race palette, never the action cyan (M1-7)", () => {
    expect(FLEET_COLORS).toEqual([...BOAT_FLEET_COLORS]);
    expect(FLEET_COLORS.map(c => c.toLowerCase())).not.toContain("#00d4ff");
    expect(FLEET_COLORS).not.toContain(PLAYER_COLOR);
    const frame = createMultiplayerPresentation().frame(snapshot(), players, "p_opaque", "medium");
    expect(frame.boats.map(boat => boat.color)).toEqual([BOAT_FLEET_COLORS[0], BOAT_FLEET_COLORS[1]]);
  });

  it("keeps identity colours stable when snapshot and lobby order change", () => {
    const source = snapshot();
    const adapter = createMultiplayerPresentation();
    const first = adapter.frame(source, players, "p_opaque", "medium");
    const next = adapter.frame({ ...source, boats: [...source.boats].reverse() }, [...players].reverse(), "p_opaque", "medium");
    for (const boat of first.boats) expect(next.boats.find(candidate => candidate.id === boat.id)?.color).toBe(boat.color);
    expect(adapter.frame(source, players, "private_sid", "medium").boats.every(boat => !boat.isPlayer)).toBe(true);
  });

  it("reconstructs only an auto-trim pose and does not invent server rounding or heel telemetry", () => {
    const source = snapshot();
    const before = structuredClone(source);
    const adapter = createMultiplayerPresentation();
    const frame = adapter.frame(source, players, "p_opaque", "light");
    for (const boat of frame.boats) {
      expect(boat.trim?.mainSheet).toBeGreaterThanOrEqual(0);
      expect(boat.trim?.mainSheet).toBeLessThanOrEqual(1);
      expect(boat.physics?.heel).toBe(0);
      expect(boat.roundPhase).toBeUndefined();
      expect(boat.started).toBeUndefined();
    }
    expect(frame.boats[0].trim?.mainSheet).not.toBe(frame.boats[1].trim?.mainSheet);
    expect(source).toEqual(before);
  });

  it("drops invalid coordinates and handles a new race clock after a rematch", () => {
    const source = snapshot();
    const adapter = createMultiplayerPresentation();
    adapter.frame(source, players, "p_opaque", "medium");
    adapter.reset();
    const frame = adapter.frame({ ...source, t: 0.1, boats: source.boats.map((boat, i) => i === 1 ? { ...boat, x: NaN } : boat) }, players, "p_opaque", "medium");
    expect(frame.time).toBe(0.1);
    expect(frame.boats).toHaveLength(1);
    expect(frame.boats[0].trim).toBeDefined();
  });

  it("hides guidance without a server target and after an authoritative finish", () => {
    const source = snapshot();
    const adapter = createMultiplayerPresentation();
    const missing = { ...source, boats: source.boats.map(boat => ({ ...boat, target: undefined })) };
    expect(adapter.frame(missing, players, "p_opaque", "medium").guidance).toBeNull();
    const finished = { ...source, boats: source.boats.map(boat => boat.id === "p_opaque" ? { ...boat, l: 2, f: 100 } : boat) };
    expect(adapter.frame(finished, players, "p_opaque", "medium").guidance).toBeNull();
  });
});

describe("existing multiplayer turn command", () => {
  const neutral = { left: false, right: false, rudder: 0, course: null };
  it("sends bounded fractional wheel commands and zero for invalid input", () => {
    expect(multiplayerTurn({ ...neutral, rudder: 0.37 }, 90)).toBe(0.37);
    expect(multiplayerTurn({ ...neutral, rudder: 4 }, 90)).toBe(1);
    expect(multiplayerTurn({ ...neutral, rudder: NaN }, 90)).toBe(0);
    expect(multiplayerTurn(neutral, 90)).toBe(0);
  });
  it("holds a target heading over the shortest arc and gives manual keys priority", () => {
    expect(multiplayerTurn({ ...neutral, course: 2 }, 358)).toBeCloseTo(1 / 3);
    expect(multiplayerTurn({ ...neutral, course: 358 }, 2)).toBeCloseTo(-1 / 3);
    expect(multiplayerTurn({ ...neutral, course: 90 }, 90)).toBe(0);
    expect(multiplayerTurn({ ...neutral, left: true, course: 100 }, 90)).toBe(-1);
  });
  it("replaces rapid absolute slider targets without adding deltas from a stale display", () => {
    const source = { ...neutral, rudder: .4, course: 90 };
    const first = withMultiplayerCourse(source, 96);
    const next = withMultiplayerCourse(first, 100);
    expect(first.course).toBe(96);
    expect(next.course).toBe(100);
    expect(next.rudder).toBe(0);
    expect(multiplayerTurn(next, 90)).toBeCloseTo(10 / 12);
    expect(source).toEqual({ ...neutral, rudder: .4, course: 90 });
    expect(withMultiplayerCourse(next, 362).course).toBe(2);
    expect(withMultiplayerCourse(next, NaN)).toBe(next);
  });
});
