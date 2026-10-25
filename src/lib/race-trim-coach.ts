import { getBoatParams } from "./sailing-physics/boat";
import { tick } from "./sailing-physics/simulate";
import { twaFromCompass } from "./sailing-physics/wind";
import { jibAreaFraction } from "./sailing-physics/sail-plan";
import { signedSailIncidence } from "@/features/sailing-lab/rig/response";
import { coachFrom, trimQualityFrom, type CoachKey } from "@/features/sailing-lab/runtime/trim-coach";
import type { RaceBoat } from "./race-physics";

const PARAMS = getBoatParams();

/** Live Pro advice from the same diagnostics, incidence and coach as the
 * trainer. A zero-duration tick reads forces without advancing race state.
 * Call at HUD cadence; no solver, rendering or simulation loop lives here. */
export function raceTrimCoach(boat: RaceBoat): CoachKey | null {
  const physics = boat.physics;
  const trim = boat.trim;
  if (!physics || !trim) return null;
  const values = [boat.heading, boat.speed, physics.trueWindDir, physics.trueWindSpeed, physics.heel, physics.leeway,
    trim.mainSheet, trim.jibSheet, trim.mainTwist, trim.jibTwist, trim.reef, trim.jibFurl];
  if (!values.every(Number.isFinite)) return null;
  const active = { main: trim.mainHoisted !== false, jib: jibAreaFraction(trim.jibFurl) > 0 };
  if (!active.main && !active.jib) return null;
  const state = { ...physics, heading: boat.heading, boatSpeed: Math.max(0, boat.speed) };
  const { diag } = tick(state, trim, PARAMS, 0);
  const twa = Math.abs(twaFromCompass(state.trueWindDir, state.heading));
  const incidence = {
    main: signedSailIncidence(diag.awa, PARAMS.mainMaxOff * (1 - trim.mainSheet), trim.mainTwist),
    jib: signedSailIncidence(diag.awa, PARAMS.jibMinOff + (PARAMS.jibMaxOff - PARAMS.jibMinOff) * (1 - trim.jibSheet), trim.jibTwist),
  };
  return coachFrom(twa, state.boatSpeed, diag, trimQualityFrom(twa, diag, active), incidence, active);
}
