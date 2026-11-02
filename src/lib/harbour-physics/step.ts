import { axes, ccw, clamp, compass, densify, KNOT, penetrations, toWorld, type Pose } from "./geometry";
import type { ContactEvent, HarbourDiagnostics, HarbourInput, HarbourState, HarbourWorld, HarbourYacht, MooringLine, Obstacle, ObstacleKind, Vec2 } from "./types";
import { OUR_YACHT } from "./yacht";

/** Fixed physics step. Hosts accumulate real time and call stepHarbour per step. */
export const HARBOUR_STEP_SECONDS = 1 / 60;
const SUBSTEPS = 2;
export const CONTACT_MERGE_SECONDS = 1.5;
const RHO_AIR = 1.225;
const LINE_STIFFNESS = 20000;
const LINE_DAMPING = 6000;
const CONTACT_DAMPING = 40000;
const CONTACT_FRICTION = 0.2;
const DEFAULT_STIFFNESS: Record<ObstacleKind, number> = {
  pontoon: 60000, quay: 60000, wall: 60000, pile: 50000, boat: 40000, buoy: 8000, person: 3000,
};

export function createHarbourState(pose: Pose, init: Partial<Pick<HarbourState, "u" | "v" | "r" | "lines" | "engine" | "gear">> = {}): HarbourState {
  return {
    t: 0, x: pose.x, y: pose.y, heading: compass(pose.heading),
    u: init.u ?? 0, v: init.v ?? 0, r: init.r ?? 0, rudder: 0,
    engine: init.engine ?? 0, shiftTimer: 0, gear: init.gear ?? 0,
    touching: {}, contacts: [], lines: init.lines ?? [],
  };
}

/** Speed through the water, knots, signed: negative = sternway. */
export function speedKnots(state: Pick<HarbourState, "u" | "v">): number {
  return Math.sign(state.u || 1) * Math.hypot(state.u, state.v) / KNOT;
}

export function hullWorld(state: Pose, yacht: HarbourYacht = OUR_YACHT): Vec2[] {
  return ccw(yacht.hull.map(p => toWorld(state, p)));
}

/** Engine: the lever sets a target; the output follows with lag, and a
 * direction change waits in neutral for the gearbox. */
function stepEngine(state: HarbourState, throttle: number, yacht: HarbourYacht, dt: number) {
  const target = clamp(throttle, -1, 1);
  const wantGear: -1 | 0 | 1 = target > 0.02 ? 1 : target < -0.02 ? -1 : 0;
  let { gear, engine } = state;
  let shiftTimer = Math.max(0, state.shiftTimer - dt);
  // Leaving a gear declutches the propeller at once; the next gear engages only
  // after the gearbox has waited in neutral.
  if (gear !== 0 && wantGear !== gear) { gear = 0; shiftTimer = yacht.gearShift; }
  if (gear === 0 && wantGear !== 0 && shiftTimer === 0) gear = wantGear;
  if (gear === 0) engine = 0;
  else engine += (target - engine) * (1 - Math.exp(-dt / yacht.engineLag));
  return { gear, shiftTimer, engine };
}

interface Forces { X: number; Y: number; N: number; diag: HarbourDiagnostics; contact: ContactSample[] }
interface ContactSample { obstacle: Obstacle; speed: number }

