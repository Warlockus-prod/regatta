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
interface Body { id: string; pos: Vec2; velocity: Vec2; from: Vec2; damping: number }
interface Impact { t: number; a: Body; b?: Body; markIndex?: number; wall?: true; closing: number }
export interface PhysicalRaceResponse {
  readonly motions: ReadonlyMap<string, PhysicalRaceMotion>;
  readonly contacts: readonly PhysicalRaceContact[];
  readonly speedMultipliers: ReadonlyMap<string, number>;
}
const tolerance = 1e-7;
const dot = (a: Vec2, b: Vec2) => a.x * b.x + a.y * b.y;

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

/** ADR-0013 circular contact constraint, currently only for the unwired
 * physical fleet. Recover existing overlap before travel, then advance all
 * bodies on one clock to each actual impact. An impacted body stops for the
 * rest of this tick; other bodies continue and can encounter the stopped hull.
 * Recovery never enters the travelled segment or earns progress. No caller is
 * mutated, no force/helm constant changes and no RRS liability is inferred. */
export function constrainPhysicalRaceTravel(frame: ResponseFrame): PhysicalRaceResponse | null {
  if (!frame || frame.dt !== 1 / 30) return null;
  // This validates the full canonical context/course, identities and motions.
  if (!observePhysicalRaceContacts(frame)) return null;
  const d = physicalCourseDefinition(frame.context.profile), m = frame.context.metresPerUnit;
  const water = physicalCourseWaterBounds(frame.context.profile), radius = d.hardware.boatDiameterMetres / (2 * m);
  const bodies: Body[] = frame.boats.filter(b => b.lapDone !== 2).map(b => {
    const motion = frame.motions.get(b.id)!;
    return { id: b.id, pos: { ...motion.from }, from: { ...motion.from }, damping: 1,
      velocity: { x: motion.to.x - motion.from.x, y: motion.to.y - motion.from.y } };
  }).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const contacts = new Map<string, PhysicalRaceContact>();
  const remember = (contact: PhysicalRaceContact) => {
    const key = JSON.stringify(contact.kind === "hull" ? ["h", contact.boatId, contact.otherBoatId] : ["m", contact.boatId, contact.markIndex]);
    if (!contacts.has(key)) contacts.set(key, Object.freeze(contact));
  };
  const stationary = new Map(bodies.map(b => [b.id, { from: b.from, to: b.from }]));
  for (const contact of observePhysicalRaceContacts({ ...frame, motions: stationary })!) remember(contact);
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
      for (const [pos, velocity, low, high] of [[a.pos.x, a.velocity.x, water.minX, water.maxX], [a.pos.y, a.velocity.y, water.minY, water.maxY]]) {
        if (velocity === 0) continue;
        const t = ((velocity > 0 ? high : low) - pos) / velocity;
        if (t >= -tolerance && t <= remaining) hits.push({ t: Math.max(0, t), a, wall: true, closing: Math.abs(velocity) });
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
      // Preserve ADR-0004's closing-only, time-based contact loss. Separating
      // boats keep speed; wall constraints alone do not add a bump penalty.
      if (!hit.wall && hit.closing > tolerance) {
        const share = Math.min(1, hit.closing * m / (frame.dt * KNOT_METRES_PER_SECOND * FULL_BUMP_CLOSING_KN));
        const damping = Math.exp(-1.67 * frame.dt * share);
        hit.a.damping *= damping; if (hit.b) hit.b.damping *= damping;
      }
    }
    for (const hit of simultaneous) {
      if (hit.closing <= tolerance) continue;
      hit.a.velocity = { x: 0, y: 0 }; if (hit.b) hit.b.velocity = { x: 0, y: 0 };
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
    motions.set(body.id, Object.freeze({ from: Object.freeze({ ...body.from }), to: Object.freeze({ ...body.pos }) }));
    speedMultipliers.set(body.id, body.damping);
  }
  return { motions, contacts: Object.freeze([...contacts.values()]), speedMultipliers };
}
