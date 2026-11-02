import type { PhysicalRaceContext } from "./race-context";
import { physicalCourseDefinition, physicalCourseWaterBounds } from "./race-courses";
import { observePhysicalRaceContacts, type PhysicalRaceContact } from "./race-physical-contact";
import type { PhysicalRaceMotion } from "./race-physical-motion";
import { FULL_BUMP_CLOSING_KN, type RaceBoat, type RaceCourse, type Vec2 } from "./race-physics";
import { KNOT_METRES_PER_SECOND } from "./sailing-kinematics";

interface ResponseFrame {
  readonly boats: readonly Pick<RaceBoat, "id" | "lapDone">[];
  readonly motions: ReadonlyMap<string, PhysicalRaceMotion>;
  readonly context: PhysicalRaceContext;
  readonly course: RaceCourse;
  readonly dt: number;
}
interface Body {
  id: string; pos: Vec2; velocity: Vec2; from: Vec2; damping: number;
  /** The proposal, returned unchanged while recovery and contact leave the body alone. */
  proposal: PhysicalRaceMotion;
  /** Closing constraint hits this tick; more than MAX_SLIDING_HITS stops the body. */
  hits: number;
  /** Positions where the velocity changed mid-tick (ADR-0015 point 4). */
  bends: Vec2[];
  changed: boolean;
}
interface Impact { t: number; a: Body; b?: Body; markIndex?: number; wall?: "x" | "y"; closing: number }
export interface PhysicalRaceImpactBody {
  /** Same course origin/axes as race-world-v1: east x, south y, in metres. */
  readonly centreMetres: Readonly<Vec2>;
  /** Instantaneous linear-step velocity before this encounter stops travel. */
  readonly velocityMetresPerSecond: Readonly<Vec2>;
}
/** Actual common-clock encounter before either body's remaining travel stops.
 * Initial overlap has no known impact velocity and stays in initialContacts.
 * These circular kinematics alone never establish rule liability. */
export type PhysicalRaceImpact = Readonly<{
  firstHitFraction: number;
  closingMetresPerSecond: number;
  boatId: string;
  boat: PhysicalRaceImpactBody;
} & (
  | { kind: "hull"; otherBoatId: string; otherBoat: PhysicalRaceImpactBody }
  | { kind: "mark"; markIndex: number }
)>;
export interface PhysicalRaceResponse {
  readonly motions: ReadonlyMap<string, PhysicalRaceMotion>;
  readonly contacts: readonly PhysicalRaceContact[];
  readonly initialContacts: readonly PhysicalRaceContact[];
  readonly impacts: readonly PhysicalRaceImpact[];
  readonly speedMultipliers: ReadonlyMap<string, number>;
}
const tolerance = 1e-7;
/** A body hit more often than this within one tick is wedged and stops for
 * the rest of the tick, as every closing hit did before ADR-0015. */
const MAX_SLIDING_HITS = 3;
const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y;

function frozenMotion(from: Readonly<Vec2>, to: Readonly<Vec2>, path: readonly Readonly<Vec2>[] | undefined): PhysicalRaceMotion {
  return Object.freeze({ from: Object.freeze({ x: from.x, y: from.y }), to: Object.freeze({ x: to.x, y: to.y }),
    ...(path?.length ? { path: Object.freeze(path.map(p => Object.freeze({ x: p.x, y: p.y }))) } : {}) });
}

/** Time of impact for circular envelopes over a common remaining tick.
 * Resting/tangential or separating contact must not pin an escaping boat. */
function impact(a: Body, p: Vec2, v: Vec2, radius: number, remaining: number) {
  const offset = { x: a.pos.x - p.x, y: a.pos.y - p.y };
  const relative = { x: a.velocity.x - v.x, y: a.velocity.y - v.y };
  const vv = dot(relative, relative), pv = dot(offset, relative);
  const c = dot(offset, offset) - radius * radius;
  if (vv === 0 || pv >= -tolerance * Math.max(radius, Math.hypot(offset.x, offset.y))) return null;
  const discriminant = pv * pv - vv * c;
  if (discriminant < 0) return null;
  const t = Math.max(0, (-pv - Math.sqrt(discriminant)) / vv);
  if (t > remaining + tolerance) return null;
  const x = offset.x + relative.x * t, y = offset.y + relative.y * t;
  const closing = Math.max(0, -(x * relative.x + y * relative.y) / Math.max(radius, Math.hypot(x, y)));
  return { t: Math.min(remaining, t), closing };
}

