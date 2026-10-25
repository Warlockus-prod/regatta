import type { CourseMark, RaceCourse, Vec2 } from "@/lib/race-physics";
import { apparentWind, twaFromCompass } from "@/lib/sailing-physics/wind";

export interface RaceWindInput {
  heading: number;
  boatSpeedKn: number;
  windFrom: number;
  windKnots?: number | null;
  leeway?: number;
}
export interface RaceWindReading {
  readonly heading: number;
  readonly trueFrom: number;
  readonly trueKnots: number | null;
  /** Positive means wind from starboard, matching the shared trainer. */
  readonly twaSigned: number;
  readonly awaSigned: number | null;
  readonly apparentKnots: number | null;
  readonly apparentFrom: number | null;
}
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const bearing = (v: number) => ((v % 360) + 360) % 360;

/** Read knots directly from the model/frame, never the wake's visual speed.
 * Old replays without true-wind speed retain an explicitly unknown reading. */
export function raceWindReading(input: RaceWindInput): RaceWindReading | null {
  if (!input || !finite(input.heading) || !finite(input.windFrom)) return null;
  const heading = bearing(input.heading), trueFrom = bearing(input.windFrom);
  const twaSigned = twaFromCompass(trueFrom, heading);
  const trueKnots = finite(input.windKnots) && input.windKnots >= 0 ? input.windKnots : null;
  const leeway = input.leeway ?? 0;
  const apparent = trueKnots !== null && finite(input.boatSpeedKn) && input.boatSpeedKn >= 0 && finite(leeway)
    ? apparentWind(trueKnots, twaSigned, input.boatSpeedKn, leeway) : null;
  const known = apparent && finite(apparent.awa) && finite(apparent.aws);
  return Object.freeze({ heading, trueFrom, trueKnots, twaSigned,
    awaSigned: known ? apparent.awa : null, apparentKnots: known ? apparent.aws : null,
    apparentFrom: known ? bearing(heading + apparent.awa) : null });
}

type Point = Readonly<Vec2>;
type Line = Readonly<{ a: Point; b: Point }>;
export interface RaceMapCourse {
  readonly marks: readonly Readonly<Pick<CourseMark, "pos" | "type">>[];
  readonly startLine: RaceCourse["startLine"];
  readonly finishLine: RaceCourse["finishLine"];
}
export interface RaceMapBoat {
  readonly id: string;
  readonly pos: Point;
  readonly heading: number;
  readonly isPlayer?: boolean;
  readonly color?: string;
}
export interface RaceMapBounds { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number }
export interface RaceNavigationInput {
  course: RaceMapCourse;
  boats: readonly RaceMapBoat[];
  windFrom: number | null;
  /** Minimum view extent. Actual course/boats remain visible outside it. */
  bounds?: RaceMapBounds;
  terrain?: readonly (readonly Point[])[];
}
export interface RaceNavigationSnapshot {
  readonly course: Readonly<{ marks: readonly Readonly<{ pos: Point; type: CourseMark["type"] }>[]; startLine: Line; finishLine: Line }>;
  readonly boats: readonly RaceMapBoat[];
  readonly windFrom: number | null;
  readonly bounds: RaceMapBounds;
  readonly terrain: readonly (readonly Point[])[];
  readonly sharedLine: boolean;
}
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const point = (v: unknown): v is Vec2 => object(v) && finite(v.x) && finite(v.y) && Math.abs(v.x) <= 1e6 && Math.abs(v.y) <= 1e6;
const copyPoint = (v: Point): Point => Object.freeze({ x: v.x, y: v.y });
function copyLine(v: unknown): Line | null {
  return object(v) && point(v.a) && point(v.b) ? Object.freeze({ a: copyPoint(v.a), b: copyPoint(v.b) }) : null;
}
function validBounds(v: unknown): v is RaceMapBounds {
  return object(v) && finite(v.minX) && finite(v.minY) && finite(v.maxX) && finite(v.maxY) && v.maxX > v.minX && v.maxY > v.minY
    && finite(v.maxX - v.minX) && finite(v.maxY - v.minY);
}
const samePoint = (a: Point, b: Point) => Math.abs(a.x - b.x) < 1e-8 && Math.abs(a.y - b.y) < 1e-8;

/** Copy bounded presentation data at the caller's HUD cadence. No refs,
 * timers, progress, engine, storage, network or diagnostics are touched. */
