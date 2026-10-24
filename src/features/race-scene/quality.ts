// Adaptive quality for the race scene: the pixel ratio steps down while the
// frame rate is low, never back up in the same race (no oscillation). The
// cheapest lever on a phone: fill rate dominates a full-screen water shader.

export const DPR_STEP = 0.25;
/** Below this average frame rate over a window the scene drops a step. */
export const LOW_FPS = 42;

export function nextDpr(current: number, fps: number, range: { min: number; max: number }): number {
  const clamped = Math.min(range.max, Math.max(range.min, current));
  if (fps < LOW_FPS && clamped > range.min) return Math.max(range.min, Math.round((clamped - DPR_STEP) * 100) / 100);
  return clamped;
}

/** The starting pixel ratio: the device's, capped at 2 (a 3x phone gains little for 2.25x the pixels). */
export function initialDpr(devicePixelRatio: number): number {
  return Math.min(2, Math.max(1, devicePixelRatio || 1));
}
