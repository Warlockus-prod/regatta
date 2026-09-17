/** Shared simulation clock. Render rate never changes the integration step. */
export const SAILING_STEP_SECONDS = 1 / 30;
const MAX_FRAME_SECONDS = 0.25;

export function createFixedClock() {
  let previousMs: number | null = null;
  let remainder = 0;
  let ticks = 0;
  return {
    reset() { previousMs = null; remainder = 0; ticks = 0; },
    advance(timestampMs: number, active: boolean, step: (dt: number) => void): number {
      if (!Number.isFinite(timestampMs)) return 0;
      const elapsed = previousMs === null ? 0 : (timestampMs - previousMs) / 1000;
      previousMs = timestampMs;
      // Backgrounding, paused lessons and clock discontinuities do not fast-forward.
      if (!active || elapsed < 0 || elapsed > MAX_FRAME_SECONDS) { remainder = 0; return 0; }
      remainder += elapsed;
      let count = 0;
      while (remainder + 1e-9 >= SAILING_STEP_SECONDS) {
        step(SAILING_STEP_SECONDS);
        remainder = Math.max(0, remainder - SAILING_STEP_SECONDS);
        ticks += 1;
        count += 1;
      }
      return count;
    },
    get ticks() { return ticks; },
    get alpha() { return remainder / SAILING_STEP_SECONDS; },
  };
}
