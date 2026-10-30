import { addAfterEffect } from "@react-three/fiber";
import { flushWebDiagnostics, recordWebDiagnostic } from "@/lib/diagnostics-web";
import type { RenderBackend } from "@/lib/diagnostics";
import { PERF_SAMPLE_MS, createPerfMeter, createProgressWatch, perfEvent } from "./perf";

// Wires the performance meter (perf.ts) to a mounted race canvas: one
// `race.perf` event at most once a minute while racing, one when the page is
// sent to the background and one when the canvas unmounts.

type RendererInfo = { autoReset: boolean; reset(): void; render: { drawCalls: number; triangles: number } };

export interface PerfJournalSource {
  readonly backend: RenderBackend;
  /** The player's boat now, or undefined before the fleet exists. */
  player(): { pos: { x: number; y: number }; heading: number } | undefined;
  /** False outside the running race clock. */
  racing(): boolean;
  /** Scene mount to the first frame with the yacht, once known. */
  firstFrameMs(): number | null;
}

/** Starts the journal of one canvas; the returned stop records its final event.
 * Counters are read after the frame was submitted, then reset, so a frame
 * allocates nothing and draw calls are exactly one frame's. */
export function startPerfJournal(gl: unknown, source: PerfJournalSource): () => void {
  const renderer = gl as { info?: RendererInfo; getPixelRatio?: () => number };
  const info = renderer.info;
  if (info) info.autoReset = false;
  const meter = createPerfMeter();
  const progress = createProgressWatch();
  let nextSample = -1, emittedFrames = 0;
  const emit = (action: "sample" | "final") => {
    if (action === "sample" && meter.frames === emittedFrames) return;
    try {
      const event = perfEvent(meter, action, source.backend, renderer.getPixelRatio?.() ?? 1, source.firstFrameMs());
      if (event) { emittedFrames = meter.frames; recordWebDiagnostic(event); }
    } catch { /* The journal cannot stop the race. */ }
  };
  const stop = addAfterEffect((timestamp) => {
    const drawCalls = info ? info.render.drawCalls : 0;
    const triangles = info ? info.render.triangles : 0;
    info?.reset();
    const active = source.racing() && document.visibilityState !== "hidden" && progress(timestamp, source.player());
    meter.frame(timestamp, active, drawCalls, triangles);
    if (!active) return;
    if (nextSample < 0) nextSample = timestamp + PERF_SAMPLE_MS;
    else if (timestamp >= nextSample) { nextSample = timestamp + PERF_SAMPLE_MS; emit("sample"); }
  });
  const visibility = () => {
    // No frames render while the page is hidden: the gap until the next one is not a frame.
    meter.frame(NaN, false, 0, 0);
    // A page sent to the background may never unmount the scene: keep what was measured.
    if (document.visibilityState === "hidden") { emit("sample"); flushWebDiagnostics(); }
  };
  document.addEventListener("visibilitychange", visibility);
  return () => {
    stop();
    document.removeEventListener("visibilitychange", visibility);
    emit("final");
    if (info) info.autoReset = true;
  };
}
