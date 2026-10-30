import { PERF_LIMITS, type DiagnosticInput, type RenderBackend } from "@/lib/diagnostics";

// The on-device performance journal of the race scene (M0-9). One meter per
// mounted canvas counts only frames that render while the race runs and the
// page is visible, in a fixed histogram: a frame allocates nothing, a summary
// is built at most once a minute and when the scene unmounts.

/** Minimum time between two periodic samples. */
export const PERF_SAMPLE_MS = 60_000;
/** A longer gap is a suspended page or a frozen tab, not a slow frame. */
export const PERF_MAX_FRAME_MS = 2_000;
/** Fewer measured frames than this tell nothing and are not journalled. */
export const PERF_MIN_FRAMES = 30;

export type RacePerf = Extract<DiagnosticInput, { type: "race.perf" }>;

export interface PerfMeter {
  /** Once per rendered frame. Inactive frames break the interval and are not counted. */
  frame(nowMs: number, active: boolean, drawCalls: number, triangles: number): void;
  /** Racing frames counted so far. */
  readonly frames: number;
  /** Whole-session summary, or null while too few frames were measured. */
  summary(): { fpsAvg: number; fpsP5: number; seconds: number; drawCalls: number; triangles: number } | null;
}

export function createPerfMeter(): PerfMeter {
  const histogram = new Uint32Array(PERF_LIMITS.fps + 1);
  let last = -1, frames = 0, activeMs = 0, drawSum = 0, triangleSum = 0;
  return {
    frame(nowMs, active, drawCalls, triangles) {
      if (!active || !Number.isFinite(nowMs)) { last = -1; return; }
      const dt = nowMs - last;
      const measured = last >= 0 && dt > 0 && dt <= PERF_MAX_FRAME_MS;
      last = nowMs;
      if (!measured) return;
      histogram[Math.min(PERF_LIMITS.fps, Math.round(1000 / dt))]++;
      frames++;
      activeMs += dt;
      if (Number.isFinite(drawCalls) && drawCalls > 0) drawSum += drawCalls;
      if (Number.isFinite(triangles) && triangles > 0) triangleSum += triangles;
    },
    get frames() { return frames; },
    summary() {
      if (frames < PERF_MIN_FRAMES || activeMs <= 0) return null;
      // The slowest 5% of frames: the frame rate at which their share is reached.
      const slowest = Math.ceil(frames * 0.05);
      let seen = 0, fpsP5 = 0;
      for (let fps = 0; fps < histogram.length; fps++) {
        seen += histogram[fps];
        if (seen >= slowest) { fpsP5 = fps; break; }
      }
      return {
        fpsAvg: Math.min(PERF_LIMITS.fps, Math.round(frames / (activeMs / 1000) * 10) / 10),
        fpsP5,
        seconds: Math.min(PERF_LIMITS.seconds, Math.round(activeMs / 100) / 10),
        drawCalls: Math.min(PERF_LIMITS.drawCalls, Math.round(drawSum / frames)),
        triangles: Math.min(PERF_LIMITS.triangles, Math.round(triangleSum / frames)),
      };
    },
  };
}

/** A bounded journal event, or null when the session measured too little. */
export function perfEvent(meter: PerfMeter, action: RacePerf["action"], backend: RenderBackend, dpr: number, firstFrameMs: number | null): RacePerf | null {
  const summary = meter.summary();
  if (!summary) return null;
  const event: RacePerf = { type: "race.perf", surface: "race", outcome: "accepted", source: "system", action, backend,
    fpsAvg: summary.fpsAvg, fpsP5: summary.fpsP5, dpr: Math.min(PERF_LIMITS.dpr, Math.max(0.25, Math.round((Number.isFinite(dpr) ? dpr : 1) * 100) / 100)),
    drawCalls: summary.drawCalls, seconds: summary.seconds };
  if (summary.triangles > 0) event.triangles = summary.triangles;
  if (firstFrameMs !== null && Number.isFinite(firstFrameMs) && firstFrameMs >= 0) event.firstFrameMs = Math.min(PERF_LIMITS.firstFrameMs, Math.round(firstFrameMs));
  return event;
}

/** The race is running while its player's state still changes: a paused or
 * finished race leaves the shared refs exactly as they were. */
export const PERF_STILL_MS = 500;
export function createProgressWatch() {
  let x = NaN, y = NaN, heading = NaN, changedAt = -Infinity;
  return (nowMs: number, player: { pos: { x: number; y: number }; heading: number } | undefined): boolean => {
    if (!player) return false;
    const first = Number.isNaN(x);
    if (player.pos.x !== x || player.pos.y !== y || player.heading !== heading) {
      x = player.pos.x; y = player.pos.y; heading = player.heading;
      // The first reading is a position, not a movement.
      if (!first) changedAt = nowMs;
    }
    return nowMs - changedAt < PERF_STILL_MS;
  };
}
