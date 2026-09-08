import { apparentWind, tick, twaFromCompass, NO_GO_HALF_DEG,
  type BoatState, type Controls, type BoatParams, type ResolvedRig } from "@/lib/sailing-physics";
import { advanceRig, initialRig, rigSide, transferLoad, type RigMotion } from "../sails/transfer";
import { sailResponse, signedSailIncidence } from "../sails/response";

/** One shared source for the visible rig and the force calculation. */
export function stepWithRig(state: BoatState, controls: Controls, params: BoatParams, previous: RigMotion | null, dt: number) {
  const twa = twaFromCompass(state.trueWindDir, state.heading);
  const aw = apparentWind(state.trueWindSpeed, twa, state.boatSpeed, state.leeway);
  const input = { awa: aw.awa, aws: aw.aws,
    mainLimit: params.mainMaxOff * (1 - controls.mainSheet),
    jibLimit: params.jibMinOff + (params.jibMaxOff - params.jibMinOff) * (1 - controls.jibSheet) };
  const motion = advanceRig(previous ?? initialRig(input), input, dt);
  const mainIncidence = signedSailIncidence(aw.awa, Math.abs(motion.main), controls.mainTwist);
  const jibIncidence = signedSailIncidence(aw.awa, Math.abs(motion.jib), controls.jibTwist);
  const response = (kind: "main" | "jib", incidence: number) => {
    const base = sailResponse(aw.aws, incidence, incidence > 18, Math.abs(twa) > 135, Math.abs(twa) < NO_GO_HALF_DEG);
    const load = transferLoad(motion, kind);
    return { ...base, fill: base.fill * load, attachment: base.attachment * load,
      luff: Math.max(base.luff, (motion.maneuver === "tacking" ? 1 : .15) * (1 - load) * Math.min(1, aw.aws / 4)),
      status: load < .95 && aw.aws >= 2 ? "transferring" as const : base.status };
  };
  const main = response("main", mainIncidence), jib = response("jib", jibIncidence);
  const rig: ResolvedRig = {
    main: { angleOff: Math.abs(motion.main), side: rigSide(motion.main, motion.lee), load: main.attachment },
    jib: { angleOff: Math.abs(motion.jib), side: rigSide(motion.jib, motion.lee), load: jib.attachment },
  };
  return { ...tick(state, controls, params, dt, rig), motion, main, jib, mainIncidence, jibIncidence };
}
