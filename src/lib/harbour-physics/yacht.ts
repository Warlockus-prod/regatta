// The harbour model (ADR-0020) was calibrated on the classic profile, whose
// hullDragK is the whole hull drag; the cruiser profile's hullDragK is friction
// only (ADR-0021). Length and displacement are the same in both.
import { CLASSIC_BOAT as DEFAULT_BOAT } from "../sailing-physics/boat";
import type { HarbourYacht, Vec2 } from "./types";

// Our yacht in the harbour: the same abstract 45 ft cruiser as the sailing
// engine (length and displacement are read from DEFAULT_BOAT, never copied),
// plus what the sailing engine does not need: an auxiliary diesel with a
// right-handed fixed propeller, a spade rudder and the windage of hull and rig.
// Numbers are order-of-magnitude values for a yacht of this size, chosen so the
// behaviour a skipper relies on in a marina comes out right; see the ADR at the
// end of docs/design/harbour-manoeuvres-backlog.md and the measured table in
// step.test.ts. They are not a certified model of a production class.

const L = DEFAULT_BOAT.loa;
const B = 4.2;

/** Convex hull outline, [forward, starboard] metres from midships. */
function outline(loa: number, beam: number): Vec2[] {
  const h = loa / 2, b = beam / 2;
  const starboard: Vec2[] = [[h, 0], [0.7 * h, 0.64 * b], [0.2 * h, b], [-0.4 * h, b], [-h, 0.84 * b]];
  const port = starboard.slice(1).reverse().map(([x, y]) => [x, -y] as Vec2);
  return [...starboard, ...port];
}

export const OUR_YACHT: HarbourYacht = {
  loa: L,
  beam: B,
  displacement: DEFAULT_BOAT.displacement,
  massSurge: DEFAULT_BOAT.displacement * 1.08,
  massSway: DEFAULT_BOAT.displacement * 1.9,
  inertiaYaw: DEFAULT_BOAT.displacement * (0.27 * L) ** 2 * 1.6,
  surgeLinear: 120,
  // Same hull resistance constant as the sailing engine, so a boat that
  // leaves the harbour under engine carries way the way it does under sail.
  surgeQuadratic: DEFAULT_BOAT.hullDragK,
  asternDragFactor: 1.4,
  swayLinear: 1200,
  swayKeelLift: 3000,
  swayQuadratic: 4000,
  lateralCentre: -0.04 * L,
  yawLinear: 12000,
  yawSpeed: 120000,
  yawQuadratic: 150000,
  thrustAhead: 2800,
  thrustAstern: 1500,
  engineLag: 0.7,
  gearShift: 0.6,
  propX: -0.36 * L,
  propHand: "right",
  propWalkAstern: 0.6,
  propWalkAheadRatio: 0.25,
  propWalkFadeSpeed: 1.0,
  rudderX: -0.42 * L,
  rudderGain: 900,
  rudderMax: 35 * Math.PI / 180,
  rudderRate: 60 * Math.PI / 180,
  propWash: 2.0,
  windageFront: 6 * 0.7,
  windageSide: 26 * 0.9,
  windageCentreBase: 0.08,
  windageCentreSlope: 0.14,
  hull: outline(L, B),
};

/** Hull outline of a moored neighbour of a given size, for scenes. */
export function hullOutline(loa: number, beam: number): Vec2[] {
  return outline(loa, beam);
}
