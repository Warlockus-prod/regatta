// The big race map (F3, TestFlight 74: "the map is small, needs modes and
// zoom"): pure view maths shared by the race, the multiplayer race and the
// replay. North up or bow up, a zoom between the whole course and 8x, and the
// projection from race coordinates to the map's pixels. No DOM, no React.
import type { Vec2 } from "@/lib/race-physics";
import type { RaceMapBounds, RaceNavigationSnapshot } from "./navigation-model";

export type MapOrientation = "north" | "heading";
export interface BigMapState {
  readonly zoom: number;
  readonly orientation: MapOrientation;
  /** A drag's offset of the map's centre, race units; only while zoomed in. */
  readonly pan: Readonly<Vec2>;
}

/** Zoom 1 shows the whole course; each button press is one step. */
export const MAP_ZOOM = Object.freeze({ min: 1, max: 8, step: 1.5 });
const NO_PAN: Readonly<Vec2> = Object.freeze({ x: 0, y: 0 });
export const BIG_MAP_INITIAL: BigMapState = Object.freeze({ zoom: 1, orientation: "north", pan: NO_PAN });

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Any zoom the map can show; a broken value is the whole course. */
export function clampMapZoom(zoom: number): number {
  if (!finite(zoom)) return MAP_ZOOM.min;
  const z = Math.min(MAP_ZOOM.max, Math.max(MAP_ZOOM.min, zoom));
  // A pinch that ends a hair away from a limit lands on it, so the buttons'
  // disabled state and "whole course" agree with what the player sees.
  return Math.abs(z - MAP_ZOOM.min) < 1e-3 ? MAP_ZOOM.min : Math.abs(z - MAP_ZOOM.max) < 1e-3 ? MAP_ZOOM.max : z;
}

/** `steps` button presses (negative zooms out), clamped. */
export function stepMapZoom(zoom: number, steps: number): number {
  return clampMapZoom(clampMapZoom(zoom) * MAP_ZOOM.step ** (finite(steps) ? steps : 0));
}

export type BigMapAction =
  | { type: "zoom"; steps: number }
  | { type: "scale"; base: number; factor: number }
  | { type: "factor"; factor: number }
  | { type: "fit" }
  | { type: "orientation"; orientation: MapOrientation }
  /** A drag moved the centre by (dx, dy) race units; it stays within +-limit (half the course). */
  | { type: "pan"; dx: number; dy: number; limit: Readonly<Vec2> };

/** A new zoom; back at the whole course the drag offset goes too. */
const zoomed = (state: BigMapState, zoom: number): BigMapState => ({ ...state, zoom, pan: zoom <= MAP_ZOOM.min ? NO_PAN : state.pan ?? NO_PAN });
const clampAbs = (v: number, limit: number) => Math.max(-Math.abs(limit), Math.min(Math.abs(limit), v));

/** The map's whole state change: buttons, pinch (scale from the pinch's start), the wheel (factor), fit, mode and drag. */
export function bigMapReducer(state: BigMapState, action: BigMapAction): BigMapState {
  switch (action.type) {
    case "zoom": return zoomed(state, stepMapZoom(state.zoom, action.steps));
    case "scale": return zoomed(state, clampMapZoom(action.base * (finite(action.factor) && action.factor > 0 ? action.factor : 1)));
    case "factor": return zoomed(state, clampMapZoom(state.zoom * (finite(action.factor) && action.factor > 0 ? action.factor : 1)));
    // "Whole course" resets the zoom and the drag; the chosen orientation stays.
    case "fit": return { ...state, zoom: MAP_ZOOM.min, pan: NO_PAN };
    case "orientation": return action.orientation === "north" || action.orientation === "heading" ? { ...state, orientation: action.orientation } : state;
    case "pan": {
      // The whole course needs no drag; a broken step or limit changes nothing.
      if (state.zoom <= MAP_ZOOM.min || ![action.dx, action.dy, action.limit?.x, action.limit?.y].every(finite)) return state;
      const pan = state.pan ?? NO_PAN;
      return { ...state, pan: { x: clampAbs(pan.x + action.dx, action.limit.x), y: clampAbs(pan.y + action.dy, action.limit.y) } };
    }
  }
}