function forces(s: HarbourState, world: HarbourWorld, yacht: HarbourYacht): Forces {
  const { u, v, r } = s;
  const { f, s: sAxis } = axes(s.heading);
  // --- Engine and propeller ---
  const thrust = s.engine >= 0 ? s.engine * yacht.thrustAhead : s.engine * yacht.thrustAstern;
  const hand = yacht.propHand === "right" ? 1 : -1;
  const fade = 1 / (1 + (Math.hypot(u, v) / yacht.propWalkFadeSpeed) ** 2);
  // Right-handed prop astern: the stern kicks to port (negative sway force at the
  // propeller, bow swings to starboard). Ahead the effect is weaker and opposite.
  const propWalk = thrust < 0
    ? -hand * yacht.propWalkAstern * -thrust * fade
    : hand * yacht.propWalkAstern * yacht.propWalkAheadRatio * thrust * fade;

  // --- Rudder: only water flowing past it steers ---
  const wash = thrust > 0 ? yacht.propWash * Math.sqrt(thrust / yacht.thrustAhead) : 0;
  const flow = u + wash;
  const rudderForce = -yacht.rudderGain * s.rudder * flow * Math.abs(flow);

  // --- Hull ---
  const surgeQ = u >= 0 ? yacht.surgeQuadratic : yacht.surgeQuadratic * yacht.asternDragFactor;
  const Xh = -(yacht.surgeLinear * u + surgeQ * u * Math.abs(u));
  const Yh = -((yacht.swayLinear + yacht.swayKeelLift * Math.abs(u)) * v + yacht.swayQuadratic * v * Math.abs(v));
  const Nh = Yh * yacht.lateralCentre
    // Keel and rudder damp yaw less with sternway, so prop walk keeps swinging the stern.
    - (yacht.yawLinear + yacht.yawSpeed * (u >= 0 ? u : -0.4 * u)) * r - yacht.yawQuadratic * r * Math.abs(r);

  // --- Windage ---
  const ws = world.wind.speed * KNOT, wd = world.wind.direction * Math.PI / 180;
  const air: Vec2 = [-ws * Math.sin(wd), -ws * Math.cos(wd)];
  const vel: Vec2 = [u * f[0] + v * sAxis[0], u * f[1] + v * sAxis[1]];
  const rel: Vec2 = [air[0] - vel[0], air[1] - vel[1]];
  const ax = rel[0] * f[0] + rel[1] * f[1], ay = rel[0] * sAxis[0] + rel[1] * sAxis[1];
  const relSpeed = Math.hypot(ax, ay);
  const Xw = 0.5 * RHO_AIR * relSpeed * ax * yacht.windageFront;
  const Yw = 0.5 * RHO_AIR * relSpeed * ay * yacht.windageSide;
  // cos of the angle the wind comes FROM, measured from the bow.
  const cosFrom = relSpeed > 1e-9 ? -ax / relSpeed : 0;
  const Nw = Yw * yacht.loa * (yacht.windageCentreBase + yacht.windageCentreSlope * cosFrom);

  let X = thrust + Xh + Xw;
  let Y = propWalk + rudderForce + Yh + Yw;
  let N = propWalk * yacht.propX + rudderForce * yacht.rudderX + Nh + Nw;

  // --- Contacts and lines, computed in the world frame ---
  let Fx = 0, Fy = 0, Nc = 0, contactForce = 0;
  const add = (point: Vec2, force: Vec2) => {
    Fx += force[0]; Fy += force[1];
    const dx = point[0] - s.x, dy = point[1] - s.y;
    Nc += dy * force[0] - dx * force[1];
  };
  const pointVelocity = (point: Vec2): Vec2 => {
    const dx = point[0] - s.x, dy = point[1] - s.y;
    return [vel[0] + r * dy, vel[1] - r * dx];
  };
  const hull = hullWorld(s, yacht);
  const samples = densify(hull);
  const contact: ContactSample[] = [];
  for (const obstacle of world.obstacles) {
    const hits = penetrations(hull, samples, obstacle.shape);
    if (!hits.length) continue;
    const k = obstacle.stiffness ?? DEFAULT_STIFFNESS[obstacle.kind];
    let approach = 0;
    for (const hit of hits) {
      const pv = pointVelocity(hit.point);
      const vn = pv[0] * hit.normal[0] + pv[1] * hit.normal[1];
      approach = Math.max(approach, -vn);
      // Spring plus damping only while compressing: fenders absorb, never pull.
      const fn = Math.max(0, k * hit.depth - (vn < 0 ? CONTACT_DAMPING * vn : 0));
      const vt: Vec2 = [pv[0] - vn * hit.normal[0], pv[1] - vn * hit.normal[1]];
      const vtLen = Math.hypot(vt[0], vt[1]);
      const ft = vtLen > 1e-6 ? Math.min(CONTACT_FRICTION * fn, 4000 * vtLen) / vtLen : 0;
      add(hit.point, [fn * hit.normal[0] - ft * vt[0], fn * hit.normal[1] - ft * vt[1]]);
      contactForce += fn;
    }
    contact.push({ obstacle, speed: approach });
  }
  for (const line of s.lines) {
    const cleat = toWorld(s, line.cleat);
    const dx = line.anchor[0] - cleat[0], dy = line.anchor[1] - cleat[1], d = Math.hypot(dx, dy);
    if (d <= line.length || d < 1e-9) continue;
    const n: Vec2 = [dx / d, dy / d], pv = pointVelocity(cleat);
    const opening = pv[0] * -n[0] + pv[1] * -n[1];
    const tension = Math.max(0, LINE_STIFFNESS * (d - line.length) + LINE_DAMPING * opening);
    add(cleat, [tension * n[0], tension * n[1]]);
  }
  X += Fx * f[0] + Fy * f[1];
  Y += Fx * sAxis[0] + Fy * sAxis[1];
  N += Nc;
  return {
    X, Y, N, contact,
    diag: { thrust, rudderFlow: flow, rudderForce, propWalkForce: propWalk, windForce: [Xw, Yw], windMoment: Nw, contactForce },
  };
}

