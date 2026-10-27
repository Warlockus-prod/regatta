import type { RaceCourse, Vec2 } from "./race-physics";
import { PHYSICAL_RACE_PROFILES, physicalRaceContext, readRaceContext, type PhysicalRaceContext, type PhysicalRaceProfile } from "./race-context";

export const PHYSICAL_COURSE_PROFILES = PHYSICAL_RACE_PROFILES;
export interface MetricRacePoint { readonly eastMetres: number; readonly southMetres: number }
export interface PhysicalCourseDefinition {
  readonly context: PhysicalRaceContext;
  readonly legMetres: number;
  readonly maxRaceSeconds: number;
  readonly bounds: { readonly widthMetres: number; readonly heightMetres: number };
  readonly start: MetricRacePoint & { readonly widthMetres: number };
  readonly windward: MetricRacePoint;
  readonly hardware: {
    readonly boatDiameterMetres: number; readonly buoyRadiusMetres: number;
    readonly committeeRadiusMetres: number; readonly clearanceBufferMetres: number;
  };
  readonly rounding: {
    readonly radiusMetres: number; readonly centreDropMetres: number; readonly lookaheadMetres: number;
    readonly gateInnerMetres: number; readonly gateOuterMetres: number;
  };
  readonly spawn: { readonly maxBoats: 5; readonly belowLineMetres: number; readonly spacingMetres: number };
}

// ADR-0011 proposals. This registry is not connected to live race defaults,
// progression, timeouts or result emission until their compatibility gates.
const bounds = Object.freeze({ widthMetres: 480, heightMetres: 720 });
const start = Object.freeze({ eastMetres: 240, southMetres: 630, widthMetres: 100 });
const hardware = Object.freeze({ boatDiameterMetres: 13.2, buoyRadiusMetres: 1.5, committeeRadiusMetres: 4.5, clearanceBufferMetres: 2 });
const rounding = Object.freeze({ radiusMetres: 18, centreDropMetres: 6, lookaheadMetres: 10, gateInnerMetres: 8.1, gateOuterMetres: 26 });
const spawn = Object.freeze({ maxBoats: 5 as const, belowLineMetres: 18, spacingMetres: 18.45 });
function definition(profile: PhysicalRaceProfile, legMetres: number, maxRaceSeconds: number): PhysicalCourseDefinition {
  return Object.freeze({ context: physicalRaceContext(profile), legMetres, maxRaceSeconds, bounds, start,
    windward: Object.freeze({ eastMetres: start.eastMetres, southMetres: start.southMetres - legMetres }), hardware, rounding, spawn });
}
const definitions: Readonly<Record<PhysicalRaceProfile, PhysicalCourseDefinition>> = Object.freeze({
  short: definition("short", 120, 480), medium: definition("medium", 300, 1200), long: definition("long", 600, 2400),
});

export function physicalCourseDefinition(profile: PhysicalRaceProfile): PhysicalCourseDefinition {
  // Validate even when a JS caller bypasses the type at an entry boundary.
  physicalRaceContext(profile);
  return definitions[profile];
}

/** Hull-centre water limits shared by actual movement and reachable prediction. */
export function physicalCourseWaterBounds(profile: PhysicalRaceProfile) {
  const d = physicalCourseDefinition(profile), m = d.context.metresPerUnit;
  const margin = (d.hardware.boatDiameterMetres / 2 + d.hardware.clearanceBufferMetres) / m;
  return { minX: margin, minY: margin, maxX: d.bounds.widthMetres / m - margin, maxY: d.bounds.heightMetres / m - margin };
}

/** Fresh legacy-coordinate geometry, with the existing canonical engine mark
 * labels. The consumer supplies its current seven-language display labels. */
export function makePhysicalRaceCourse(profile: PhysicalRaceProfile): RaceCourse {
  const d = physicalCourseDefinition(profile);
  const m = d.context.metresPerUnit;
  const a = { x: (d.start.eastMetres - d.start.widthMetres / 2) / m, y: d.start.southMetres / m };
  const b = { x: (d.start.eastMetres + d.start.widthMetres / 2) / m, y: d.start.southMetres / m };
  return { marks: [
    { pos: { x: d.windward.eastMetres / m, y: d.windward.southMetres / m }, radius: d.hardware.buoyRadiusMetres / m, label: "Windward", type: "windward" },
    { pos: { ...a }, radius: d.hardware.buoyRadiusMetres / m, label: "Start L", type: "start" },
    { pos: { ...b }, radius: d.hardware.committeeRadiusMetres / m, label: "Start R", type: "start" },
  ], startLine: { a, b }, finishLine: { a: { ...a }, b: { ...b } } };
}

/** A physical class owns its geometry revision. Labels may be translated, but
 * a different track must not be accepted under the same result/replay class. */
export function matchesPhysicalRaceCourse(context: PhysicalRaceContext, value: unknown): boolean {
  const read = readRaceContext(context);
  if (!read.ok || read.context.model !== "physical-cruiser-v1") return false;
  const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
  const number = (v: unknown, expected: number) => typeof v === "number" && Number.isFinite(v) && Math.abs(v - expected) < 1e-7;
  const point = (v: unknown, expected: Vec2) => object(v) && number(v.x, expected.x) && number(v.y, expected.y);
  const line = (v: unknown, expected: { a: Vec2; b: Vec2 }) => object(v) && point(v.a, expected.a) && point(v.b, expected.b);
  const expected = makePhysicalRaceCourse(read.context.profile);
  return object(value) && line(value.startLine, expected.startLine) && line(value.finishLine, expected.finishLine)
    && Array.isArray(value.marks) && value.marks.length === expected.marks.length
    && value.marks.every((mark, index) => {
      const canonical = expected.marks[index];
      return object(mark) && mark.type === canonical.type && point(mark.pos, canonical.pos) && number(mark.radius, canonical.radius)
        && (canonical.type !== "windward" || mark.roundSide === undefined || mark.roundSide === "port");
    });
}

/** Player first at centre, then alternating sides. Same fleet spacing and
 * hardware clearance for every profile; existing multiplayer is untouched. */
export function physicalFleetSpawns(total: number): Vec2[] {
  const d = definitions.short;
  if (!Number.isInteger(total) || total < 1 || total > d.spawn.maxBoats) throw new RangeError("Unsupported physical fleet size");
  return Array.from({ length: total }, (_, i) => {
    const slot = i === 0 ? 0 : Math.ceil(i / 2) * (i % 2 ? -1 : 1);
    return { x: (d.start.eastMetres + slot * d.spawn.spacingMetres) / d.context.metresPerUnit,
      y: (d.start.southMetres + d.spawn.belowLineMetres) / d.context.metresPerUnit };
  });
}
