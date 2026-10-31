// Where the next mark is when the camera does not show it (M2-2): an arrow
// on the edge of the clear part of the picture, pointing at the mark. Pure
// screen math from a projected point, so it is tested without a renderer.

/** Pixels the HUD keeps at each edge of the scene (status line, corner instruments, notice). */
export interface ScreenInsets { top: number; right: number; bottom: number; left: number }

/** Half the 44 px target of the arrow disc. */
export const EDGE_ARROW_RADIUS = 22;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** The race HUD over the scene: a status line and the corner instruments on
 * top, the coach notice at the bottom. Proportional, so a landscape phone
 * (844x390) keeps a usable band and an upright one (390x844) clears the HUD. */
export function edgeArrowInsets(width: number, height: number, out: ScreenInsets): ScreenInsets {
  out.top = clamp(height * 0.18, 60, 128);
  out.bottom = clamp(height * 0.1, 48, 96);
  out.left = out.right = clamp(width * 0.02, 8, 16);
  return out;
}

export interface EdgeArrow {
  /** False when the mark is in the clear part of the picture. */
  visible: boolean;
  /** Centre of the arrow disc, CSS pixels from the scene's top left. */
  x: number;
  y: number;
  /** Arrow rotation, degrees clockwise from pointing up. */
  angle: number;
}

/**
 * Place the arrow for a point projected by `Vector3.project(camera)`
 * (normalised device coordinates; z > 1 means behind the camera). A point
 * behind the camera is mirrored, so the arrow points the way to turn.
 * Writes into `out`: the frame loop allocates nothing.
 */
export function edgeArrow(ndcX: number, ndcY: number, ndcZ: number, width: number, height: number, insets: ScreenInsets, out: EdgeArrow): EdgeArrow {
  out.visible = false;
  if (![ndcX, ndcY, ndcZ, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return out;
  const behind = ndcZ > 1;
  const x = behind ? -ndcX : ndcX;
  const y = behind ? -ndcY : ndcY;
  const sx = (x + 1) / 2 * width;
  const sy = (1 - y) / 2 * height;
  const left = insets.left, right = width - insets.right, top = insets.top, bottom = height - insets.bottom;
  if (!behind && sx >= left && sx <= right && sy >= top && sy <= bottom) return out;
  // The clear band shrunk by the disc radius: the whole disc stays inside it.
  const minX = left + EDGE_ARROW_RADIUS, maxX = right - EDGE_ARROW_RADIUS;
  const minY = top + EDGE_ARROW_RADIUS, maxY = bottom - EDGE_ARROW_RADIUS;
  // From the middle of the picture (where the boat is) out to the edge of the band.
  const cx = clamp(width / 2, minX, Math.max(minX, maxX)), cy = clamp(height / 2, minY, Math.max(minY, maxY));
  const dx = sx - width / 2;
  let dy = sy - height / 2;
  // Straight behind: point down, the way back past the stern.
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) dy = 1;
  const tx = dx > 1e-9 ? (maxX - cx) / dx : dx < -1e-9 ? (minX - cx) / dx : Infinity;
  const ty = dy > 1e-9 ? (maxY - cy) / dy : dy < -1e-9 ? (minY - cy) / dy : Infinity;
  const t = Math.max(0, Math.min(tx, ty));
  out.visible = true;
  out.x = clamp(cx + dx * t, minX, Math.max(minX, maxX));
  out.y = clamp(cy + dy * t, minY, Math.max(minY, maxY));
  out.angle = Math.atan2(dx, -dy) * 180 / Math.PI;
  return out;
}

/** What the DOM arrow shows now. NaN means "never written". */
export interface EdgeArrowStyle { shown: boolean; x: number; y: number; angle: number }
interface Styled { style: { display: string; transform: string } }

/** Moved by more than half a pixel or degree, or never written (NaN). */
const moved = (prev: number, next: number) => !(Math.abs(next - prev) <= 0.5);

/**
 * Write the arrow into the DOM, touching only what changed since the last
 * frame. `shown` starts as { shown: false, x: NaN, y: NaN, angle: NaN } for
 * an element rendered with display none, so the first show writes the place.
 */
export function applyEdgeArrow(el: Styled, glyph: Styled | null, arrow: EdgeArrow, shown: EdgeArrowStyle): void {
  if (arrow.visible !== shown.shown) { el.style.display = arrow.visible ? "flex" : "none"; shown.shown = arrow.visible; }
  if (!arrow.visible) return;
  if (moved(shown.x, arrow.x) || moved(shown.y, arrow.y)) {
    shown.x = arrow.x; shown.y = arrow.y;
    el.style.transform = `translate(${(arrow.x - EDGE_ARROW_RADIUS).toFixed(1)}px, ${(arrow.y - EDGE_ARROW_RADIUS).toFixed(1)}px)`;
  }
  if (glyph && moved(shown.angle, arrow.angle)) {
    shown.angle = arrow.angle;
    glyph.style.transform = `rotate(${arrow.angle.toFixed(1)}deg)`;
  }
}