export function createRaceNavigationSnapshot(input: RaceNavigationInput): RaceNavigationSnapshot | null {
  if (!input || !object(input.course) || !Array.isArray(input.course.marks) || input.course.marks.length > 64
    || !Array.isArray(input.boats) || input.boats.length > 64) return null;
  const startLine = copyLine(input.course.startLine), finishLine = copyLine(input.course.finishLine);
  if (!startLine || !finishLine || (input.bounds && !validBounds(input.bounds))) return null;
  const marks: { pos: Point; type: CourseMark["type"] }[] = [];
  for (const mark of input.course.marks) {
    if (!object(mark) || !point(mark.pos) || !["start", "windward", "finish"].includes(String(mark.type))) return null;
    marks.push(Object.freeze({ pos: copyPoint(mark.pos), type: mark.type as CourseMark["type"] }));
  }
  const boats: RaceMapBoat[] = [], ids = new Set<string>();
  for (const boat of input.boats) {
    if (!object(boat) || typeof boat.id !== "string" || !boat.id || boat.id.length > 100 || ids.has(boat.id)
      || !point(boat.pos) || !finite(boat.heading)) continue;
    ids.add(boat.id);
    const color = typeof boat.color === "string" && /^#(?:[a-f\d]{3}|[a-f\d]{6}|[a-f\d]{8})$/i.test(boat.color) ? boat.color : undefined;
    boats.push(Object.freeze({ id: boat.id, pos: copyPoint(boat.pos), heading: bearing(boat.heading),
      isPlayer: boat.isPlayer === true, ...(color ? { color } : {}) }));
  }
  const points = [startLine.a, startLine.b, finishLine.a, finishLine.b, ...marks.map(m => m.pos), ...boats.map(b => b.pos)];
  let minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x));
  let minY = Math.min(...points.map(p => p.y)), maxY = Math.max(...points.map(p => p.y));
  if (input.bounds) {
    minX = Math.min(minX, input.bounds.minX); maxX = Math.max(maxX, input.bounds.maxX);
    minY = Math.min(minY, input.bounds.minY); maxY = Math.max(maxY, input.bounds.maxY);
  }
  const pad = Math.max(10, Math.max(maxX - minX, maxY - minY) * .04);
  const bounds = Object.freeze({ minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad });
  if (!validBounds(bounds)) return null;
  const terrain: (readonly Point[])[] = [];
  if (Array.isArray(input.terrain)) for (const polygon of input.terrain.slice(0, 12)) {
    if (Array.isArray(polygon) && polygon.length >= 3 && polygon.length <= 160 && polygon.every(point)) terrain.push(Object.freeze(polygon.map(copyPoint)));
  }
  return Object.freeze({ course: Object.freeze({ marks: Object.freeze(marks), startLine, finishLine }),
    boats: Object.freeze(boats), windFrom: finite(input.windFrom) ? bearing(input.windFrom) : null, bounds,
    terrain: Object.freeze(terrain), sharedLine: (samePoint(startLine.a, finishLine.a) && samePoint(startLine.b, finishLine.b))
      || (samePoint(startLine.a, finishLine.b) && samePoint(startLine.b, finishLine.a)) });
}

export interface RaceMapProjection {
  readonly scale: number;
  readonly viewport: Readonly<{ x: number; y: number; width: number; height: number }>;
  readonly project: (point: Point) => Vec2;
}
/** One uniform raw-coordinate scale, with north at the top and letterboxing.
 * It never applies metresPerUnit a second time or stretches a saved course. */
export function raceMapProjection(bounds: RaceMapBounds, width: number, height: number, padding = 18): RaceMapProjection | null {
  if (!validBounds(bounds) || ![width, height, padding].every(finite) || width < 64 || height < 64 || width > 4096 || height > 4096
    || padding < 0 || padding * 2 >= Math.min(width, height)) return null;
  const scale = Math.min((width - padding * 2) / (bounds.maxX - bounds.minX), (height - padding * 2) / (bounds.maxY - bounds.minY));
  if (!finite(scale) || scale <= 0) return null;
  const w = (bounds.maxX - bounds.minX) * scale, h = (bounds.maxY - bounds.minY) * scale;
  const viewport = Object.freeze({ x: (width - w) / 2, y: (height - h) / 2, width: w, height: h });
  return Object.freeze({ scale, viewport, project: (p: Point) => ({ x: viewport.x + (p.x - bounds.minX) * scale, y: viewport.y + (p.y - bounds.minY) * scale }) });
}
