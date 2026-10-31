// Adaptive quality for the race scene (M2-5). Two levers, chosen from the
// measured frame time and remembered on the device:
// - the pixel ratio, the cheapest lever on a phone (fill rate dominates a
//   full-screen water shader);
// - a scene profile: water grid density, water noise, clouds, the share of
//   shore trees and the size below which a rival is drawn as a far boat.
// One ladder orders both from the best picture to the cheapest. Within a race
// the scene only steps down while the frame rate is low (no oscillation); a
// race that ran smoothly from start to end lets the next race try one step up.

export const DPR_STEP = 0.25;
/** Below this average frame rate over a window the scene drops a step. */
export const LOW_FPS = 42;
/** A window at or above this frame rate counts as smooth. */
export const GOOD_FPS = 55;
/** Smooth windows (2 s each) without a slow one before the next race tries one step up. */
export const PROBE_UP_WINDOWS = 30;
/** Length of one measuring window, seconds. */
export const QUALITY_WINDOW_S = 2;

export function nextDpr(current: number, fps: number, range: { min: number; max: number }): number {
  const clamped = Math.min(range.max, Math.max(range.min, current));
  if (fps < LOW_FPS && clamped > range.min) return Math.max(range.min, Math.round((clamped - DPR_STEP) * 100) / 100);
  return clamped;
}

/** The starting pixel ratio: the device's, capped at 2 (a 3x phone gains little for 2.25x the pixels). */
export function initialDpr(devicePixelRatio: number): number {
  return Math.min(2, Math.max(1, devicePixelRatio || 1));
}

export type QualityId = "high" | "medium" | "low";

export interface SceneQuality {
  id: QualityId;
  /** Segments per side of the water grid (dense round the hull, sparse towards the fog). */
  waterSegments: number;
  /** Wind streaks and ripples in the water shader. */
  waterDetail: boolean;
  /** The fractal cloud layer of the sky dome. */
  clouds: boolean;
  /** Share of the shore trees drawn, a fixed subset (0..1). */
  treeShare: number;
  /** A rival or the ghost whose hull is shorter than this on screen (CSS px) is drawn as the simple far boat. */
  rivalFarPx: number;
}

/** "high" is the picture the scene had before profiles existed. */
export const QUALITY_PROFILES: Readonly<Record<QualityId, SceneQuality>> = {
  high: { id: "high", waterSegments: 200, waterDetail: true, clouds: true, treeShare: 1, rivalFarPx: 36 },
  medium: { id: "medium", waterSegments: 150, waterDetail: true, clouds: true, treeShare: 0.6, rivalFarPx: 60 },
  low: { id: "low", waterSegments: 110, waterDetail: false, clouds: false, treeShare: 0.35, rivalFarPx: 96 },
};

export interface QualityStep { quality: QualityId; dpr: number }

/** Best picture first. The pixel ratio goes first down to 1.5, the profile after it. */
export const QUALITY_LADDER: readonly QualityStep[] = [
  { quality: "high", dpr: 2 },
  { quality: "high", dpr: 1.75 },
  { quality: "high", dpr: 1.5 },
  { quality: "medium", dpr: 1.5 },
  { quality: "medium", dpr: 1.25 },
  { quality: "low", dpr: 1.25 },
  { quality: "low", dpr: 1 },
];

/** What a ladder step draws on this device: its pixel ratio never above the device's (`cap`), never below 1. */
export function qualityAt(index: number, cap: number): { profile: SceneQuality; dpr: number } {
  const step = QUALITY_LADDER[Math.min(QUALITY_LADDER.length - 1, Math.max(0, Math.round(index) || 0))];
  return { profile: QUALITY_PROFILES[step.quality], dpr: Math.max(1, Math.min(step.dpr, cap)) };
}

function sameDrawing(a: number, b: number, cap: number): boolean {
  const x = qualityAt(a, cap), y = qualityAt(b, cap);
  return x.profile.id === y.profile.id && x.dpr === y.dpr;
}

/** The next cheaper step that draws differently on this device, or the same index at the bottom. */
export function stepDown(index: number, cap: number): number {
  for (let next = index + 1; next < QUALITY_LADDER.length; next++) if (!sameDrawing(next, index, cap)) return next;
  return index;
}

