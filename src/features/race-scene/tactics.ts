// Tactics on the water (M2-2, M2-3): the one helper that turns the active
// race model into the sizes of the scene's tactical overlays. Pure, no
// three.js, so every number is tested on its own.
//
// Everything the overlays draw comes from here, in race units for the race
// geometry and in metres for what the scene paints, so the overlays survive
// the switch from legacy units to metres (M5) by changing the model only.
import { NO_GO } from "@/lib/race-manoeuvres";
import { NO_GO_HALF_DEG } from "@/lib/sailing-physics/constants";
import { KNOT_METRES_PER_SECOND } from "@/lib/sailing-kinematics";
import { MIN_BOAT_SEPARATION, UNITS_PER_KNOT_SECOND, WORLD, type Vec2 } from "@/lib/race-physics";
import { LEGACY_RACE_CONTEXT, type PhysicalRaceProfile } from "@/lib/race-context";
import { physicalCourseDefinition, physicalCourseWaterBounds } from "@/lib/race-courses";
import type { EdgeBounds } from "@/lib/race-manoeuvres";

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
}

/** The legacy clamp in stepBoat (src/lib/race-physics.ts): 20 units inside the world. */
const LEGACY_EDGE_UNITS = 20;
/** Mark zone: three hull lengths, as race-rules.ts boatsNearActiveMark counts it (RRS 18). */
const ZONE_HULLS = 3;
/** The boundary hint appears this many seconds of sailing before the edge... */
const BOUNDARY_HINT_SECONDS = 5;
/** ...and never later than this many hull lengths from it. */
const BOUNDARY_HINT_MIN_HULLS = 2;

const cache = new Map<string, RaceTacticsModel>();

/** The tactical model of the race being sailed: legacy, or one physical trial profile (ADR-0014). */
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
    });
  } else {
    const d = physicalCourseDefinition(profile);
    const m = d.context.metresPerUnit;
    const hullUnits = d.hardware.boatDiameterMetres / m;
    model = Object.freeze({
      model: "physical-cruiser-v1" as const,
      metresPerUnit: m,
      unitsPerKnotSecond: KNOT_METRES_PER_SECOND / m,
      // The physical trial sails the shared force model: its close-hauled
      // reference cone is the one every trainer teaches.
      noGoHalfDeg: NO_GO_HALF_DEG,
      hullUnits,
      markZoneUnits: hullUnits * ZONE_HULLS,
      water: Object.freeze(physicalCourseWaterBounds(profile)),
    });
  }
  cache.set(key, model);
  return model;
}

/** Sizes of everything the overlays paint, in scene metres, from the hull length. */
export interface TacticalSizes {
  readonly hullMetres: number;
  readonly wedgeInner: number;
  readonly wedgeOuter: number;
  readonly wedgeEdgeWidth: number;
  readonly routeHalfWidth: number;
  readonly routeOutlineHalfWidth: number;
  readonly chevronHalfWidth: number;
  readonly chevronFirst: number;
  readonly chevronSpacing: number;
  readonly turnPointRadius: number;
  readonly targetRingRadius: number;
  readonly zoneRadius: number;
  readonly zoneRingWidth: number;
  readonly boundaryWidth: number;
  readonly boundaryHeight: number;
}

export function tacticalSizes(model: RaceTacticsModel): TacticalSizes {
  const h = model.hullUnits * model.metresPerUnit;
  return Object.freeze({
    hullMetres: h,
    wedgeInner: h * 0.55,
    wedgeOuter: h * 2.6,
    wedgeEdgeWidth: h * 0.03,
    routeHalfWidth: h * 0.075,
    routeOutlineHalfWidth: h * 0.14,
    chevronHalfWidth: h * 0.12,
    chevronFirst: h * 1.2,
    chevronSpacing: h * 2.1,
    turnPointRadius: h * 0.28,
    targetRingRadius: h * 0.3,
    zoneRadius: model.markZoneUnits * model.metresPerUnit,
    zoneRingWidth: h * 0.05,
    boundaryWidth: h * 0.06,
    boundaryHeight: h * 0.05,
  });
}

const DEG = Math.PI / 180;

/**
 * The no-go sector for THREE.RingGeometry laid flat (rotateX(-PI/2)) and then
 * turned by `-windFrom` about Y. A compass bearing b points along
 * (sin b, 0, -cos b); a flat ring angle t lands on bearing 90 - t, so the
 * sector from -half to +half around north is t = 90 - half .. 90 + half.
 */
export function noGoRing(model: RaceTacticsModel): { thetaStart: number; thetaLength: number } {
  return { thetaStart: (90 - model.noGoHalfDeg) * DEG, thetaLength: 2 * model.noGoHalfDeg * DEG };
}

/** The compass bearings of the wedge's two edges for the true wind `windFrom`. */
export function noGoEdges(model: RaceTacticsModel, windFrom: number): [number, number] {
  const n = (v: number) => ((v % 360) + 360) % 360;
  return [n(windFrom - model.noGoHalfDeg), n(windFrom + model.noGoHalfDeg)];
}

/** The rounding mark whose zone ring is drawn: the windward mark before it is rounded. */
export function zoneMark(boat: { lapDone: number } | undefined, course: { marks: readonly { pos: Vec2; type: string }[] }): Vec2 | null {
  if (!boat || boat.lapDone !== 0) return null;
  // A plain loop: called every frame, so no closure.
  for (const m of course.marks) if (m.type === "windward") return m.pos;
  return null;
}

export interface BoundaryProximity {
  /** Distance to the nearest edge, race units (0 on the clamp). */
  nearest: number;
  /** Distance along the heading to the edge the boat is sailing at, race units (Infinity if none). */
  ahead: number;
  /** Should the scene hint at the boundary now? */
  hint: boolean;
}

/**
 * How close the boat is to the course boundary. The hint shows early: when
 * the edge ahead is less than BOUNDARY_HINT_SECONDS of sailing away at the
 * current speed (never later than two hull lengths), or the boat sits on it.
 * Writes into `out` so the frame loop allocates nothing.
 */
export function boundaryProximity(pos: Vec2, heading: number, speedKn: number, model: RaceTacticsModel, out: BoundaryProximity): BoundaryProximity {
  const w = model.water;
  out.nearest = Math.max(0, Math.min(pos.x - w.minX, w.maxX - pos.x, pos.y - w.minY, w.maxY - pos.y));
  const east = Math.sin(heading * DEG), south = -Math.cos(heading * DEG);
  let ahead = Infinity;
  if (east > 1e-6) ahead = Math.min(ahead, (w.maxX - pos.x) / east);
  if (east < -1e-6) ahead = Math.min(ahead, (w.minX - pos.x) / east);
  if (south > 1e-6) ahead = Math.min(ahead, (w.maxY - pos.y) / south);
  if (south < -1e-6) ahead = Math.min(ahead, (w.minY - pos.y) / south);
  out.ahead = Math.max(0, ahead);
  const speed = Number.isFinite(speedKn) && speedKn > 0 ? speedKn : 0;
  const reach = Math.max(model.hullUnits * BOUNDARY_HINT_MIN_HULLS, speed * model.unitsPerKnotSecond * BOUNDARY_HINT_SECONDS);
  out.hint = out.nearest < model.hullUnits * 0.25 || out.ahead < reach;
  return out;
}
