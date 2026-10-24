import type { TickDiagnostics } from "@/lib/sailing-physics/types";
import { NO_GO_HALF_DEG } from "@/lib/sailing-physics/constants";
import { clamp } from "./math";

/** Shared vocabulary. UI labels live in SimLabels.coach, in all seven languages. */
export type CoachKey = "inIrons" | "luffMain" | "luffJib" | "luffBoth"
  | "stallMain" | "stallJib" | "stallBoth" | "pinching" | "good" | "reachOn" | "run";
export interface ActiveSails { main: boolean; jib: boolean }
const BOTH: ActiveSails = { main: true, jib: true };

/** Coach hint from the common force diagnostics and signed sail incidence.
 * Deep downwind drag is useful drive, so a stalled flag there is not a trim
 * error. A lowered main or fully rolled jib must never receive sheet advice. */
export function coachFrom(
  twaAbs: number, speedKn: number, diag: TickDiagnostics, quality: number,
  incidence: { main: number; jib: number } = { main: 90, jib: 90 },
  active: ActiveSails = BOTH,
): CoachKey {
  if (twaAbs < NO_GO_HALF_DEG) return speedKn < 1.5 ? "inIrons" : "pinching";
  if (twaAbs < NO_GO_HALF_DEG + 5) return "pinching";
  if (twaAbs >= 150) return "run";
  const attached = twaAbs <= 135;
  const mainLuff = active.main && attached && (incidence.main < 1 || diag.mainAoA < 7);
  const jibLuff = active.jib && attached && (incidence.jib < 1 || diag.jibAoA < 7);
  if (attached && ((active.main && incidence.main < 1) || (active.jib && incidence.jib < 1))) {
    return mainLuff && jibLuff ? "luffBoth" : mainLuff ? "luffMain" : "luffJib";
  }
  const mainStall = active.main && attached && diag.mainStalled;
  const jibStall = active.jib && attached && diag.jibStalled;
  if (mainStall || jibStall) return mainStall && jibStall ? "stallBoth" : mainStall ? "stallMain" : "stallJib";
  if (mainLuff || jibLuff) return mainLuff && jibLuff ? "luffBoth" : mainLuff ? "luffMain" : "luffJib";
  return quality >= 0.68 ? "good" : "reachOn";
}

/** Quality of the sails that are actually set, independent of their area.
 * Attached-flow scoring uses AoA and slot health. In downwind drag mode a
 * full, well-eased sail is good trim even when the force model flags stall. */
export function trimQualityFrom(twaAbs: number, diag: TickDiagnostics, active: ActiveSails = BOTH): number {
  const mainWeight = active.main ? 0.6 : 0;
  const jibWeight = active.jib ? 0.4 : 0;
  const total = mainWeight + jibWeight;
  if (total === 0) return 0;
  if (twaAbs > 135) {
    return clamp((mainWeight * Math.sin(diag.mainAoA * Math.PI / 180) ** 2 + jibWeight * Math.sin(diag.jibAoA * Math.PI / 180) ** 2) / total, 0, 1);
  }
  const q = (aoa: number, stalled: boolean) => stalled ? 0.15 : clamp(1 - Math.abs(aoa - 16) / 14, 0, 1);
  const base = (mainWeight * q(diag.mainAoA, diag.mainStalled) + jibWeight * q(diag.jibAoA, diag.jibStalled)) / total;
  return clamp(base * (active.main && active.jib ? 0.7 + 0.3 * diag.slotHealth : 1), 0, 1);
}
