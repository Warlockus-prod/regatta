import { describe, expect, it } from "vitest";
import { LEGACY_RACE_CONTEXT, PHYSICAL_RACE_PROFILES, physicalRaceContext, raceClassId, readRaceContext } from "./race-context";

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
