import { sectionTwistDegrees } from "@/lib/sailing-physics/forces";
import { clamp } from "../physics/sailModel";

export type SailStatus = "calm" | "inIrons" | "luffing" | "stalled" | "drawing";

/** Bounded visual cloth response, not a membrane/CFD solver. Pressure fills
 * the cut shape; trim controls attachment. A stalled sail can still be full. */
export function sailResponse(awsKn: number, aoa: number, stalled: boolean, downwind: boolean, inIrons: boolean) {
  const air = Math.max(0, Number.isFinite(awsKn) ? awsKn : 0);
  const q = 0.5 * 1.225 * (air * 0.514444) ** 2;
  const pressure = 1 - Math.exp(-q / 9);
  const attached = inIrons ? 0 : clamp((aoa - 1) / 7, 0, 1);
  const fill = attached * pressure;
  const luff = (1 - attached) * pressure;
  const status: SailStatus = air < 2 ? "calm" : inIrons ? "inIrons" : attached < 0.45 ? "luffing" : stalled && !downwind ? "stalled" : "drawing";
  return { fill, luff, airSpeed: air, status };
}


/** Retain the sign lost in the engine's absolute angle-of-attack diagnostic.
 * An over-eased flexible sail unloads instead of looking like a drawing sail. */
export function signedSailIncidence(awa: number, angleOff: number, twist: number) {
  let incidence = 0;
  for (let i = 0; i < 5; i++) {
    const height = (i + .5) / 5;
    incidence += (Math.abs(awa) - angleOff - sectionTwistDegrees(twist, height)) * 2 * (1 - height) / 5;
  }
  return incidence;
}
