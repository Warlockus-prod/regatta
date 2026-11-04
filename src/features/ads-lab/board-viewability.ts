// Is the in-game board really seen? Pure maths for the IAB/MRC Intrinsic In-Game
// Measurement Guidelines (August 2022): the visible part covers at least 1.5% of
// the screen (occlusion counts), the angle to the screen is at most 55 degrees per
// axis, and a display ad needs five positive samples in a row, 200 ms apart.

export const BOARD_MIN_SCREEN_SHARE = 0.015;
export const BOARD_MAX_ANGLE_DEG = 55;
export const BOARD_SAMPLE_MS = 200;
export const BOARD_VIEW_SAMPLES = 5;
/** A longer pause between samples (hidden page, stalled frames) breaks the run. */
export const BOARD_MAX_GAP_MS = 400;

export type Vec3 = readonly [number, number, number];
export type Vec4 = readonly [number, number, number, number];
export type BoardBlock = "image" | "hidden" | "back" | "frame" | "angle" | "small" | "occluded";

export interface BoardSampleInput {
  /** The four corners in clip space (projection times view), in order round the board. */
  corners: readonly Vec4[];
  /** In view space: the board's centre, its front normal and its width direction. */
  center: Vec3;
  normal: Vec3;
  right: Vec3;
  /** Canvas area divided by screen area. */
  canvasShare: number;
  /** Share of the on-screen board hidden by something nearer, 0..1. */
  occluded: number;
  imageReady: boolean;
  pageVisible: boolean;
}

export interface BoardSample {
  viewable: boolean;
  block: BoardBlock | null;
  /** Share of the screen covered by the on-screen part, before occlusion. */
  screenShare: number;
  /** The same after occlusion: this is the figure the 1.5% applies to. */
  visibleShare: number;
  /** The largest of the three axis angles, degrees. */
  angleDeg: number;
  occluded: number;
}

const NEAR_W = 1e-4;
type Plane = (p: Vec4) => number;
const CLIP_PLANES: readonly Plane[] = [
  p => p[3] - NEAR_W, p => p[0] + p[3], p => p[3] - p[0], p => p[1] + p[3], p => p[3] - p[1],
];

/** Sutherland-Hodgman in clip space, so a corner behind the camera is cut, never mirrored. */
function clipPolygon(corners: readonly Vec4[]): Vec4[] {
  let polygon = [...corners];
  for (const plane of CLIP_PLANES) {
    const out: Vec4[] = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length];
      const da = plane(a), db = plane(b);
      if (da >= 0) out.push(a);
      if (da >= 0 !== db >= 0) {
        const t = da / (da - db);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t]);
      }
    }
    polygon = out;
    if (!polygon.length) return [];
  }
  return polygon;
}

/** Share of the canvas the projected board covers, 0..1. */
export function frameShare(corners: readonly Vec4[]): number {
  const ndc = clipPolygon(corners).map(p => [p[0] / p[3], p[1] / p[3]] as const);
  let doubled = 0;
  for (let i = 0; i < ndc.length; i++) {
    const a = ndc[i], b = ndc[(i + 1) % ndc.length];
    doubled += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(doubled) / 2 / 4;
}

const DEG = 180 / Math.PI;
const axisAngle = (off: number, along: number) => Math.atan2(Math.abs(off), Math.abs(along)) * DEG;

export function boardSample(input: BoardSampleInput): BoardSample {
  const { center, normal, right } = input;
  const screenShare = frameShare(input.corners) * Math.min(1, Math.max(0, input.canvasShare));
  const occluded = Math.min(1, Math.max(0, input.occluded));
  const visibleShare = screenShare * (1 - occluded);
  const angleDeg = Math.max(axisAngle(normal[0], normal[2]), axisAngle(normal[1], normal[2]), axisAngle(right[1], right[0]));
  const facing = -(center[0] * normal[0] + center[1] * normal[1] + center[2] * normal[2]) > 0;
  const block: BoardBlock | null = !input.imageReady ? "image"
    : !input.pageVisible ? "hidden"
    : !facing ? "back"
    : screenShare <= 0 ? "frame"
    : angleDeg > BOARD_MAX_ANGLE_DEG ? "angle"
    : screenShare < BOARD_MIN_SCREEN_SHARE ? "small"
    : visibleShare < BOARD_MIN_SCREEN_SHARE ? "occluded"
    : null;
  return { viewable: block === null, block, screenShare, visibleShare, angleDeg, occluded };
}

export interface BoardRun { readonly streak: number; readonly lastAt: number | null; readonly counted: boolean }
export const BOARD_RUN_START: BoardRun = { streak: 0, lastAt: null, counted: false };

/** One creative counts once: `counted` turns true on the fifth positive sample in a row and stays. */
export function observeBoard(run: BoardRun, viewable: boolean, now: number): BoardRun {
  const broken = run.lastAt !== null && now - run.lastAt > BOARD_MAX_GAP_MS;
  const streak = viewable ? (broken ? 0 : run.streak) + 1 : 0;
  return { streak, lastAt: now, counted: run.counted || streak >= BOARD_VIEW_SAMPLES };
}

/** The board's width and height in metres for a creative's shape at a given face area. */
export function boardSize(aspect: number, area: number): { width: number; height: number } {
  const shape = Number.isFinite(aspect) && aspect > 0 ? aspect : 2;
  const width = Math.sqrt(area * shape);
  return { width, height: width / shape };
}
