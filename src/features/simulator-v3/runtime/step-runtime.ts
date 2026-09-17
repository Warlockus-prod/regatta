import type { BoatParams, Controls } from "@/lib/sailing-physics";
import { stepSailingSession } from "../../sailing-lab/runtime/session";
import { SAILING_STEP_SECONDS } from "../../sailing-lab/runtime/fixed-clock";
import type { WindMode } from "./wind-dynamics";
import type { RuntimeState } from "./runtime-types";
import type { MainTrimCommand } from "../../sailing-lab/rig/main-trim";

export { approachHeading } from "../../sailing-lab/runtime/math";
export { interpolateControls } from "../../sailing-lab/runtime/controls";

/** Compatibility adapter: Trainer course intent, not a second boat model. */
export function stepRuntime(prev: RuntimeState, target: Controls, targetHeading: number,
  params: BoatParams, dt: number, windMode: WindMode = "steady", mainTrim?: MainTrimCommand): RuntimeState {
  if (Math.abs(dt - SAILING_STEP_SECONDS) > 1e-9 || !Number.isFinite(dt)) {
    throw new RangeError("Sailing sessions require a fixed 30 Hz step");
  }
  const next = stepSailingSession(prev, {
    controls: target,
    mainTrim,
    steering: { mode: "course-assist", heading: targetHeading },
    wind: { speed: prev.wind.baseTws, direction: prev.wind.baseDir, mode: windMode },
  }, params);
  return { ...next, targetHeading };
}
