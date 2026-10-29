import { PHYSICAL_RACE_PROFILES, type PhysicalRaceProfile } from "./race-context";
import type { SailingSteering } from "./sailing-kinematics";

/** Opt-in physical trial race (ADR-0014): `/game?race=short|medium|long`.
 * Anything else, repeated or malformed keeps the ordinary legacy race. */
export function readPhysicalTrial(search: string): PhysicalRaceProfile | null {
  let params: URLSearchParams;
  try { params = new URLSearchParams(search); } catch { return null; }
  const values = params.getAll("race");
  if (values.length !== 1) return null;
  return (PHYSICAL_RACE_PROFILES as readonly string[]).includes(values[0]) ? values[0] as PhysicalRaceProfile : null;
}

/** One helm meaning in the physical race: the trainer's shared law. A held
 * rudder (keys or wheel) wins over course assist, as in the legacy cockpit. */
export function physicalTrialSteering(rudder: number, autopilot: boolean, autopilotHeading: number): SailingSteering {
  const r = Number.isFinite(rudder) ? Math.max(-1, Math.min(1, rudder)) : 0;
  if (autopilot && r === 0 && Number.isFinite(autopilotHeading)) return { mode: "course-assist", heading: autopilotHeading };
  return { mode: "helm", rudder: r, lowSpeedAssist: true };
}
