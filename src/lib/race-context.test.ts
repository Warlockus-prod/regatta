import { describe, expect, it } from "vitest";
import { LEGACY_RACE_CONTEXT, PHYSICAL_RACE_EMISSION_ENABLED, PHYSICAL_RACE_PROFILES, physicalRaceContext, raceClassId, raceContextFor, raceRecordsEnabled, readRaceContext } from "./race-context";

describe("versioned race context before emission", () => {
  it("pins absent old metadata to legacy without changing the input", () => {
    for (const value of [undefined, null]) expect(readRaceContext(value)).toEqual({ ok: true, context: LEGACY_RACE_CONTEXT });
    expect(raceClassId(LEGACY_RACE_CONTEXT)).toBe("legacy-race-v1:standard:r1");
    expect(LEGACY_RACE_CONTEXT).toEqual({ version: 1, geometryRevision: 1, coordinateUnits: "race-world-v1", metresPerUnit: .6, model: "legacy-race-v1", profile: "standard" });
  });

  it("round-trips canonical immutable contexts and keeps all course classes separate", () => {
    const ids = new Set([raceClassId(LEGACY_RACE_CONTEXT)]);
    for (const profile of PHYSICAL_RACE_PROFILES) {
      const context = physicalRaceContext(profile);
      const raw = { ...JSON.parse(JSON.stringify(context)), untrusted: "discard" };
      const before = JSON.stringify(raw);
      expect(readRaceContext(raw)).toEqual({ ok: true, context });
      expect(JSON.stringify(raw)).toBe(before);
      const read = readRaceContext(raw);
      if (!read.ok) throw new Error("Context rejected");
      expect(read.context).not.toHaveProperty("untrusted");
      expect(Object.isFrozen(read.context)).toBe(true);
      const id = raceClassId(context);
      expect(id).toBe(`physical-cruiser-v1:${profile}:r1`);
      ids.add(id);
    }
    expect(ids.size).toBe(4);
    expect(Object.isFrozen(PHYSICAL_RACE_PROFILES)).toBe(true);
    expect(Object.isFrozen(LEGACY_RACE_CONTEXT)).toBe(true);
  });

  it.each([
    { version: 2 }, { geometryRevision: 2 }, { model: "future-cruiser-v9" },
    { coordinateUnits: "metres" }, { metresPerUnit: 1 }, { profile: "triangle" },
    { model: "legacy-race-v1", profile: "short" }, { model: "physical-cruiser-v1", profile: "standard" },
  ])("rejects explicit unsupported metadata instead of substituting a default: %j", change => {
    expect(readRaceContext({ ...physicalRaceContext("short"), ...change })).toEqual({ ok: false, reason: "unsupported" });
  });

  it.each([false, 1, "short", [], {}, { version: 1 },
    { ...physicalRaceContext("short"), version: 1.5 },
    { ...physicalRaceContext("short"), metresPerUnit: NaN },
    { ...physicalRaceContext("short"), metresPerUnit: -1 },
    { ...physicalRaceContext("short"), geometryRevision: "1" },
  ])("rejects malformed context: %j", raw => {
    expect(readRaceContext(raw)).toEqual({ ok: false, reason: "invalid" });
  });
});

// Contract (M5 step 7): one helper decides whether a race may write records.
// The legacy race always may; a metric race only with switch A, which ships
// off (the flip is m5-11, a mocked true is tested in useRaceLoop.records and
// GameClient.records).
describe("which race may record (M5 step 7)", () => {
  it("records the legacy race and no metric course while switch A is off", () => {
    expect(PHYSICAL_RACE_EMISSION_ENABLED).toBe(false);
    expect(raceRecordsEnabled(LEGACY_RACE_CONTEXT)).toBe(true);
    for (const profile of PHYSICAL_RACE_PROFILES) expect(raceRecordsEnabled(physicalRaceContext(profile))).toBe(false);
  });

  it("names the context of a setup: the metric profile, else the legacy course", () => {
    expect(raceContextFor(null)).toBe(LEGACY_RACE_CONTEXT);
    expect(raceContextFor(undefined)).toBe(LEGACY_RACE_CONTEXT);
    expect(raceContextFor("medium")).toBe(physicalRaceContext("medium"));
  });
});
