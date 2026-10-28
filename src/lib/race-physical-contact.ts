import { readRaceContext, type PhysicalRaceContext } from "./race-context";
import { matchesPhysicalRaceCourse, physicalCourseDefinition } from "./race-courses";
import type { PhysicalRaceMotion } from "./race-physical-motion";
import type { RaceBoat, RaceCourse, Vec2 } from "./race-physics";

interface ContactSpan {
  /** Fraction of this actual propelled engine step, never wall-clock time. */
  readonly firstHitFraction: number;
  /** Circular envelope clearance. Negative means overlap, not responsibility. */
  readonly minimumClearanceMetres: number;
}
export type PhysicalRaceContact = Readonly<ContactSpan & (
  | { kind: "hull"; boatId: string; otherBoatId: string }
  | { kind: "mark"; boatId: string; markIndex: number }
)>;
interface ContactFrame {
  readonly boats: readonly Pick<RaceBoat, "id" | "lapDone">[];
  readonly motions: ReadonlyMap<string, PhysicalRaceMotion>;
  readonly context: PhysicalRaceContext;
  readonly course: RaceCourse;
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Relative swept circles distinguish an encounter during the same step from
 * two paths that merely cross at different times. No steering extrapolation. */
function swept(a: PhysicalRaceMotion, b: PhysicalRaceMotion, radius: number, scale: number): ContactSpan | null {
  const x = a.from.x - b.from.x, y = a.from.y - b.from.y;
  const vx = a.to.x - a.from.x - (b.to.x - b.from.x), vy = a.to.y - a.from.y - (b.to.y - b.from.y);
  const vv = vx * vx + vy * vy, pv = x * vx + y * vy;
  const closest = vv === 0 ? 0 : Math.max(0, Math.min(1, -pv / vv));
  const clearance = Math.hypot(x + vx * closest, y + vy * closest) - radius;
  if (clearance > 0) return null;
  const c = x * x + y * y - radius * radius;
  const firstHitFraction = c <= 0 || vv === 0 ? 0
    : Math.max(0, Math.min(1, (-pv - Math.sqrt(Math.max(0, pv * pv - vv * c))) / vv));
  return { firstHitFraction, minimumClearanceMetres: clearance * scale };
}

/** Pre-response observations for the explicit physical engine only. At most
 * ten hull pairs and fifteen canonical mark encounters. Read immutable actual
 * propelled segments, not post-separation boat positions. Finished boats are
 * excluded. Circular envelopes do not establish RRS liability or penalties.
 * No buoy response, contact deduplication, logging or persistence is implied. */
export function observePhysicalRaceContacts(frame: ContactFrame): readonly PhysicalRaceContact[] | null {
  if (!object(frame)) return null;
  const read = readRaceContext(frame.context);
  if (!read.ok || read.context.model !== "physical-cruiser-v1" || !matchesPhysicalRaceCourse(read.context, frame.course)
    || !Array.isArray(frame.boats) || frame.boats.length < 1 || frame.boats.length > 5
    || !(frame.motions instanceof Map) || frame.motions.size > 5) return null;
  const d = physicalCourseDefinition(read.context.profile), m = read.context.metresPerUnit;
  const point = (p: unknown): p is Readonly<Vec2> => object(p) && typeof p.x === "number" && Number.isFinite(p.x)
    && typeof p.y === "number" && Number.isFinite(p.y) && p.x >= 0 && p.x <= d.bounds.widthMetres / m
    && p.y >= 0 && p.y <= d.bounds.heightMetres / m;
  const ids = new Set<string>(), active = new Set<string>();
  for (const boat of frame.boats) {
    if (!object(boat) || typeof boat.id !== "string" || !boat.id.trim() || boat.id.length > 100
      || ids.has(boat.id) || typeof boat.lapDone !== "number" || ![0, 1, 2].includes(boat.lapDone)) return null;
    ids.add(boat.id);
    if (boat.lapDone === 2) continue;
    const motion = frame.motions.get(boat.id);
    if (!object(motion) || !point(motion.from) || !point(motion.to)) return null;
    active.add(boat.id);
  }
  if ([...frame.motions.keys()].some(id => !active.has(id))) return null;
  const contacts: PhysicalRaceContact[] = [], boats = frame.boats.filter(b => active.has(b.id));
  for (let i = 0; i < boats.length; i++) {
    const a = boats[i], motion = frame.motions.get(a.id)!;
    for (let j = i + 1; j < boats.length; j++) {
      const b = boats[j], hit = swept(motion, frame.motions.get(b.id)!, d.hardware.boatDiameterMetres / m, m);
      if (hit) {
        const [boatId, otherBoatId] = [a.id, b.id].sort();
        contacts.push(Object.freeze({ kind: "hull", boatId, otherBoatId, ...hit }));
      }
    }
    frame.course.marks.forEach((mark, markIndex) => {
      const hit = swept(motion, { from: mark.pos, to: mark.pos }, d.hardware.boatDiameterMetres / (2 * m) + mark.radius, m);
      if (hit) contacts.push(Object.freeze({ kind: "mark", boatId: a.id, markIndex, ...hit }));
    });
  }
  return Object.freeze(contacts);
}
