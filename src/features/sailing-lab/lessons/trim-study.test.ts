import { describe, expect, it } from "vitest";
import { getBoatParams } from "../../../lib/sailing-physics";
import { createRuntimeState } from "../../simulator-v3/runtime/create-runtime-state";
import { DEFAULT_UI } from "../../simulator-v3/ui/shared";
import { sessionInput, stepSailingSession, type SailingSession } from "../runtime/session";
import { advanceTrimStudy, explainTrimStudy, newTrimStudy, recordTrimStudy, type TrimStudy } from "./trim-study";

const params = getBoatParams();
function start(tack: "port" | "starboard" = "starboard") {
  return createRuntimeState({ params, ui: { ...DEFAULT_UI, tack, twa: 50, mainAngle: 15, jibAngle: 18, mainTrim: { workingLength: 9, traveler: 0 } } });
}
function sail(s: SailingSession, study: TrimStudy, length = 9, traveler = 0) {
  for (let i = 0; i < 1800; i++) {
    s = stepSailingSession(s, { ...sessionInput(s), mainTrim: { workingLength: length, traveler } }, params);
    if (i % 3 === 0) study = advanceTrimStudy(study, s);
  }
  return { session: s, study: advanceTrimStudy(study, s) };
}
describe("observed mainsheet study", () => {
  for (const tack of ["port", "starboard"] as const) it(`requires real geometry and an explanation on ${tack} tack`, () => {
    let { session, study } = sail(start(tack), newTrimStudy());
    study = recordTrimStudy(study, session);
    expect(study.phase).toBe("ease");
    expect(recordTrimStudy(study, session).phase).toBe("ease");
    ({ session, study } = sail(session, study, 11));
    study = recordTrimStudy(study, session);
    expect(study.phase).toBe("compare");
    ({ session, study } = sail(session, study, 11, -.25 * Math.sign(study.baseline!.yaw)));
    study = recordTrimStudy(study, session);
    expect(study.phase).toBe("explain");
    expect(study.compared!.twist).toBeGreaterThan(study.baseline!.twist + 1);
    expect(explainTrimStudy(study, "angle-only").phase).toBe("explain");
    expect(explainTrimStudy(study, "shape").phase).toBe("complete");
  });
  it("does not award observations for a button press, pause or background gap", () => {
    const s = start();
    let study = advanceTrimStudy(newTrimStudy(), s);
    for (let i = 0; i < 100; i++) study = advanceTrimStudy(study, s);
    expect(study.stableFor).toBe(0);
    expect(recordTrimStudy(study, s).phase).toBe("baseline");
    const settled = sail(s, newTrimStudy());
    expect(settled.study.stableFor).toBe(3);
    expect(advanceTrimStudy(settled.study, { ...settled.session, simTime: settled.session.simTime + 10 }).stableFor).toBe(0);
    expect(advanceTrimStudy(settled.study, start())).toEqual(newTrimStudy());
  });
  it("rejects changing the wind or another sail to imitate the result", () => {
    let { session, study } = sail(start(), newTrimStudy());
    study = recordTrimStudy(study, session);
    session = { ...session, wind: { ...session.wind, baseTws: 14 } };
    ({ session, study } = sail(session, study, 11));
    expect(recordTrimStudy(study, session).issue).toBe("environment");
    expect(explainTrimStudy(study, "shape").phase).toBe("ease");
  });
});