/** ADR-0013 circular contact constraint with the ADR-0015 sliding response,
 * for the physical fleet. Recover existing overlap before travel, then advance
 * all bodies on one clock to each actual impact. At a closing impact each body
 * loses only its own velocity component into the other body (or the mark, or
 * the water bound) and keeps its tangential travel: no shove, no freeze. A
 * body hit more than MAX_SLIDING_HITS times in one tick is wedged and stops
 * for the rest of the tick. Every mid-tick velocity change is a bend of the
 * returned travelled polyline, which progress grades segment by segment.
 * Recovery never enters the travelled path or earns progress. No caller is
 * mutated, no force/helm constant changes and no RRS liability is inferred. */
export function constrainPhysicalRaceTravel(frame: ResponseFrame): PhysicalRaceResponse | null {
  if (!frame || frame.dt !== 1 / 30) return null;
  // This validates the full canonical context/course, identities and motions.
  if (!observePhysicalRaceContacts(frame)) return null;
  const d = physicalCourseDefinition(frame.context.profile), m = frame.context.metresPerUnit;
  const water = physicalCourseWaterBounds(frame.context.profile), radius = d.hardware.boatDiameterMetres / (2 * m);
  const bodies: Body[] = frame.boats.filter(b => b.lapDone !== 2).map(b => {
    const motion = frame.motions.get(b.id)!;
    return { id: b.id, pos: { ...motion.from }, from: { ...motion.from }, damping: 1, proposal: motion,
      hits: 0, bends: [], changed: false,
      velocity: { x: motion.to.x - motion.from.x, y: motion.to.y - motion.from.y } };
  }).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const contacts = new Map<string, PhysicalRaceContact>();
  const remember = (contact: PhysicalRaceContact) => {
    const key = JSON.stringify(contact.kind === "hull" ? ["h", contact.boatId, contact.otherBoatId] : ["m", contact.boatId, contact.markIndex]);
    if (!contacts.has(key)) contacts.set(key, Object.freeze(contact));
  };
  const stationary = new Map(bodies.map(b => [b.id, { from: b.from, to: b.from }]));
  const initialContacts = observePhysicalRaceContacts({ ...frame, motions: stationary })!;
  for (const contact of initialContacts) remember(contact);
  const impacts: PhysicalRaceImpact[] = [];
  const snapshot = (body: Body): PhysicalRaceImpactBody => Object.freeze({
    centreMetres: Object.freeze({ x: body.pos.x * m, y: body.pos.y * m }),
    velocityMetresPerSecond: Object.freeze({ x: body.velocity.x * m / frame.dt, y: body.velocity.y * m / frame.dt }),
  });
  const clamp = (p: Vec2) => {
    p.x = Math.max(water.minX, Math.min(water.maxX, p.x));
    p.y = Math.max(water.minY, Math.min(water.maxY, p.y));
  };
  // Sorted IDs make initial-overlap recovery independent of caller order.
  // Bounded projection handles coupled hull/mark/water constraints. Reject a
  // nonconverging frame atomically instead of returning an illegal position.
  let recovered = false;
  for (let pass = 0; pass < 256; pass++) {
    let largest = 0;
    for (const body of bodies) {
      const old = { ...body.pos }; clamp(body.pos);
      largest = Math.max(largest, Math.hypot(body.pos.x - old.x, body.pos.y - old.y));
      for (const mark of frame.course.marks) {
        const dx = body.pos.x - mark.pos.x, dy = body.pos.y - mark.pos.y, gap = Math.hypot(dx, dy);
        const overlap = radius + mark.radius - gap;
        if (overlap <= 0) continue;
        const nx = gap > 0 ? dx / gap : 1, ny = gap > 0 ? dy / gap : 0;
        body.pos.x += nx * (overlap + tolerance); body.pos.y += ny * (overlap + tolerance);
        largest = Math.max(largest, overlap);
      }
    }
    for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i], b = bodies[j], dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y, gap = Math.hypot(dx, dy);
      const overlap = radius * 2 - gap;
      if (overlap <= 0) continue;
      const nx = gap > 0 ? dx / gap : 1, ny = gap > 0 ? dy / gap : 0, push = (overlap + tolerance) / 2;
      a.pos.x -= nx * push; a.pos.y -= ny * push; b.pos.x += nx * push; b.pos.y += ny * push;
      largest = Math.max(largest, overlap);
    }
    if (largest <= tolerance) { recovered = true; break; }
  }
  if (!recovered) return null;
  for (const body of bodies) body.from = { ...body.pos };
  let elapsed = 0;
  for (let iteration = 0; iteration < 64 && elapsed < 1; iteration++) {
    const remaining = 1 - elapsed, hits: Impact[] = [];
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j], hit = impact(a, b.pos, b.velocity, radius * 2, remaining);
        if (hit) hits.push({ ...hit, a, b });
      }
      frame.course.marks.forEach((mark, markIndex) => {
        const hit = impact(a, mark.pos, { x: 0, y: 0 }, radius + mark.radius, remaining);
        if (hit) hits.push({ ...hit, a, markIndex });
      });
      for (const [axis, pos, velocity, low, high] of [["x", a.pos.x, a.velocity.x, water.minX, water.maxX], ["y", a.pos.y, a.velocity.y, water.minY, water.maxY]] as const) {
        if (velocity === 0) continue;
        const bound = velocity > 0 ? high : low, t = (bound - pos) / velocity;
        // Travel that ends on the bound needs no wall response: no tick time
        // is left to slide, and stepPhysicalBoat's own bound clamp (with its
        // recorded bend) already ends every proposal exactly there. Treating
        // it as a hit would rebuild the motion from the chord and drop that
        // bend before progress grades the polyline.
        if (Math.abs(pos + velocity * remaining - bound) <= tolerance) continue;
        if (t >= -tolerance && t <= remaining) hits.push({ t: Math.max(0, t), a, wall: axis, closing: Math.abs(velocity) });
      }
    }
    const first = Math.min(remaining, ...hits.map(hit => hit.t));
    for (const body of bodies) { body.pos.x += body.velocity.x * first; body.pos.y += body.velocity.y * first; }
    elapsed += first;
    const simultaneous = hits.filter(hit => Math.abs(hit.t - first) <= tolerance);
    if (!simultaneous.length) break;
    for (const hit of simultaneous) {
      if (hit.b) remember({ kind: "hull", boatId: hit.a.id, otherBoatId: hit.b.id, firstHitFraction: elapsed, minimumClearanceMetres: 0 });
      else if (hit.markIndex !== undefined) remember({ kind: "mark", boatId: hit.a.id, markIndex: hit.markIndex, firstHitFraction: elapsed, minimumClearanceMetres: 0 });
      // Read all simultaneous velocities before stopping any body. A later
      // encounter sees an already stopped hull, never its cancelled proposal.
      if (!hit.wall) {
        const evidence = { boatId: hit.a.id, boat: snapshot(hit.a), firstHitFraction: elapsed,
          closingMetresPerSecond: hit.closing * m / frame.dt };
        if (hit.b) impacts.push(Object.freeze({ ...evidence, kind: "hull", otherBoatId: hit.b.id, otherBoat: snapshot(hit.b) }));
        else if (hit.markIndex !== undefined) impacts.push(Object.freeze({ ...evidence, kind: "mark", markIndex: hit.markIndex }));
      }
      // Preserve ADR-0004's closing-only, time-based contact loss. Separating
      // boats keep speed; wall constraints alone do not add a bump penalty.
      if (!hit.wall && hit.closing > tolerance) {
        const share = Math.min(1, hit.closing * m / (frame.dt * KNOT_METRES_PER_SECOND * FULL_BUMP_CLOSING_KN));
        const damping = Math.exp(-1.67 * frame.dt * share);
        hit.a.damping *= damping; if (hit.b) hit.b.damping *= damping;
      }
    }
    // ADR-0015 sliding: each body loses only its own component into the
    // other body, read along the contact normal at the impact position.
    const before = new Map(bodies.map(body => [body, body.velocity]));
    for (const hit of simultaneous) {
      if (hit.closing <= tolerance) continue;
      const touched = hit.b ? [hit.a, hit.b] : [hit.a];
      for (const body of touched) body.hits += 1;
      if (hit.wall) hit.a.velocity = hit.wall === "x" ? { x: 0, y: hit.a.velocity.y } : { x: hit.a.velocity.x, y: 0 };
      else {
        const centre = hit.b ? hit.b.pos : frame.course.marks[hit.markIndex!].pos;
        const dx = centre.x - hit.a.pos.x, dy = centre.y - hit.a.pos.y, gap = Math.hypot(dx, dy);
        const n = gap > 0 ? { x: dx / gap, y: dy / gap } : { x: 1, y: 0 };
        const va = dot(hit.a.velocity, n);
        if (va > 0) hit.a.velocity = { x: hit.a.velocity.x - va * n.x, y: hit.a.velocity.y - va * n.y };
        if (hit.b) {
          const vb = dot(hit.b.velocity, n);
          if (vb < 0) hit.b.velocity = { x: hit.b.velocity.x - vb * n.x, y: hit.b.velocity.y - vb * n.y };
        }
      }
      for (const body of touched) if (body.hits > MAX_SLIDING_HITS) body.velocity = { x: 0, y: 0 };
    }
    // A changed velocity bends the travelled path here (a stop is a bend too;
    // a bend at the start or at the end of the path is not interior). A body
    // whose own velocity did not change keeps its free travel bit for bit.
    for (const body of bodies) {
      const previous = before.get(body)!;
      if (previous.x === body.velocity.x && previous.y === body.velocity.y) continue;
      body.changed = true;
      const last = body.bends[body.bends.length - 1] ?? body.from;
      if (body.pos.x !== last.x || body.pos.y !== last.y) body.bends.push({ ...body.pos });
    }
  }
  if (elapsed < 1 - tolerance) return null;
  const motions = new Map<string, PhysicalRaceMotion>(), speedMultipliers = new Map<string, number>();
  for (const body of bodies) {
    // This is a final invariant check, not another unrecorded recovery push.
    if (body.pos.x < water.minX - tolerance || body.pos.x > water.maxX + tolerance
      || body.pos.y < water.minY - tolerance || body.pos.y > water.maxY + tolerance
      || frame.course.marks.some(mark => Math.hypot(body.pos.x - mark.pos.x, body.pos.y - mark.pos.y) < radius + mark.radius - tolerance)
      || bodies.some(other => other !== body && Math.hypot(body.pos.x - other.pos.x, body.pos.y - other.pos.y) < radius * 2 - tolerance)) return null;
    // Free travel returns the proposal itself (bit-identical, with its own
    // bound bends); changed travel returns the simulated polyline. A body
    // changed by a contact or by recovery is simulated on its chord, so a
    // bound bend of its proposal in that same tick is replaced by the
    // simulated bends. The chord stays inside the (convex) water and within
    // one tick of travel (under 1 unit) of the dropped bend; no gate ends
    // that close to a bound (nearest in-water gate end: 22 units, the long
    // north gate, which runs on through the bound), so chord and bent path
    // cross the same gates the same way (known limit, ADR-0015 point 4).
    const free = !body.changed && body.from.x === body.proposal.from.x && body.from.y === body.proposal.from.y;
    motions.set(body.id, free ? frozenMotion(body.proposal.from, body.proposal.to, body.proposal.path)
      : frozenMotion(body.from, body.pos, body.bends.filter(p => p.x !== body.pos.x || p.y !== body.pos.y)));
    speedMultipliers.set(body.id, body.damping);
  }
  return { motions, contacts: Object.freeze([...contacts.values()]), initialContacts,
    impacts: Object.freeze(impacts), speedMultipliers };
}
