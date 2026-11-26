// The corner mini-map as a radar (M2-4): centred on the player, north up
// like the full map, zoomed just enough to hold the next mark and the
// nearest rivals. Pure, in the snapshot's own race coordinates, so it is
// unit-agnostic: the caller passes the hull length of the active model.
import { MIN_BOAT_SEPARATION, type Vec2 } from "@/lib/race-physics";
import type { RaceMapBounds, RaceNavigationSnapshot } from "./navigation-model";

export interface RadarOptions {
  /** One hull length in the snapshot's coordinates (legacy: MIN_BOAT_SEPARATION units). */
  hull?: number;
  /** How many of the nearest rivals the zoom must hold. */
  rivals?: number;
}

/** The radar never zooms in closer than this many hull lengths around the boat. */
export const RADAR_MIN_HULLS = 5;
/** A rival further than this share of the mark's range does not widen the view. */
const RIVAL_REACH = 1.6;
/** Room around the farthest kept object, so its glyph is not on the rim. */
const MARGIN = 1.15;

const d = (a: Vec2, b: Vec2) => Math.hypot(b.x - a.x, b.y - a.y);

/** Where the radar must reach when the caller does not say which target is
 * next. The snapshot does not know the leg, and the next target is either the
 * nearest rounding mark (on the beat) or the finish (on the run), so the
 * radar reaches the farther of the two: a square centred on the player that
 * holds it holds the nearer one too, and the next target is never cut off. */
export function radarFallbackFocus(snapshot: RaceNavigationSnapshot, player: Vec2): Vec2 {
  let best: Vec2 | null = null;
  for (const mark of snapshot.course.marks) {
    if (mark.type !== "windward") continue;
    if (!best || d(player, mark.pos) < d(player, best)) best = mark.pos;
  }
  const { a, b } = snapshot.course.finishLine;
  const finish = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return best && d(player, best) > d(player, finish) ? best : finish;
}

/** Half the side of the radar square, race units. Zoom steps are whole
 * multiples of half a minimum range, so the view does not breathe with
 * every snapshot. */
export function radarHalfRange(player: Vec2, focus: Vec2 | null, rivals: readonly Vec2[], options: RadarOptions = {}, maxHalf = Infinity): number {
  const hull = options.hull && options.hull > 0 ? options.hull : MIN_BOAT_SEPARATION;
  const minHalf = hull * RADAR_MIN_HULLS;
  const step = minHalf / 2;
  let need = focus ? d(player, focus) : 0;
  const reach = Math.max(need, minHalf) * RIVAL_REACH;
  const near = rivals.map((r) => d(player, r)).filter((v) => v <= reach).sort((a, b) => a - b).slice(0, options.rivals ?? 2);
  for (const v of near) need = Math.max(need, v);
  const half = Math.max(minHalf, need * MARGIN + hull * 0.5);
  return Math.min(Math.max(minHalf, maxHalf), Math.ceil(half / step - 1e-9) * step);
}

/** The square the radar shows, or null without a player (the map then shows the whole course). */
export function radarBounds(snapshot: RaceNavigationSnapshot, focus?: Vec2 | null, options: RadarOptions = {}): RaceMapBounds | null {
  const player = snapshot.boats.find((b) => b.isPlayer);
  if (!player) return null;
  const target = focus === undefined ? radarFallbackFocus(snapshot, player.pos) : focus;
  const rivals = snapshot.boats.filter((b) => !b.isPlayer).map((b) => b.pos);
  const b = snapshot.bounds;
  const half = radarHalfRange(player.pos, target, rivals, options, Math.hypot(b.maxX - b.minX, b.maxY - b.minY));
  return { minX: player.pos.x - half, minY: player.pos.y - half, maxX: player.pos.x + half, maxY: player.pos.y + half };
}