/** How far a drag may move the centre: half the course each way, so a corner can come to the middle. */
export function mapPanLimit(fit: RaceMapBounds): Vec2 {
  return { x: Math.max(0, (fit.maxX - fit.minX) / 2), y: Math.max(0, (fit.maxY - fit.minY) / 2) };
}

/**
 * The race-unit step of the map's centre for a drag of (dx, dy) screen pixels:
 * the map follows the finger, so the centre moves the other way, turned back
 * by the map's rotation (bow up) and divided by its scale.
 */
export function mapDragToPan(view: Pick<RaceMapView, "scale" | "rotation">, dx: number, dy: number): Vec2 {
  if (![view.scale, view.rotation, dx, dy].every(finite) || view.scale <= 0) return { x: 0, y: 0 };
  const theta = view.rotation * Math.PI / 180, cos = Math.cos(theta), sin = Math.sin(theta);
  // Inverse of the projection's rotation: R(-theta).
  const x = (dx * cos + dy * sin) / view.scale, y = (-dx * sin + dy * cos) / view.scale;
  return { x: -x || 0, y: -y || 0 };
}

/** What "whole course" holds: the snapshot's course, fleet and margin, plus the player's track. */
export function mapFitBounds(snapshot: RaceNavigationSnapshot, track: readonly Vec2[] = []): RaceMapBounds {
  let { minX, minY, maxX, maxY } = snapshot.bounds;
  for (const p of track) {
    if (!finite(p.x) || !finite(p.y)) continue;
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

export interface RaceMapView {
  /** Pixels per race unit. */
  readonly scale: number;
  /** Degrees the world is turned on the map: 0 north up, minus the heading bow up. */
  readonly rotation: number;
  /** The race point at the map's centre. */
  readonly centre: Vec2;
  readonly project: (point: Readonly<Vec2>) => Vec2;
}
export interface MapViewInput {
  fit: RaceMapBounds;
  width: number;
  height: number;
  zoom: number;
  orientation: MapOrientation;
  /** The player's boat; bow up needs it, and the zoom keeps it in place. */
  player?: Readonly<{ pos: Readonly<Vec2>; heading: number }> | null;
  /** The drag's offset of the centre, race units (BigMapState.pan). */
  pan?: Readonly<Vec2> | null;
  padding?: number;
}

/**
 * The map's projection. North up at zoom 1 fits the whole course; zooming in
 * keeps the player's boat at the same place on the map (the centre moves
 * towards the boat by 1 - 1/zoom), so the boat never slides out of view.
 * Bow up turns the world by minus the heading around the boat in the centre,
 * and at zoom 1 the farthest corner of the course is still inside the map at
 * any heading. A drag (pan) moves the centre on top of that. Null for a map
 * too small to draw or broken input.
 */
export function raceMapView(input: MapViewInput): RaceMapView | null {
  const { fit, width, height, padding = 18 } = input;
  if (![width, height, padding, fit.minX, fit.minY, fit.maxX, fit.maxY].every(finite) || width < 64 || height < 64
    || fit.maxX <= fit.minX || fit.maxY <= fit.minY || padding < 0 || padding * 2 >= Math.min(width, height)) return null;
  const zoom = clampMapZoom(input.zoom);
  const player = input.player && finite(input.player.pos.x) && finite(input.player.pos.y) && finite(input.player.heading) ? input.player : null;
  const fitCentre = { x: (fit.minX + fit.maxX) / 2, y: (fit.minY + fit.maxY) / 2 };
  let base: number, centre: Vec2, rotation = 0;
  if (input.orientation === "heading" && player) {
    const reach = Math.max(...[[fit.minX, fit.minY], [fit.maxX, fit.minY], [fit.minX, fit.maxY], [fit.maxX, fit.maxY]]
      .map(([x, y]) => Math.hypot(x - player.pos.x, y - player.pos.y)));
    base = (Math.min(width, height) - padding * 2) / (2 * Math.max(reach, 1e-6));
    centre = { x: player.pos.x, y: player.pos.y };
    rotation = -(((player.heading % 360) + 360) % 360);
  } else {
    base = Math.min((width - padding * 2) / (fit.maxX - fit.minX), (height - padding * 2) / (fit.maxY - fit.minY));
    const pull = player ? 1 - 1 / zoom : 0;
    centre = player ? { x: fitCentre.x + (player.pos.x - fitCentre.x) * pull, y: fitCentre.y + (player.pos.y - fitCentre.y) * pull } : fitCentre;
  }
  const pan = input.pan && finite(input.pan.x) && finite(input.pan.y) && zoom > MAP_ZOOM.min ? input.pan : null;
  if (pan) centre = { x: centre.x + pan.x, y: centre.y + pan.y };
  const scale = base * zoom;
  if (!finite(scale) || scale <= 0) return null;
  const theta = rotation * Math.PI / 180, cos = Math.cos(theta), sin = Math.sin(theta);
  const cx = width / 2, cy = height / 2;
  return Object.freeze({ scale, rotation, centre: Object.freeze(centre), project: (p: Readonly<Vec2>) => {
    const dx = p.x - centre.x, dy = p.y - centre.y;
    return { x: cx + (dx * cos - dy * sin) * scale, y: cy + (dx * sin + dy * cos) * scale };
  } });
}

/**
 * Records the player's track where the race keeps no log (the online race):
 * one point per `interval` seconds of race time, at most `max` points (the
 * oldest go first). A new race (its time going back) starts a new track.
 * Mutates and returns `track`, so a ref can hold it at frame rate.
 */
export function recordTrackPoint(track: { x: number; y: number; t: number }[], point: Readonly<{ x: number; y: number }> | null | undefined,
  time: number, interval = 1, max = 1800): { x: number; y: number; t: number }[] {
  if (!point || !finite(point.x) || !finite(point.y) || !finite(time)) return track;
  const last = track.at(-1);
  if (last && time < last.t) track.length = 0;
  else if (last && time - last.t < interval) return track;
  track.push({ x: point.x, y: point.y, t: time });
  if (track.length > max) track.splice(0, track.length - max);
  return track;
}

/** At most `max` points of a recorded track, evenly spaced, always with the last one. */
export function mapTrackPoints(samples: readonly Readonly<{ x: number; y: number }>[] | null | undefined, max = 400): Vec2[] {
  if (!Array.isArray(samples) || samples.length === 0 || !(max >= 2)) return [];
  const valid = samples.filter(s => s && finite(s.x) && finite(s.y));
  if (valid.length <= max) return valid.map(s => ({ x: s.x, y: s.y }));
  const out: Vec2[] = [], step = (valid.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) { const s = valid[Math.round(i * step)]; out.push({ x: s.x, y: s.y }); }
  return out;
}

/**
 * The arc of a rounding arrow round a mark, in race coordinates (y grows
 * south, as on the map): it starts east of the mark and ends west of it over
 * the north. Rounding to port (the mark on your left) runs anticlockwise as
 * seen from above, to starboard clockwise; the last point is the arrow tip.
 */
export function roundingArc(centre: Readonly<Vec2>, radius: number, side: "port" | "starboard", steps = 12): Vec2[] {
  const out: Vec2[] = [];
  const n = Math.max(2, Math.round(steps));
  for (let i = 0; i <= n; i++) {
    // Port: 0 -> -180 degrees (east, north, west, anticlockwise on the map);
    // starboard: 180 -> 360 (west, north, east, clockwise on the map).
    const a = (side === "port" ? -180 * i / n : 180 + 180 * i / n) * Math.PI / 180;
    out.push({ x: centre.x + Math.cos(a) * radius, y: centre.y + Math.sin(a) * radius });
  }
  return out;
}
