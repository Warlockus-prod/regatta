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
  /** Fair start (M5, ADR-0015 point 5): the M0-2 echelon of race-spawn.ts in
   * metres. The player sits belowLineMetres under the line centre; bot slot k
   * (-1, +1, -2, +2) sits k * sideMetres across and |k| * staggerMetres further
   * down; everybody starts on one heading, so nobody crosses at the gun. */
  readonly spawn: {
    readonly maxBoats: 5; readonly belowLineMetres: number;
    readonly sideMetres: number; readonly staggerMetres: number; readonly heading: number;
  };
  /** Race judge and contact cue of this course (M5, ADR-0015), as course data:
   * src/lib/race-scale.ts turns them into race units for race-rules.ts. */
  readonly judge: {
    /** How far ahead the judge looks for a closing encounter, real seconds. */
    readonly lookaheadSeconds: number;
    /** A touch counts as a contact above this closing speed, knots. */
    readonly contactClosingKnots: number;
    /** The player's contact cue (frame, thud, haptic) fires above this impact closing speed, m/s. */
    readonly contactCueClosingMetresPerSecond: number;
    /** Start jostle (race-start-jostle.ts), real seconds after the gun (M5 step 6). */
    readonly startJostleSeconds: number;
    /** The missed-mark notice arms once the boat is this many hull lengths upwind of the line (race-missed-mark.ts). */
    readonly missedMarkClearanceHulls: number;
  };
  /** Route hint of the player (M5 step 6, race-guidance-physical.ts). On the
   * beat the hint tacks inside a corridor of half-width
   * clamp(corridorShare * legMetres, corridorMinMetres, corridorMaxMetres)
   * around the round-east gate, and onto a layline only once the gate lies
   * laylineMarginDeg clear of close-hauled on the new tack (hysteresis, room
   * for leeway). No hint heading lies closer to the wind than the race's
   * no-go cone plus noGoMarginDeg. Geometric design targets, not measured on
   * people (ADR-0015). */
  readonly guidance: {
    readonly corridorShare: number; readonly corridorMinMetres: number; readonly corridorMaxMetres: number;
    readonly closeHauledTwaDeg: number; readonly laylineMarginDeg: number; readonly noGoMarginDeg: number;
    /** On the beat the hint's straight line passes the windward mark at least
     * this much beyond touching distance plus the hardware clearanceBufferMetres
     * (room for the turn of a tack and leeway). */
    readonly markPassMetres: number;
  };
  /** Bot helm (M5, ADR-0015 point 5), the same for every profile. */
  readonly bots: {
    /** Irons and pin escape (race-physical-bot.ts): a bot slower than slowKn
     * inside noGoTwaDeg, or slower than pinnedKn with another hull centre
     * within contactCentreMetres, for afterSeconds commits to wind +-
     * bearAwayTwaDeg away from that hull and holds it holdSeconds. */
    readonly escape: {
      readonly slowKn: number; readonly noGoTwaDeg: number; readonly pinnedKn: number;
      readonly contactCentreMetres: number; readonly afterSeconds: number;
      readonly bearAwayTwaDeg: number; readonly holdSeconds: number;
    };
    /** Look-ahead: a predicted heading inside noGoTwaDeg coasts down with
     * time constant coastTauSeconds; a boat a bot does not steer (the player)
     * is a cone of +-humanConeDeg at its current speed, kept humanExtraMetres
     * further off than a bot. */
    readonly prediction: {
      readonly noGoTwaDeg: number; readonly coastTauSeconds: number;
      readonly humanConeDeg: number; readonly humanExtraMetres: number;
    };
  };
}

