// One race scale model (M5, ADR-0015): every consumer that turns a speed or a
// distance into a decision (the judge, the HUD ground speed, the edge pin,
// the contact cue, the scene's tactical overlays) reads it here, for the
// legacy race or one metric course. Pure, no three.js.
//
// The legacy race moves a boat UNITS_PER_KNOT_SECOND (8) units per knot per
// second, 9.33 times real speed at 0.6 m per unit; the metric race
// (physical-cruiser-v1) moves it at real speed. The legacy values below are
// exactly the numbers race-rules.ts and race-ground-speed.ts used before, so
// every legacy output stays as it was. Metric judge values are course data
// (PhysicalCourseDefinition.judge and .rounding in race-courses.ts).
import { NO_GO, type EdgeBounds } from "./race-manoeuvres";
import { NO_GO_HALF_DEG } from "./sailing-physics/constants";
import { KNOT_METRES_PER_SECOND } from "./sailing-kinematics";
import { MIN_BOAT_SEPARATION, UNITS_PER_KNOT_SECOND, WORLD } from "./race-physics";
import { LEGACY_RACE_CONTEXT, type PhysicalRaceProfile } from "./race-context";
import { physicalCourseDefinition, physicalCourseWaterBounds } from "./race-courses";
import { RACE_START_JOSTLE_SECONDS } from "./race-start-jostle";
import { MISSED_MARK_CLEARANCE } from "./race-missed-mark";

export interface RaceTacticsModel {
  readonly model: "legacy-race-v1" | "physical-cruiser-v1";
  /** Metres per race unit of this model. */
  readonly metresPerUnit: number;
  /** Race units a boat covers per knot per second (legacy races run fast). */
  readonly unitsPerKnotSecond: number;
  /** Half angle of the head-to-wind sector this model treats as no-go, degrees. */
  readonly noGoHalfDeg: number;
  /** One hull length, race units. */
  readonly hullUnits: number;
  /** Radius of the mark zone around a rounding mark, race units. */
  readonly markZoneUnits: number;
  /** Where the race stops a hull centre: the clamp, race units. */
  readonly water: Readonly<EdgeBounds>;
  /** How far ahead the judge looks for a closing encounter, simulation seconds. */
  readonly lookaheadSeconds: number;
  /** Where the wrong-side band west of the windward mark ends, race units:
   * the legacy judge counts it from the inner edge (inner + 70), the metric
   * judge from the mark centre (the physical round-west gate, gateOuterMetres). */
  readonly wrongRoundingOuter: Readonly<{ from: "inner" | "centre"; units: number }>;
  /** A touch is a contact above this closing speed, race units per second (0.2 kn). */
  readonly contactClosingUnitsPerSecond: number;
  /** The metric contact cue fires above this impact closing speed, m/s (null: the legacy cue reads the overlap). */
  readonly contactCueClosingMetresPerSecond: number | null;
  /** How many times real speed a boat moves in metres (the wake and foam speed). */
  readonly visualSpeedup: number;
  /** Start jostle after the gun, race seconds (race-start-jostle.ts): legacy 10, metric course data. */
  readonly startJostleSeconds: number;
  /** The missed-mark notice arms this far upwind of the line, race units (race-missed-mark.ts). */
  readonly missedMarkClearanceUnits: number;
}
/** The judge, the HUD and the overlays read the same model. */
export type RaceScale = RaceTacticsModel;

/** The legacy clamp in stepBoat (src/lib/race-physics.ts): 20 units inside the world. */
const LEGACY_EDGE_UNITS = 20;
/** Mark zone: three hull lengths, as race-rules.ts boatsNearActiveMark counts it (RRS 18). */
const ZONE_HULLS = 3;
/** The legacy judge's lookahead and wrong-side band, as race-rules.ts had them. */
const LEGACY_LOOKAHEAD_SECONDS = 3;
const LEGACY_WRONG_ROUNDING_BEYOND_INNER = 70;
/** A contact needs this much closing speed in both models, knots. */
const LEGACY_CONTACT_CLOSING_KNOTS = 0.2;

