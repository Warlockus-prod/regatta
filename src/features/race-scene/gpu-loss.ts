import { diagnosticSurface } from "@/lib/diagnostic-destination";
import { recordWebDiagnostic } from "@/lib/diagnostics-web";
import type { RenderBackend } from "@/lib/diagnostics";

// A lost GPU device (WebGPU device.lost) or a lost WebGL context leaves a
// frozen canvas. The race scene remounts its canvas once on WebGL2; a second
// loss shows the scene's existing failure screen. Only a tap on its retry
// button mounts the canvas again, so a broken GPU can never loop.

export interface GpuRecovery {
  /** Identifies the mounted canvas; a loss reported by an older one is ignored. */
  readonly generation: number;
  readonly forceWebGL: boolean;
  readonly failed: boolean;
}

export const INITIAL_GPU_RECOVERY: GpuRecovery = Object.freeze({ generation: 0, forceWebGL: false, failed: false });

/** The next state after the canvas of `generation` lost its device. */
export function afterGpuLoss(state: GpuRecovery, generation: number): GpuRecovery {
  if (generation !== state.generation || state.failed) return state;
  if (!state.forceWebGL) return Object.freeze({ generation: state.generation + 1, forceWebGL: true, failed: false });
  return Object.freeze({ ...state, failed: true });
}

/** The failure screen's retry: a fresh canvas, still on WebGL2. */
export function afterGpuRetry(state: GpuRecovery): GpuRecovery {
  return state.failed ? Object.freeze({ generation: state.generation + 1, forceWebGL: true, failed: false }) : state;
}

/** Fixed identifiers only, never the driver's loss message. */
export function recordGpuEvent(action: "lost" | "retry" | "failed", backend: RenderBackend, attempt?: number): void {
  if (typeof window === "undefined") return;
  try {
    const path = (window as Window & { __REGATTA_EMBED__?: { path?: unknown } }).__REGATTA_EMBED__?.path;
    recordWebDiagnostic({ type: "scene.gpu", surface: diagnosticSurface(typeof path === "string" ? path : window.location.pathname),
      action, backend, outcome: action === "retry" ? "accepted" : "failed", reason: "scene-load", source: "system",
      ...(attempt === undefined ? {} : { attempt }) });
  } catch { /* Diagnostics must not stop the recovery. */ }
}