/** The next better step that draws differently on this device, or the same index at the top. */
export function stepUp(index: number, cap: number): number {
  for (let next = index - 1; next >= 0; next--) if (!sameDrawing(next, index, cap)) {
    // Land on the cheapest index of that drawing, so one more step down is one visible change.
    let land = next;
    while (land + 1 < index && sameDrawing(land + 1, next, cap)) land++;
    return land;
  }
  return index;
}

/** The step a device starts the race at: the first that draws like the remembered one on it. */
export function settle(index: number, cap: number): number {
  for (let i = 0; i < QUALITY_LADDER.length; i++) if (sameDrawing(i, index, cap)) return i;
  return 0;
}

/** Device memory of the reached step. The iOS app carries it across launches
 * only when the key is in RACE_WEB_STORAGE_KEYS (mobile/src/persistence/race-web-storage.ts). */
export const QUALITY_STORAGE_KEY = "regatta.race.quality.v1";

export function parseQualityStep(raw: string | null | undefined): number | null {
  if (typeof raw !== "string" || raw.length > 200) return null;
  try {
    const value = JSON.parse(raw) as Partial<QualityStep> | null;
    if (!value || typeof value !== "object") return null;
    const index = QUALITY_LADDER.findIndex((step) => step.quality === value.quality && step.dpr === value.dpr);
    return index >= 0 ? index : null;
  } catch {
    return null;
  }
}

export function serializeQualityStep(index: number): string {
  const step = QUALITY_LADDER[Math.min(QUALITY_LADDER.length - 1, Math.max(0, Math.round(index) || 0))];
  return JSON.stringify({ quality: step.quality, dpr: step.dpr });
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;
function storage(): StorageLike | null {
  try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; }
}

/** The remembered step, 0 (best) when nothing valid is stored or storage is blocked. */
export function loadQualityStep(store: StorageLike | null = storage()): number {
  try { return parseQualityStep(store?.getItem(QUALITY_STORAGE_KEY)) ?? 0; } catch { return 0; }
}

export function saveQualityStep(index: number, store: StorageLike | null = storage()): void {
  try { store?.setItem(QUALITY_STORAGE_KEY, serializeQualityStep(index)); } catch { /* Private mode or quota: the next race measures again. */ }
}

export interface QualityGovernor {
  /** The ladder step drawn now. */
  readonly index: number;
  /** Once per loop frame. `counted` false (paused, hidden, warming up) discards the window. Returns the new step when it changed. */
  frame(seconds: number, counted: boolean): number | null;
  /** The window rate last measured, or null before the first full window. */
  readonly fps: number | null;
  /** Full windows measured so far. */
  readonly windows: number;
  /** The step the next race on this device should start at. */
  remembered(): number;
}

/** Frame-time governor. The first counted window includes shader compiles: it is reported, never acted on. */
export function createQualityGovernor(start: number, cap: number): QualityGovernor {
  let index = settle(start, cap);
  let windowStart = -1, frames = 0, windows = 0, smooth = 0, slow = 0;
  let fps: number | null = null;
  return {
    get index() { return index; },
    get fps() { return fps; },
    get windows() { return windows; },
    frame(seconds, counted) {
      if (!counted || !Number.isFinite(seconds) || seconds < windowStart) { windowStart = -1; return null; }
      if (windowStart < 0) { windowStart = seconds; frames = 0; return null; }
      frames++;
      const span = seconds - windowStart;
      if (span < QUALITY_WINDOW_S) return null;
      fps = frames / span;
      windowStart = seconds; frames = 0; windows++;
      if (windows === 1) return null;
      if (fps < LOW_FPS) {
        slow++;
        const next = stepDown(index, cap);
        if (next !== index) { index = next; return index; }
      } else if (fps >= GOOD_FPS) smooth++;
      return null;
    },
    remembered() {
      return slow === 0 && smooth >= PROBE_UP_WINDOWS ? stepUp(index, cap) : index;
    },
  };
}

// ---------------------------------------------------------------------------
// Render rate while the race is held (M2-5): the loop keeps running, so the
// clock, the camera and the controls behave as before, but the GPU draws a
// held scene a few times a second, and at once whenever the view changes.
// ---------------------------------------------------------------------------

/** Frames a second drawn while the race is held. */
export const IDLE_FPS = 8;
/** The fleet counts as held after its positions have not changed this long. */
export const HELD_AFTER_MS = 500;

