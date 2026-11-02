// Harbour mode: low-speed manoeuvring model of our yacht under engine.
//
// Conventions (kept close to src/lib/sailing-physics/types.ts):
// - World frame: x = metres east, y = metres north.
// - Heading: compass degrees the bow points, 0 = north, 90 = east.
// - Body frame: surge u forward (+), sway v to starboard (+), both m/s.
// - Yaw rate r: rad/s, positive = clockwise seen from above (bow to starboard).
// - Wind: speed in knots, direction it blows FROM in compass degrees.
// - Helm and rudder: positive = turn to starboard when making headway.

export type Vec2 = readonly [number, number];

/** Constant parameters of our cruising yacht at harbour speed. */
export interface HarbourYacht {
  /** Length overall, m. Shared with the sailing engine. */
  loa: number;
  /** Maximum beam, m. */
  beam: number;
  /** Displacement, kg. Shared with the sailing engine. */
  displacement: number;
  /** Surge mass including added water mass, kg. */
  massSurge: number;
  /** Sway mass including added water mass, kg (much larger than surge). */
  massSway: number;
  /** Yaw inertia including added inertia, kg m^2. */
  inertiaYaw: number;
  /** Surge drag: linear N/(m/s) and quadratic N/(m/s)^2 ahead. */
  surgeLinear: number;
  surgeQuadratic: number;
  /** Quadratic drag multiplier when going astern (transom first). */
  asternDragFactor: number;
  /** Sway drag: linear, keel lift per m/s of headway, quadratic. */
  swayLinear: number;
  swayKeelLift: number;
  swayQuadratic: number;
  /** Lateral hydrodynamic centre, m from midships (+ forward). */
  lateralCentre: number;
  /** Yaw damping: linear, speed-dependent and quadratic terms. */
  yawLinear: number;
  yawSpeed: number;
  yawQuadratic: number;
  /** Engine thrust at full ahead and full astern, N (bollard). */
  thrustAhead: number;
  thrustAstern: number;
  /** First-order engine response, s. */
  engineLag: number;
  /** Gearbox: time spent in neutral when changing direction, s. */
  gearShift: number;
  /** Propeller position, m from midships (negative = aft). */
  propX: number;
  /** "right" = clockwise seen from astern when going ahead. */
  propHand: "right" | "left";
  /** Side force from prop walk as a fraction of astern thrust. */
  propWalkAstern: number;
  /** Prop walk ahead as a fraction of the astern value (opposite side). */
  propWalkAheadRatio: number;
  /** Prop walk fades with water flow: half strength at this speed, m/s. */
  propWalkFadeSpeed: number;
  /** Rudder position, m from midships (negative = aft). */
  rudderX: number;
  /** Rudder side force per rad per (m/s)^2 of flow. */
  rudderGain: number;
  /** Maximum rudder angle, rad, and how fast the rudder follows the wheel, rad/s. */
  rudderMax: number;
  rudderRate: number;
  /** Flow speed the prop wash adds over the rudder at full ahead, m/s. */
  propWash: number;
  /** Windage: frontal and side areas with drag coefficients already applied, m^2. */
  windageFront: number;
  windageSide: number;
  /** Windage centre: x_cp = loa * (base + slope * cos(wind angle from bow)). */
  windageCentreBase: number;
  windageCentreSlope: number;
  /** Hull outline in body coordinates [forward, starboard], convex, clockwise. */
  hull: Vec2[];
}

export type Shape =
  | { type: "circle"; x: number; y: number; r: number }
  | { type: "poly"; points: Vec2[] };

export type ObstacleKind = "pontoon" | "quay" | "pile" | "boat" | "buoy" | "wall" | "person";

export interface Obstacle {
  id: string;
  kind: ObstacleKind;
  /** Convex polygon (any winding) or circle, world metres. */
  shape: Shape;
  /** Spring stiffness per contact point, N/m. Default by kind. */
  stiffness?: number;
}

export interface MooringLine {
  id: string;
  /** Cleat on our boat, body coordinates [forward, starboard], m. */
  cleat: Vec2;
  /** Fixed point ashore, on a pile or on a buoy, world metres. */
  anchor: Vec2;
  /** Slack length, m. The line pulls only when stretched beyond it. */
  length: number;
}

export interface ContactEvent {
  obstacleId: string;
  kind: ObstacleKind;
  /** Simulation time of first touch, s. */
  t: number;
  /** Approach speed along the contact normal at first touch, m/s. */
  speed: number;
  /** Kinetic energy of that approach, J (0.5 * massSurge * speed^2). */
  energy: number;
}

export interface HarbourState {
  t: number;
  x: number;
  y: number;
  heading: number;
  u: number;
  v: number;
  r: number;
  /** Actual rudder angle, rad. */
  rudder: number;
  /** Actual engine output in [-1, 1] after lag and gearbox. */
  engine: number;
  /** Seconds left in neutral during a direction change. */
  shiftTimer: number;
  /** Gear currently engaged: 1 ahead, -1 astern, 0 neutral. */
  gear: -1 | 0 | 1;
  /** Last time each obstacle was touched, s. A touch within CONTACT_MERGE_SECONDS
   * of the previous one belongs to the same contact (a hull rocking on a fender). */
  touching: Record<string, number>;
  /** Every contact since the start (append only). */
  contacts: ContactEvent[];
  lines: MooringLine[];
}

export interface HarbourInput {
  /** Wheel position in [-1, 1]; the rudder follows at rudderRate. */
  helm: number;
  /** Throttle lever in [-1, 1]: negative astern, 0 neutral, positive ahead. */
  throttle: number;
}

export interface HarbourWorld {
  obstacles: Obstacle[];
  wind: { speed: number; direction: number };
}

/** Per-step diagnostics for the HUD and tests. Not part of state. */
export interface HarbourDiagnostics {
  thrust: number;
  rudderFlow: number;
  rudderForce: number;
  propWalkForce: number;
  windForce: Vec2;
  windMoment: number;
  contactForce: number;
}
