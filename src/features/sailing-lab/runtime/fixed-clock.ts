/** Shared simulation clock. Render rate never changes the integration step. */
export const SAILING_STEP_SECONDS = 1 / 30;
const MAX_FRAME_SECONDS = 2;
const MAX_STEPS_PER_FRAME = 60;

export function createFixedClock() {
  let previousMs: number | null = null;
  let remainder = 0;
  let ticks = 0;
  let armed = false;
  const synchronize = (timestampMs: number, active: boolean) => {
    previousMs = Number.isFinite(timestampMs) ? timestampMs : null;
    remainder = 0;
    armed = active && previousMs !== null;
  };
  return {
    reset() { previousMs = null; remainder = 0; ticks = 0; armed = false; },
    /** Lifecycle boundaries never consume hidden, paused or loading time.
     * Unlike a new-session reset, they preserve the completed tick count. */
    synchronize,
    advance(timestampMs: number, active: boolean, step: (dt: number) => void): number {
      if (!Number.isFinite(timestampMs)) { synchronize(timestampMs, false); return 0; }
      if (!active || !armed) { synchronize(timestampMs, active); return 0; }
      const elapsed = previousMs === null ? 0 : (timestampMs - previousMs) / 1000;
      previousMs = timestampMs;
      // A slow foreground renderer still advances real time at fixed 30 Hz.
      // Giant stalls and clock discontinuities start a fresh frame epoch.
      if (elapsed < 0 || elapsed > MAX_FRAME_SECONDS) { remainder = 0; return 0; }
      remainder += elapsed;
      let count = 0;
      while (count < MAX_STEPS_PER_FRAME && remainder + 1e-9 >= SAILING_STEP_SECONDS) {
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
