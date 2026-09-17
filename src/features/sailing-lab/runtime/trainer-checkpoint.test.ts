import { describe, expect, it } from "vitest";
import { getBoatParams } from "../../../lib/sailing-physics";
import { DEFAULT_UI, type UiState } from "../../simulator-v3/ui/shared";
import { createRuntimeState } from "../../simulator-v3/runtime/create-runtime-state";
import { advanceTrimStudy, explainTrimStudy, newTrimStudy, recordTrimStudy } from "../lessons/trim-study";
import { sessionInput, stepSailingSession, type SailingSession } from "./session";
import { readTrainerCheckpoint, writeTrainerCheckpoint } from "./trainer-checkpoint";

const params = getBoatParams();
const detailed: UiState = { ...DEFAULT_UI, twa: 50, mainAngle: 15, jibAngle: 18, mainTrim: { workingLength: 9, traveler: 0 } };
const make = (ui = detailed) => ({ savedAt: 123456, ui, session: createRuntimeState({ ui, params }), study: null });

describe("trainer checkpoints", () => {
  it.each([DEFAULT_UI, detailed])("preserves the exact next simulation tick", ui => {
    const data = make(ui);
    const saved = readTrainerCheckpoint(writeTrainerCheckpoint(data));
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.checkpoint).toEqual(data);
    expect(stepSailingSession(saved.checkpoint.session, sessionInput(data.session), params))
      .toEqual(stepSailingSession(data.session, sessionInput(data.session), params));
  });
  it("keeps observations, but not sampling continuity across restore", () => {
    let session: SailingSession = make().session;
    let study = newTrimStudy();
    for (let i = 0; i < 1200; i++) {
      session = stepSailingSession(session, sessionInput(session), params);
      if (i % 3 === 0) study = advanceTrimStudy(study, session);
    }
    study = recordTrimStudy(study, session);
    expect(study.phase).toBe("ease");
    const result = readTrainerCheckpoint(writeTrainerCheckpoint({ savedAt: 1, ui: detailed, session, study }));
    if (!result.ok) throw new Error("Valid observation rejected");
    expect(result.checkpoint.study).toMatchObject({ phase: "ease", baseline: study.baseline, stableFor: 0, last: null });
    expect(recordTrimStudy(result.checkpoint.study!, session).issue).toBe("wait");
  });
  it("restores every experiment phase, including the completed debrief", () => {
    let session: SailingSession = make().session;
    let study = newTrimStudy();
    for (const [length, traveler] of [[9, 0], [11, 0], [11, .25]]) {
      for (let tick = 0; tick < 1800; tick++) {
        session = stepSailingSession(session, { ...sessionInput(session), mainTrim: { workingLength: length, traveler } }, params);
        if (tick % 3 === 0) study = advanceTrimStudy(study, session);
      }
      study = recordTrimStudy(study, session);
      const saved = readTrainerCheckpoint(writeTrainerCheckpoint({ savedAt: 1, ui: { ...detailed, mainTrim: { workingLength: length, traveler } }, session, study }));
      if (!saved.ok) throw new Error("Experiment checkpoint rejected");
      expect(saved.checkpoint.study!.phase).toBe(study.phase);
      study = saved.checkpoint.study!;
    }
    expect(study.phase).toBe("explain");
    study = explainTrimStudy(study, "shape");
    const raw = writeTrainerCheckpoint({ savedAt: 1, ui: detailed, session, study });
    const completed = readTrainerCheckpoint(raw);
    expect(completed.ok && completed.checkpoint.study!.phase).toBe("complete");
    const damaged = JSON.parse(raw);
    damaged.study.compared.yaw += 15;
    expect(readTrainerCheckpoint(JSON.stringify(damaged)).ok).toBe(false);
  });
  it("rejects incompatible, oversized and invalid records without repair", () => {
    const raw = JSON.parse(writeTrainerCheckpoint(make()));
    expect(readTrainerCheckpoint("{" )).toEqual({ ok: false, reason: "corrupt" });
    expect(readTrainerCheckpoint("x".repeat(65537)).ok).toBe(false);
    expect(readTrainerCheckpoint(JSON.stringify({ ...raw, version: 2 }))).toEqual({ ok: false, reason: "incompatible" });
    expect(readTrainerCheckpoint(JSON.stringify({ ...raw, ui: { ...raw.ui, mainTrim: undefined } })).ok).toBe(false);
    for (const invalid of [null, "fast", 999]) expect(readTrainerCheckpoint(JSON.stringify({ ...raw, ui: { ...raw.ui, windSpeed: invalid } })).ok).toBe(false);
    expect(readTrainerCheckpoint(JSON.stringify({ ...raw, study: { ...newTrimStudy(), phase: "complete" } })).ok).toBe(false);
    const snapshot = JSON.parse(raw.snapshot); snapshot.session.model = "future-model";
    expect(readTrainerCheckpoint(JSON.stringify({ ...raw, snapshot: JSON.stringify(snapshot) }))).toEqual({ ok: false, reason: "incompatible" });
  });
});
