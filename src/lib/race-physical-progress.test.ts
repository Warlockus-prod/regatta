import { describe, expect, it } from "vitest";
import { PHYSICAL_RACE_PROFILES, physicalRaceContext, type PhysicalRaceContext } from "./race-context";
import { makePhysicalRaceCourse } from "./race-courses";
import { advancePhysicalRaceProgress, physicalRaceGates, physicalRaceStage } from "./race-physical-progress";
import type { RaceBoat, Vec2 } from "./race-physics";

const boat = (): RaceBoat => ({ id: "p", name: "p", color: "white", pos: { x: 400, y: 1080 }, heading: 45, speed: 4, lapDone: 0 });
const midpoint = (g: { a: Readonly<Vec2>; b: Readonly<Vec2> }): Vec2 => ({ x: (g.a.x + g.b.x) / 2, y: (g.a.y + g.b.y) / 2 });

describe("physical course progression", () => {
  it.each(PHYSICAL_RACE_PROFILES)("owns the same metric gate distances and ordered stages on %s", profile => {
    const context = physicalRaceContext(profile), course = makePhysicalRaceCourse(profile), b = boat();
    const gates = physicalRaceGates(context, course)!;
    const mark = course.marks[0].pos;
    expect((gates.rounding[0].a.x - mark.x) * .6).toBeCloseTo(8.1, 10);
    expect((gates.rounding[0].b.x - mark.x) * .6).toBeCloseTo(26, 10);
    const cross = (p: Vec2, dx: number, dy: number, t: number) => advancePhysicalRaceProgress(b,
      { from: { x: p.x - dx, y: p.y - dy }, to: { x: p.x + dx, y: p.y + dy } }, context, course, t, true);
    expect(physicalRaceStage(b)).toBe("start");
    expect(cross(midpoint(gates.start), 0, -1, 1)).toEqual({ stage: "round-east", event: "start" });
    expect(cross(midpoint(gates.rounding[0]), 0, -1, 2)).toEqual({ stage: "round-north", event: "round-east" });
    expect(cross(midpoint(gates.rounding[1]), -1, 0, 3)).toEqual({ stage: "round-west", event: "round-north" });
    expect(cross(midpoint(gates.rounding[2]), 0, 1, 4)).toEqual({ stage: "finish", event: "mark" });
    expect(cross(midpoint(gates.finish), 0, 1, 5)).toEqual({ stage: "complete", event: "finish" });
    expect(b.finishTime).toBe(5);
    expect(cross(midpoint(gates.finish), 0, 1, 6)).toEqual({ stage: "complete", event: null });
    expect(b.finishTime).toBe(5);
  });

  it("does not credit a wrong side, wrong direction, inner shortcut, far bypass or skipped north gate", () => {
    const context = physicalRaceContext("short"), course = makePhysicalRaceCourse("short"), b = { ...boat(), started: true };
    const { x, y } = course.marks[0].pos;
    const advance = (from: Vec2, to: Vec2) => advancePhysicalRaceProgress(b, { from, to }, context, course, 10, true);
    for (const xOffset of [-25, 0, 10, 50]) {
      expect(advance({ x: x + xOffset, y: y + 1 }, { x: x + xOffset, y: y - 1 })?.event).toBeNull();
      expect(physicalRaceStage(b)).toBe("round-east");
    }
    expect(advance({ x: x + 25, y: y - 1 }, { x: x + 25, y: y + 1 })?.event).toBeNull();
    expect(advance({ x: x + 25, y: y + 1 }, { x: x + 25, y: y - 1 })?.event).toBe("round-east");
    expect(advance({ x: x - 25, y: y - 1 }, { x: x - 25, y: y + 1 })?.event).toBeNull();
    expect(physicalRaceStage(b)).toBe("round-north");
  });

  it("ignores countdown, collision-only displacement and boundary recovery", () => {
    const context = physicalRaceContext("short"), course = makePhysicalRaceCourse("short"), b = boat();
    const p = midpoint(course.startLine);
    const sailing = { from: { x: p.x, y: p.y + 1 }, to: { x: p.x, y: p.y - 1 } };
    expect(advancePhysicalRaceProgress(b, sailing, context, course, 0, false)?.event).toBeNull();
    b.pos = { ...sailing.to }; // A collision/recovery moved the displayed boat over the line.
    const stillBelow = { from: sailing.from, to: sailing.from };
    expect(advancePhysicalRaceProgress(b, stillBelow, context, course, 1, true)?.event).toBeNull();
    expect(b.started).toBeUndefined();
    b.pos = { ...sailing.from }; // A push back must not erase a real propelled crossing either.
    expect(advancePhysicalRaceProgress(b, sailing, context, course, 2, true)?.event).toBe("start");
  });

  it("does not start or finish through a line extension or in the wrong direction", () => {
    const context = physicalRaceContext("short"), course = makePhysicalRaceCourse("short");
    for (const finishing of [false, true]) {
      const b = { ...boat(), ...(finishing ? { started: true, lapDone: 1, roundPhase: 2 } : {}) };
      const line = finishing ? course.finishLine : course.startLine;
      const sign = finishing ? 1 : -1;
      const cross = (x: number, direction: number) => advancePhysicalRaceProgress(b,
        { from: { x, y: line.a.y - direction }, to: { x, y: line.a.y + direction } }, context, course, 20, true);
      expect(cross(line.a.x - 1, sign)?.event).toBeNull();
      expect(cross(line.b.x + 1, sign)?.event).toBeNull();
      expect(cross((line.a.x + line.b.x) / 2, -sign)?.event).toBeNull();
      expect(cross((line.a.x + line.b.x) / 2, sign)?.event).toBe(finishing ? "finish" : "start");
    }
  });

  it.each([
    { lapDone: -1 }, { lapDone: 3 }, { roundPhase: 3 }, { roundPhase: 1 },
    { started: "yes" }, { lapDone: 1 }, { started: true, lapDone: 1, roundPhase: 1 },
    { started: true, lapDone: 2, roundPhase: 2 },
    { started: true, lapDone: 2, roundPhase: 2, finishTime: NaN },
    { started: true, lapDone: 2, roundPhase: 2, finishTime: -1 },
    { finishTime: 20 },
  ])("rejects inconsistent progress atomically: %j", invalid => {
    const context = physicalRaceContext("short"), course = makePhysicalRaceCourse("short");
    const b = { ...boat(), ...invalid } as RaceBoat, before = structuredClone(b);
    const motion = { from: { x: 400, y: 1051 }, to: { x: 400, y: 1049 } };
    expect(advancePhysicalRaceProgress(b, motion, context, course, 1, true)).toBeNull();
    expect(b).toEqual(before);
  });

  it("rejects unknown or mismatched geometry and invalid progress before mutation", () => {
    const context = physicalRaceContext("short"), course = makePhysicalRaceCourse("short"), b = boat();
    const motion = { from: { x: 400, y: 1051 }, to: { x: 400, y: 1049 } };
    const original = structuredClone(b);
    expect(advancePhysicalRaceProgress(b, motion, undefined as unknown as PhysicalRaceContext, course, 1, true)).toBeNull();
    expect(advancePhysicalRaceProgress(b, motion, physicalRaceContext("long"), course, 1, true)).toBeNull();
    expect(advancePhysicalRaceProgress(b, { ...motion, to: { x: NaN, y: 1049 } }, context, course, 1, true)).toBeNull();
    expect(advancePhysicalRaceProgress(b, motion, context, course, NaN, true)).toBeNull();
    expect(b).toEqual(original);
    b.lapDone = 1;
    expect(advancePhysicalRaceProgress(b, motion, context, course, 1, true)).toBeNull();
    expect(b).toEqual({ ...original, lapDone: 1 });
  });

  // ADR-0015 point 4: a sliding contact bends the travelled path within a
  // tick. Contract: a gate is credited iff the travelled polyline crosses it
  // (each segment with its own direction check), never because its chord does.
  it("grades the travelled polyline segment by segment, not its chord", () => {
    const context = physicalRaceContext("short"), course = makePhysicalRaceCourse("short");
    const { x, y } = course.marks[0].pos;
    const fresh = () => ({ ...boat(), started: true });
    // The path slides west below the mark, then crosses the round-east gate
    // northward on its second segment; the chord crosses y beyond the outer end.
    const bent = { from: { x: x + 80, y: y + .2 }, path: [{ x: x + 20, y: y + .2 }], to: { x: x + 20, y: y - 1 } };
    let b = fresh();
    expect(advancePhysicalRaceProgress(b, { from: bent.from, to: bent.to }, context, course, 10, true)?.event).toBeNull();
    expect(advancePhysicalRaceProgress(b, bent, context, course, 10, true)).toEqual({ stage: "round-north", event: "round-east" });
    // The chord crosses the gate, but the path goes round its outer end.
    const around = { from: { x: x + 20, y: y + 1 }, path: [{ x: x + 60, y: y + 1 }, { x: x + 60, y: y - 1 }], to: { x: x + 30, y: y - 1 } };
    b = fresh();
    expect(advancePhysicalRaceProgress(b, { from: around.from, to: around.to }, context, course, 10, true)?.event).toBe("round-east");
    b = fresh();
    expect(advancePhysicalRaceProgress(b, around, context, course, 10, true)?.event).toBeNull();
    expect(physicalRaceStage(b)).toBe("round-east");
    // The only segment inside the gate crosses it southward (the wrong way),
    // although the chord moves north: nothing is credited.
    const wrongWay = { from: { x: x + 60, y: y + 2 }, path: [{ x: x + 60, y: y - 1 }, { x: x + 20, y: y - 1 }], to: { x: x + 20, y: y + .5 } };
    b = fresh();
    expect(advancePhysicalRaceProgress(b, wrongWay, context, course, 10, true)?.event).toBeNull();
  });

  it("rejects a malformed travelled path before mutation", () => {
    const context = physicalRaceContext("short"), course = makePhysicalRaceCourse("short"), b = boat();
    const p = midpoint(course.startLine), before = structuredClone(b);
    const base = { from: { x: p.x, y: p.y + 1 }, to: { x: p.x, y: p.y - 1 } };
    for (const path of [[{ x: NaN, y: 1 }], Array.from({ length: 5 }, () => ({ ...base.from })), "path", [null]]) {
      expect(advancePhysicalRaceProgress(b, { ...base, path } as never, context, course, 1, true)).toBeNull();
    }
    expect(b).toEqual(before);
    expect(advancePhysicalRaceProgress(b, { ...base, path: Array.from({ length: 4 }, () => ({ ...base.from })) }, context, course, 1, true)?.event).toBe("start");
  });
});

