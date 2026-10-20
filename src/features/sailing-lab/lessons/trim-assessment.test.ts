import { describe, expect, it } from "vitest";
import { getBoatParams } from "../../../lib/sailing-physics";
import { createRuntimeState } from "../../simulator-v3/runtime/create-runtime-state";
import { DEFAULT_UI } from "../../simulator-v3/ui/shared";
import { sessionInput, stepSailingSession, type SailingSession } from "../runtime/session";
import { advanceTrimAssessment, explainTrimAssessment, newTrimAssessment, recordTrimAssessment, trimTasks, type TrimAssessment, type TrimTask } from "./trim-assessment";
import type { MainTrimCommand } from "../rig/main-trim";

const params = getBoatParams();
function start(task: TrimTask) {
  const spec = trimTasks[task];
  return createRuntimeState({ params, ui: { ...DEFAULT_UI, ...spec, mainTrim: { workingLength: spec.length, traveler: 0, outhaulEase: spec.outhaul } } });
}
function sail(session: SailingSession, assessment: TrimAssessment, command = session.mainTrim!.target) {
  for (let i = 0; i < 1800; i++) {
    session = stepSailingSession(session, { ...sessionInput(session), mainTrim: command }, params);
    if (i % 3 === 0) assessment = advanceTrimAssessment(assessment, session);
  }
  return { session, assessment: advanceTrimAssessment(assessment, session) };
}

describe("independent trim transfer in new conditions", () => {
  it("does not accept a baseline after changing the assigned course, tack or jib trim", () => {
    const spec = trimTasks.depth;
    for (const change of [{ twa: 45 }, { tack: "port" as const }, { jibAngle: 5 }]) {
      const session = createRuntimeState({ params, ui: { ...DEFAULT_UI, ...spec, ...change, mainTrim: { workingLength: spec.length, traveler: 0, outhaulEase: spec.outhaul } } });
      expect(sail(session, newTrimAssessment("depth")).assessment.phase).toBe("baseline");
    }
  });
  it("requires actual lower-sail flattening and a causal explanation", () => {
    let { session, assessment } = sail(start("depth"), newTrimAssessment("depth"));
    expect(assessment.phase).toBe("perform");
    expect(recordTrimAssessment(assessment, session).issue).toBe("goal");
    ({ session, assessment } = sail(session, assessment, { ...session.mainTrim!.target, outhaulEase: 0 }));
    assessment = recordTrimAssessment(assessment, session);
    expect(assessment.phase).toBe("explain");
    expect(explainTrimAssessment(assessment, false).phase).toBe("explain");
    expect(explainTrimAssessment(assessment, true).phase).toBe("complete");
  });
  it("accepts more than one successful sheet/car combination instead of memorized values", () => {
    const initial = sail(start("twist"), newTrimAssessment("twist"));
    expect(initial.assessment.phase).toBe("perform");
    let successes = 0;
    for (const extra of [1.5, 2, 2.5]) {
      // Search is test-only. The learner sees outcomes, never this answer key.
      for (const car of [.2, .25, .3, .35, .4]) {
        const command: MainTrimCommand = { workingLength: trimTasks.twist.length + extra, traveler: -car };
        const trial = sail(initial.session, initial.assessment, command);
        if (recordTrimAssessment(trial.assessment, trial.session).phase === "explain") successes++;
      }
    }
    expect(successes).toBeGreaterThanOrEqual(2);
  });
  it("cannot pass with pause, a click, a long gap or a different wind", () => {
    let { session, assessment } = sail(start("depth"), newTrimAssessment("depth"));
    expect(recordTrimAssessment(assessment, session).phase).toBe("perform");
    for (let i = 0; i < 30; i++) assessment = advanceTrimAssessment(assessment, session);
    expect(assessment.stableFor).toBe(0);
    ({ session, assessment } = sail(session, assessment, { ...session.mainTrim!.target, outhaulEase: 0 }));
    expect(assessment.stableFor).toBe(3);
    expect(advanceTrimAssessment(assessment, { ...session, simTime: session.simTime + 10 }).stableFor).toBe(0);
    expect(advanceTrimAssessment(assessment, start("depth"))).toEqual(newTrimAssessment("depth"));
    session = { ...session, wind: { ...session.wind, baseTws: 12 } };
    ({ session, assessment } = sail(session, assessment));
    expect(recordTrimAssessment(assessment, session).issue).toBe("environment");
    expect(assessment.stableFor).toBe(0);
  });
});