// ADR-0011 proposals. Only the opt-in `/game?race=` trial (ADR-0014) sails
// them; live race defaults and result emission stay off until their gates.
const bounds = Object.freeze({ widthMetres: 480, heightMetres: 720 });
const start = Object.freeze({ eastMetres: 240, southMetres: 630, widthMetres: 100 });
const hardware = Object.freeze({ boatDiameterMetres: 13.2, buoyRadiusMetres: 1.5, committeeRadiusMetres: 4.5, clearanceBufferMetres: 2 });
const rounding = Object.freeze({ radiusMetres: 18, centreDropMetres: 6, lookaheadMetres: 10, gateInnerMetres: 8.1, gateOuterMetres: 26 });
// The legacy echelon (34 units across, 30 units down per slot, heading 45) at
// 0.6 m per unit: 20.4 m across and 18 m down.
const spawn = Object.freeze({ maxBoats: 5 as const, belowLineMetres: 18, sideMetres: 20.4, staggerMetres: 18, heading: 45 });
// 8 s at 5 kn is about 20 m, under two hull lengths of warning before a
// crossing: the legacy 3 s ran at 9.3 times real speed (about 28 real seconds).
// Start jostle 16 s: a boat of the fair echelon, sailing the route hint from
// its heading 45 in the medium wind (x1), has sailed two hull lengths
// (26.4 m) 16 s after the gun (light x0.65 26 s, strong x1.3 12 s). The
// fleet itself stays closer than two hulls well past a minute, so separation
// cannot end the window; the fleet's first real encounter comes later than
// 16 s (race-start-jostle.test.ts measures both). On the cruiser profile
// (ADR-0021) two hulls take 18.6 s and the strong-wind fleet's first
// encounter comes at 16.7 s, so 16 s stays the window. The legacy 10 s ran at
// 9.33 times real speed. Missed mark: two hull lengths,
// the legacy 40 units (about 1.8 hulls) in the metric race's own hull.
const judge = Object.freeze({ lookaheadSeconds: 8, contactClosingKnots: 0.2, contactCueClosingMetresPerSecond: 0.1,
  startJostleSeconds: 16, missedMarkClearanceHulls: 2 });
// Corridor 0.35 of the leg: short 42 m, medium 105 m, long 150 m (capped) either
// side, so the 480 m water keeps 90 m beyond the widest corridor (start at 240 m).
// Mark pass 3 m: the hint's line passes the windward mark 13.1 m centre to
// centre (touching 8.1 m + buffer 2 m + 3 m); 0 m let 10 of 3192 starts below
// the mark touch it (race-guidance-physical.test.ts), 2 m one.
const guidance = Object.freeze({ corridorShare: 0.35, corridorMinMetres: 40, corridorMaxMetres: 150,
  closeHauledTwaDeg: 45, laylineMarginDeg: 8, noGoMarginDeg: 3, markPassMetres: 3 });
const bots = Object.freeze({
  escape: Object.freeze({ slowKn: 1.0, noGoTwaDeg: 35, pinnedKn: 1.5, contactCentreMetres: 13.5, afterSeconds: 1.5, bearAwayTwaDeg: 75, holdSeconds: 4 }),
  prediction: Object.freeze({ noGoTwaDeg: 35, coastTauSeconds: 12, humanConeDeg: 30, humanExtraMetres: 2 }),
});
function definition(profile: PhysicalRaceProfile, legMetres: number, maxRaceSeconds: number): PhysicalCourseDefinition {
  return Object.freeze({ context: physicalRaceContext(profile), legMetres, maxRaceSeconds, bounds, start,
    windward: Object.freeze({ eastMetres: start.eastMetres, southMetres: start.southMetres - legMetres }), hardware, rounding, spawn, judge, guidance, bots });
}
const definitions: Readonly<Record<PhysicalRaceProfile, PhysicalCourseDefinition>> = Object.freeze({
  // M5 limits (ADR-0015): room for light-wind bots on the shared crew, see
  // race-courses.test.ts for the measured maxima. Limits are not geometry:
  // matchesPhysicalRaceCourse ignores them and the class stays r1.
  short: definition("short", 120, 720), medium: definition("medium", 300, 1500), long: definition("long", 600, 2400),
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

export interface PhysicalFleetSpawn { pos: Vec2; heading: number }
/** Player first at the line centre, then bot slots -1, +1, -2, +2 in the
 * fair echelon (spawn above): one heading for all, so no boat starts on a
 * crossing course. Same layout and hardware clearance for every profile;
 * existing multiplayer is untouched. A fresh array on every call. */
export function physicalFleetSpawns(total: number): PhysicalFleetSpawn[] {
  const d = definitions.short, m = d.context.metresPerUnit;
  if (!Number.isInteger(total) || total < 1 || total > d.spawn.maxBoats) throw new RangeError("Unsupported physical fleet size");
  return Array.from({ length: total }, (_, i) => {
    const slot = i === 0 ? 0 : Math.ceil(i / 2) * (i % 2 ? -1 : 1);
    return { pos: { x: (d.start.eastMetres + slot * d.spawn.sideMetres) / m,
      y: (d.start.southMetres + d.spawn.belowLineMetres + Math.abs(slot) * d.spawn.staggerMetres) / m }, heading: d.spawn.heading };
  });
}
