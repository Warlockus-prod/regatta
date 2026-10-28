import { diagnosticSurface } from "@/lib/diagnostic-destination";
import { recordWebDiagnostic } from "@/lib/diagnostics-web";
import type { DiagnosticInput } from "@/lib/diagnostics";

type Embedded = Extract<DiagnosticInput, { type: "embedded.lifecycle" }>;

/** Fixed stage identifiers and a binary viewport state, never a URL, device
 * geometry, exception message or model contents. Observation cannot own startup. */
export function recordSceneLifecycle(stage: NonNullable<Embedded["stage"]>,
  action: "begin" | "ready" | "waiting" | "error", viewport?: Embedded["viewport"]): void {
  if (typeof window === "undefined") return;
  try {
    const path = (window as Window & { __REGATTA_EMBED__?: { path?: unknown } }).__REGATTA_EMBED__?.path;
    recordWebDiagnostic({ type: "embedded.lifecycle", surface: diagnosticSurface(typeof path === "string" ? path : window.location.pathname),
      stage, action, outcome: action === "error" ? "failed" : action === "waiting" ? "noop" : "accepted",
      ...(viewport === undefined ? {} : { viewport }), ...(action === "error" ? { reason: "scene-load" as const } : {}), source: "system" });
  } catch { /* Diagnostics must not stop rendering or navigation. */ }
}