export interface RenderGate {
  /** Shaders are compiling behind the loading screen: draw nothing yet. */
  warming: boolean;
  /** True when this loop frame should be drawn. */
  shouldRender(nowMs: number, held: boolean, viewChanged: boolean): boolean;
}

export function createRenderGate(idleFps = IDLE_FPS): RenderGate {
  const interval = 1000 / Math.max(1, idleFps);
  let last = -Infinity;
  const gate: RenderGate = {
    warming: false,
    shouldRender(nowMs, held, viewChanged) {
      if (gate.warming) return false;
      if (!held || viewChanged || nowMs - last >= interval || nowMs < last) { last = nowMs; return true; }
      return false;
    },
  };
  return gate;
}

/** True once no boat of the fleet has moved or turned for HELD_AFTER_MS. The
 * first reading starts the count, so a fleet that has just appeared is not held. */
export function createFleetHeldWatch(heldAfterMs = HELD_AFTER_MS) {
  let signature = NaN, changedAt = NaN, size = -1;
  return (nowMs: number, boats: readonly { pos: { x: number; y: number }; heading: number }[]): boolean => {
    let sum = boats.length;
    for (let i = 0; i < boats.length; i++) {
      const b = boats[i];
      // Weighted by place so two boats swapping values still change the sum.
      sum += (b.pos.x * 1.37 + b.pos.y * 2.11 + b.heading * 0.53) * (i + 1);
    }
    if (Number.isNaN(changedAt) || sum !== signature || boats.length !== size) {
      signature = sum; size = boats.length; changedAt = nowMs;
    }
    return nowMs - changedAt >= heldAfterMs;
  };
}

/** True when any of the values (camera pose, projection, canvas size, pixel ratio) differs from the last call. */
export function createViewWatch(length: number) {
  const last = new Float64Array(length).fill(NaN);
  return (values: ArrayLike<number>): boolean => {
    let changed = false;
    for (let i = 0; i < length; i++) {
      const v = values[i];
      if (!(Math.abs(v - last[i]) <= 1e-6)) { changed = true; last[i] = v; }
    }
    return changed;
  };
}

/** Length of the view signature RaceScene passes to a scene draw: camera position (3),
 * quaternion (4), two projection terms, canvas width and height, pixel ratio. */
export const VIEW_SIGNATURE_LENGTH = 12;

/**
 * One loop frame's draw decision for RaceScene's GatedRender: the race is held
 * when its clock is stopped (`racing` false), the first frame has been shown
 * and the whole fleet has been still for HELD_AFTER_MS; a held race is drawn
 * at the gate's idle rate, at once when the view changes. `held` is what the
 * last frame decided (the frame-time governor skips held frames). No allocation.
 */
export function createSceneDraw(heldAfterMs = HELD_AFTER_MS) {
  const fleetHeld = createFleetHeldWatch(heldAfterMs);
  const viewChanged = createViewWatch(VIEW_SIGNATURE_LENGTH);
  const draw = {
    held: false,
    frame(gate: RenderGate, nowMs: number, racing: boolean, shown: boolean,
      boats: readonly { pos: { x: number; y: number }; heading: number }[], view: ArrayLike<number>): boolean {
      const still = fleetHeld(nowMs, boats);
      draw.held = !racing && shown && still;
      return gate.shouldRender(nowMs, draw.held, viewChanged(view));
    },
  };
  return draw;
}

/** Hull length of the race yacht in metres (the GLB is 13.9 m overall). */
export const HULL_LENGTH_M = 13.9;

/** How long a hull of HULL_LENGTH_M at `distance` metres looks on screen, CSS px. */
export function hullScreenPx(distance: number, fovDeg: number, viewportHeightPx: number): number {
  if (!(distance > 0)) return Infinity;
  const span = 2 * distance * Math.tan(((fovDeg || 50) * Math.PI) / 360);
  return (HULL_LENGTH_M / span) * viewportHeightPx;
}

/** Far-boat switch with a 20% band, so a boat on the edge does not flicker. */
export function rivalIsFar(wasFar: boolean, screenPx: number, farPx: number): boolean {
  return wasFar ? screenPx < farPx * 1.2 : screenPx < farPx;
}
