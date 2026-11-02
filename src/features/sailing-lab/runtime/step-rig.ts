import { apparentWind, tick, twaFromCompass, NO_GO_HALF_DEG,
  type BoatState, type Controls, type BoatParams, type ResolvedRig } from "@/lib/sailing-physics";
import type { TickMotion } from "@/lib/sailing-physics/types";
import { advanceRig, initialRig, rigSide, transferLoad, type RigMotion } from "../rig/transfer";
import { sailResponse, signedSailIncidence } from "../rig/response";
import { createMainTrim, stepMainTrim, type MainTrimCommand, type MainTrimState } from "../rig/main-trim";

/** One shared source for the visible rig and the force calculation. */
export function stepWithRig(state: BoatState, controls: Controls, params: BoatParams, previous: RigMotion | null, dt: number,
  trim?: { command: MainTrimCommand; state: MainTrimState | null }, boatMotion?: TickMotion) {
  const twa = twaFromCompass(state.trueWindDir, state.heading);
  const aw = apparentWind(state.trueWindSpeed, twa, state.boatSpeed, state.leeway);
  const input = { awa: aw.awa, aws: aw.aws,
    mainLimit: params.mainMaxOff * (1 - controls.mainSheet),
    jibLimit: params.jibMinOff + (params.jibMaxOff - params.jibMinOff) * (1 - controls.jibSheet) };
  const motion = advanceRig(previous ?? initialRig(input), input, dt);
  const mainTrim = trim ? stepMainTrim(trim.state ?? createMainTrim({ yaw: motion.main, rise: 0 }, trim.command), trim.command, state, controls, params, dt) : undefined;
  if (mainTrim) {
    motion.main = mainTrim.pose.yaw;
    controls = { ...controls, mainTwist: mainTrim.twist };
  }
  const mainIncidence = signedSailIncidence(aw.awa, Math.abs(motion.main), controls.mainTwist);
  const jibIncidence = signedSailIncidence(aw.awa, Math.abs(motion.jib), controls.jibTwist);
  const response = (kind: "main" | "jib", incidence: number) => {
    const base = sailResponse(aw.aws, incidence, incidence > 18, Math.abs(twa) > 135, Math.abs(twa) < NO_GO_HALF_DEG);
    const load = kind === "main" && mainTrim ? 1 : transferLoad(motion, kind);
    return { ...base, fill: base.fill * load, attachment: base.attachment * load,
      luff: Math.max(base.luff, (motion.maneuver === "tacking" ? 1 : .15) * (1 - load) * Math.min(1, aw.aws / 4)),
      status: load < .95 && aw.aws >= 2 ? "transferring" as const : base.status };
  };
  const main = response("main", mainIncidence), jib = response("jib", jibIncidence);
  // Classic profile: the drawn attachment also loads the force model, with no
  // force at all inside the no-go reference cone. Cruiser profile (ADR-0021):
  // the force model luffs, flogs and stops the boat by itself, so the rig
  // only passes the crew's sail transfer; the drawing keeps its own response.
  const mainLoad = params.model ? (mainTrim ? 1 : transferLoad(motion, "main")) : main.attachment;
  const jibLoad = params.model ? transferLoad(motion, "jib") : jib.attachment;
  const rig: ResolvedRig = {
    main: { angleOff: Math.abs(motion.main), side: rigSide(motion.main, motion.lee),
      outhaulEase: mainTrim?.command.outhaulEase,
      load: mainLoad * Math.cos((mainTrim?.pose.rise ?? 0) * Math.PI / 180) },
    jib: { angleOff: Math.abs(motion.jib), side: rigSide(motion.jib, motion.lee), load: jibLoad },
  };
  return { ...tick(state, controls, params, dt, rig, boatMotion), motion, main, jib, mainIncidence, jibIncidence, mainTrim, resolvedControls: controls };
}