const cache = new Map<string, RaceTacticsModel>();

/** The scale model of the race being sailed: legacy, or one physical profile (ADR-0014, ADR-0015). */
export function raceTacticsModel(profile?: PhysicalRaceProfile | null): RaceTacticsModel {
  const key = profile ?? "legacy";
  const known = cache.get(key);
  if (known) return known;
  let model: RaceTacticsModel;
  if (!profile) {
    // race-rules.ts HULL_LENGTH is MIN_BOAT_SEPARATION: a 13.2 m hull at 0.6 m per unit.
    const hullUnits = MIN_BOAT_SEPARATION;
    model = Object.freeze({
      model: "legacy-race-v1" as const,
      metresPerUnit: LEGACY_RACE_CONTEXT.metresPerUnit,
      unitsPerKnotSecond: UNITS_PER_KNOT_SECOND,
      noGoHalfDeg: NO_GO.angleDeg,
      hullUnits,
      markZoneUnits: hullUnits * ZONE_HULLS,
      water: Object.freeze({ minX: LEGACY_EDGE_UNITS, minY: LEGACY_EDGE_UNITS, maxX: WORLD.width - LEGACY_EDGE_UNITS, maxY: WORLD.height - LEGACY_EDGE_UNITS }),
      lookaheadSeconds: LEGACY_LOOKAHEAD_SECONDS,
      wrongRoundingOuter: Object.freeze({ from: "inner" as const, units: LEGACY_WRONG_ROUNDING_BEYOND_INNER }),
      // The same expression race-rules.ts used (UNITS_PER_KNOT_SECOND * .2), bit for bit.
      contactClosingUnitsPerSecond: UNITS_PER_KNOT_SECOND * LEGACY_CONTACT_CLOSING_KNOTS,
      contactCueClosingMetresPerSecond: null,
      // The same expression as VISUAL_SPEEDUP in src/features/race-3d/pose.ts.
      visualSpeedup: (UNITS_PER_KNOT_SECOND * LEGACY_RACE_CONTEXT.metresPerUnit) / KNOT_METRES_PER_SECOND,
      startJostleSeconds: RACE_START_JOSTLE_SECONDS,
      missedMarkClearanceUnits: MISSED_MARK_CLEARANCE,
    });
  } else {
    const d = physicalCourseDefinition(profile);
    const m = d.context.metresPerUnit;
    const hullUnits = d.hardware.boatDiameterMetres / m;
    const unitsPerKnotSecond = KNOT_METRES_PER_SECOND / m;
    model = Object.freeze({
      model: "physical-cruiser-v1" as const,
      metresPerUnit: m,
      unitsPerKnotSecond,
      // The physical trial sails the shared force model: its close-hauled
      // reference cone is the one every trainer teaches.
      noGoHalfDeg: NO_GO_HALF_DEG,
      hullUnits,
      markZoneUnits: hullUnits * ZONE_HULLS,
      water: Object.freeze(physicalCourseWaterBounds(profile)),
      lookaheadSeconds: d.judge.lookaheadSeconds,
      wrongRoundingOuter: Object.freeze({ from: "centre" as const, units: d.rounding.gateOuterMetres / m }),
      contactClosingUnitsPerSecond: unitsPerKnotSecond * d.judge.contactClosingKnots,
      contactCueClosingMetresPerSecond: d.judge.contactCueClosingMetresPerSecond,
      visualSpeedup: 1,
      startJostleSeconds: d.judge.startJostleSeconds,
      missedMarkClearanceUnits: d.judge.missedMarkClearanceHulls * hullUnits,
    });
  }
  cache.set(key, model);
  return model;
}

/** The scale of a race: the same object as raceTacticsModel. */
export const raceScale = raceTacticsModel;
