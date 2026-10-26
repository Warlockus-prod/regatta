import { describe, expect, it } from "vitest";
import { LEGACY_RACE_CONTEXT, PHYSICAL_RACE_PROFILES, physicalRaceContext, raceClassId } from "./race-context";
import { raceComparisonKey, raceContextForClassId, readRaceComparison, readRaceResultSelection } from "./race-record-class";

const difficulties = ["easy", "medium", "hard"] as const;
const winds = ["light", "medium", "heavy"] as const;
const modes = ["simple", "pro"] as const;
const conditions = { difficulty: "easy", windStrength: "light" };

describe("versioned comparison and global result identity", () => {
  it("preserves all 18 historical PB keys for absent, null and explicit legacy context", () => {
    const keys = new Set<string>();
    for (const difficulty of difficulties) for (const windStrength of winds) for (const mode of modes) {
      const expected = `${mode === "pro" ? "pro:" : ""}${difficulty}-${windStrength}`;
      for (const raceContext of [undefined, null, LEGACY_RACE_CONTEXT]) {
        expect(raceComparisonKey({ difficulty, windStrength, mode, raceContext })).toBe(expected);
      }
      keys.add(expected);
    }
    expect(keys.size).toBe(18);
    expect(raceComparisonKey(conditions)).toBe("easy-light");
    expect(readRaceComparison(conditions)).toEqual({ ok: true, value: { ...conditions, mode: "simple", raceContext: LEGACY_RACE_CONTEXT } });
  });

  it("isolates every physical profile, mode and condition without changing old keys", () => {
    const keys = new Set<string>();
    for (const profile of PHYSICAL_RACE_PROFILES) for (const mode of modes) for (const difficulty of difficulties) for (const windStrength of winds) {
      const raceContext = physicalRaceContext(profile);
      const key = raceComparisonKey({ raceContext, mode, difficulty, windStrength })!;
      expect(key).toBe(`ctx:physical-cruiser-v1:${profile}:r1:${mode}:${difficulty}:${windStrength}`);
      expect(key).not.toBe(raceComparisonKey({ mode, difficulty, windStrength }));
      keys.add(key);
    }
    expect(keys.size).toBe(54);
  });

  it("fits the actual 72 supported keys with large finite values inside the existing bridge bound", () => {
    const store: Record<string, { timeSec: number; ts: number }> = {};
    for (const raceContext of [LEGACY_RACE_CONTEXT, ...PHYSICAL_RACE_PROFILES.map(physicalRaceContext)]) {
      for (const mode of modes) for (const difficulty of difficulties) for (const windStrength of winds) {
        const key = raceComparisonKey({ raceContext, mode, difficulty, windStrength })!;
        store[key] = { timeSec: Number.MAX_VALUE, ts: Number.MAX_SAFE_INTEGER };
      }
    }
    expect(Object.keys(store)).toHaveLength(72);
    expect(JSON.stringify(store).length).toBeLessThanOrEqual(16_000);
    // Consumers must also check preserved unknown entries, not trim them.
    expect(JSON.stringify({ ...store, future: "x".repeat(16_000) }).length).toBeGreaterThan(16_000);
  });

  it.each(PHYSICAL_RACE_PROFILES)("requires explicit %s mode before any local legacy default", profile => {
    const raw = { ...conditions, raceContext: physicalRaceContext(profile) };
    expect(readRaceComparison(raw)).toEqual({ ok: false, reason: "invalid" });
    expect(raceComparisonKey({ ...raw, mode: undefined })).toBeNull();
    expect(readRaceResultSelection(raw)).toEqual({ ok: false, reason: "invalid" });
  });

  it.each([null, [], true, 1, "easy-light", {}, { ...conditions, mode: "future" }, { ...conditions, mode: null },
    { ...conditions, difficulty: "future" }, { ...conditions, windStrength: "future" }])("rejects invalid comparisons without a default bucket: %j", raw => {
    expect(readRaceComparison(raw).ok).toBe(false);
    expect(raceComparisonKey(raw)).toBeNull();
  });

  it.each([{ version: 2 }, { geometryRevision: 2 }, { coordinateUnits: "pixels" }, { metresPerUnit: 1 }, { model: "future" }])("rejects unsupported coordinates in both contracts: %j", patch => {
    const raw = { ...conditions, mode: "pro", raceContext: { ...physicalRaceContext("short"), ...patch } };
    expect(readRaceComparison(raw)).toEqual({ ok: false, reason: "unsupported" });
    expect(readRaceResultSelection(raw)).toEqual({ ok: false, reason: "unsupported" });
    expect(raceComparisonKey(raw)).toBeNull();
  });

  it("keeps absent/null global provenance unclassified even when a valid mode is supplied", () => {
    for (const raceContext of [undefined, null]) for (const mode of [undefined, ...modes]) {
      expect(readRaceResultSelection({ raceContext, mode })).toEqual({ ok: true, value: { kind: "legacy-unclassified" } });
    }
    expect(readRaceResultSelection({ mode: "future" }).ok).toBe(false);
    expect(readRaceResultSelection({ mode: null }).ok).toBe(false);
    expect(readRaceResultSelection(null).ok).toBe(false);
  });

  it("derives classified selection only from explicit canonical context and mode", () => {
    for (const raceContext of [LEGACY_RACE_CONTEXT, ...PHYSICAL_RACE_PROFILES.map(physicalRaceContext)]) for (const mode of modes) {
      const classId = raceClassId(raceContext);
      expect(readRaceResultSelection({ raceContext, mode, classId })).toEqual({ ok: true,
        value: { kind: "classified", raceContext, classId, mode } });
      expect(readRaceResultSelection({ raceContext }).ok).toBe(false);
      expect(readRaceResultSelection({ raceContext, mode, classId: "arbitrary" }).ok).toBe(false);
      expect(readRaceResultSelection({ classId, mode }).ok).toBe(false);
    }
  });

  it("looks up only the four exact registered class IDs and returns canonical immutable contexts", () => {
    for (const context of [LEGACY_RACE_CONTEXT, ...PHYSICAL_RACE_PROFILES.map(physicalRaceContext)]) {
      expect(raceContextForClassId(raceClassId(context))).toBe(context);
      expect(Object.isFrozen(raceContextForClassId(raceClassId(context)))).toBe(true);
    }
    for (const raw of [undefined, null, [], 1, "", "__proto__", "physical-cruiser-v1:short:r2", " physical-cruiser-v1:short:r1"]) {
      expect(raceContextForClassId(raw)).toBeNull();
    }
  });

  it("does not mutate frozen input or carry unrelated fields into the canonical output", () => {
    const raw = Object.freeze({ ...conditions, mode: "pro", raceContext: physicalRaceContext("short"), extra: "private" });
    const before = JSON.stringify(raw);
    const read = readRaceComparison(raw);
    expect(read.ok).toBe(true);
    if (read.ok) expect(read.value).not.toHaveProperty("extra");
    expect(readRaceResultSelection(raw)).toEqual({ ok: true, value: { kind: "classified", mode: "pro",
      raceContext: physicalRaceContext("short"), classId: "physical-cruiser-v1:short:r1" } });
    expect(JSON.stringify(raw)).toBe(before);
  });
});
