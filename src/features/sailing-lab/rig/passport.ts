/** Synthetic teaching boat, not a manufacturer's rigging or load certificate.
 * Metres, boat-local frame: starboard +, forward +, up +. GLB is X forward,
 * Y up, Z starboard. Earth/world transforms belong to the scene adapter.
 */
export interface RigPoint { starboard: number; forward: number; up: number }
export const RIG_PASSPORT = {
  id: "regatta-cruiser-rig-v1",
  asset: "public/models/regatta_sloop_sailing.glb",
  // Measured exported MainRig origin, not the mesh object's local origin.
  mainPivot: { starboard: 0, forward: .3, up: 2.74 },
  boom: { length: 5.1, maxYawDegrees: 85, maxRiseDegrees: 12 },
  // New synthetic hardware locations. The current asset has no traveler.
  // Track clears the existing cockpit seats (top 1.50 m), aft of the cabin.
  traveler: { forward: -3.1, up: 1.62, halfTravel: .8 },
  // Mid-boom attachment, below the spar; local relative to MainRig.
  mainsheet: { boomRadius: 3.4, underBoom: -.12, parts: 6, sheaveSpacing: .045 },
  // Synthetic soft vang, hinged on the mast axis. Not a rigid support.
  // Cabin roof is at 2.18 m; keep even the eased line above it.
  vangLayout: { base: { starboard: 0, forward: .3, up: 2.25 }, boomRadius: 1.65, underBoom: -.10, parts: 4 },
  support: "fixed-lower-boom-stop-for-trim-study",
  mainsail: "slab-reefing",
  headsail: "roller-furling",
  vang: "soft-tackle",
  toppingLift: true,
} as const;

export const toGlb = (p: RigPoint): [number, number, number] => [p.forward, p.up, p.starboard];
export const fromGlb = ([forward, up, starboard]: readonly [number, number, number]): RigPoint => ({ starboard, forward, up });