/** One fixed step of the harbour model. Pure: returns a new state. */
export function stepHarbour(prev: HarbourState, input: HarbourInput, world: HarbourWorld,
  yacht: HarbourYacht = OUR_YACHT, dt = HARBOUR_STEP_SECONDS): { state: HarbourState; diag: HarbourDiagnostics } {
  const engine = stepEngine(prev, input.throttle, yacht, dt);
  const target = clamp(input.helm, -1, 1) * yacht.rudderMax;
  const maxTurn = yacht.rudderRate * dt;
  const rudder = prev.rudder + clamp(target - prev.rudder, -maxTurn, maxTurn);
  let s: HarbourState = { ...prev, ...engine, rudder };
  const h = dt / SUBSTEPS;
  let diag: HarbourDiagnostics | null = null;
  const touchedNow = new Map<string, ContactSample>();
  for (let i = 0; i < SUBSTEPS; i++) {
    const F = forces(s, world, yacht);
    diag = F.diag;
    for (const c of F.contact) {
      const seen = touchedNow.get(c.obstacle.id);
      if (!seen || c.speed > seen.speed) touchedNow.set(c.obstacle.id, c);
    }
    // Semi-implicit Euler with the body-frame coupling terms.
    const du = (F.X + yacht.massSway * s.v * s.r) / yacht.massSurge;
    const dv = (F.Y - yacht.massSurge * s.u * s.r) / yacht.massSway;
    const dr = F.N / yacht.inertiaYaw;
    const u = s.u + du * h, v = s.v + dv * h, r = s.r + dr * h;
    const { f, s: st } = axes(s.heading);
    s = {
      ...s, u, v, r,
      x: s.x + (u * f[0] + v * st[0]) * h,
      y: s.y + (u * f[1] + v * st[1]) * h,
      heading: compass(s.heading + r * h * 180 / Math.PI),
    };
  }
  const t = prev.t + dt;
  const touching = { ...prev.touching };
  let contacts = prev.contacts;
  for (const [id, c] of touchedNow) {
    const last = prev.touching[id];
    touching[id] = t;
    if (last !== undefined && t - last <= CONTACT_MERGE_SECONDS) continue;
    const event: ContactEvent = { obstacleId: id, kind: c.obstacle.kind, t, speed: c.speed, energy: 0.5 * yacht.massSurge * c.speed ** 2 };
    contacts = [...contacts, event];
  }
  return { state: { ...s, t, touching, contacts }, diag: diag! };
}

export function attachLine(state: HarbourState, line: MooringLine): HarbourState {
  return { ...state, lines: [...state.lines.filter(l => l.id !== line.id), line] };
}

export function releaseLine(state: HarbourState, id: string): HarbourState {
  return { ...state, lines: state.lines.filter(l => l.id !== id) };
}
