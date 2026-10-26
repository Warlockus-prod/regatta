import { afterEach, describe, expect, it, vi } from "vitest";
import { LEGACY_RACE_CONTEXT, PHYSICAL_RACE_PROFILES, physicalRaceContext } from "./race-context";
import { makePhysicalRaceCourse, matchesPhysicalRaceCourse } from "./race-courses";
import { makeStandardCourse } from "./race-physics";
import { postNativeRace, postNativeRaceStarted, validateNativeRace, validateNativeRaceStarted, type NativeRaceSnapshot } from "./race-native";
import { defaultReplayCourse, replayMetadata, sharedReplay } from "./race-replay";

function fixture(): NativeRaceSnapshot {
  const course = makeStandardCourse();
  return { schema: 1, id: "record_context", mode: "pro", difficulty: "easy", windStrength: "medium", missionId: null,
    finishTimeSec: 120, position: 1, totalBoats: 3,
    course: { ...course, marks: course.marks.map(mark => ({ ...mark, label: "Знак", labelEn: "Mark", labelPl: "Znak" })) },
    samples: [0, 120].map(t => ({ t, x: 400, y: 1050 - t, heading: 45, twa: -45, speed: 4, lap: t ? 2 : 0 })),
    events: [{ type: "finish", t: 120 }] };
}

function physical(profile: typeof PHYSICAL_RACE_PROFILES[number]): NativeRaceSnapshot {
  const course = makePhysicalRaceCourse(profile);
  return { ...fixture(), raceContext: physicalRaceContext(profile),
    course: { ...course, marks: course.marks.map(mark => ({ ...mark, label: "Локальный знак", labelEn: "Local mark", labelPl: "Lokalny znak" })) } };
}
afterEach(() => vi.unstubAllGlobals());

describe("record readers before physical race emission", () => {
  it("preserves legacy native identity/bytes and the old replay metadata shape", () => {
    const old = fixture(), bytes = JSON.stringify(old);
    expect(validateNativeRace(old)).toBe(old);
    expect(JSON.stringify(old)).toBe(bytes);
    expect(validateNativeRace(old)).not.toHaveProperty("raceContext");
    expect(replayMetadata({ mode: "pro", penaltySeconds: 5 })).toEqual({ schema: 1, mode: "pro", penaltySeconds: 5 });
    expect(sharedReplay(old)?.metadata).toEqual({ schema: 1, mode: "pro", penaltySeconds: 0 });
    expect(JSON.stringify(old)).toBe(bytes);
  });

  it.each(PHYSICAL_RACE_PROFILES)("reads %s with canonical geometry and translated labels without mutating input", profile => {
    const value = physical(profile), before = JSON.stringify(value);
    expect(matchesPhysicalRaceCourse(physicalRaceContext(profile), value.course)).toBe(true);
    expect(validateNativeRace(value)).toEqual(value);
    const replay = sharedReplay(value)!;
    expect(replay.metadata.raceContext).toEqual(physicalRaceContext(profile));
    expect(replay.course).toEqual(value.course);
    expect(replay.samples.at(-1)?.t).toBe(120);
    expect(JSON.stringify(value)).toBe(before);
    expect(validateNativeRaceStarted(value)?.raceContext).toEqual(physicalRaceContext(profile));
  });

  it("rejects a known class paired with another course, mark order, radius or rounding side", () => {
    const value = physical("short");
    const cases = [
      { ...value, raceContext: physicalRaceContext("long") },
      { ...value, course: { ...value.course, marks: [...value.course.marks].reverse() } },
      { ...value, course: { ...value.course, marks: value.course.marks.map((m, i) => i ? m : { ...m, radius: m.radius + .1 }) } },
      { ...value, course: { ...value.course, marks: value.course.marks.map((m, i) => i ? m : { ...m, roundSide: "starboard" }) } },
      { ...value, course: { ...value.course, finishLine: { a: value.course.finishLine.b, b: value.course.finishLine.a } } },
    ];
    for (const input of cases) {
      expect(validateNativeRace(input)).toBeNull();
      expect(sharedReplay(input)).toBeNull();
    }
  });

  it.each([{ version: 2 }, { model: "future-model" }, { geometryRevision: 9 }, { coordinateUnits: "pixels" }, { metresPerUnit: 1 }])("rejects explicit unsupported context without a legacy fallback: %j", change => {
    const value = physical("short"), raceContext = { ...value.raceContext, ...change };
    expect(validateNativeRace({ ...value, raceContext })).toBeNull();
    expect(validateNativeRaceStarted({ ...value, raceContext })).toBeNull();
    expect(replayMetadata({ raceContext })).toBeNull();
    expect(sharedReplay({ ...value, raceContext })).toBeNull();
    expect(sharedReplay({ ...value, raceContext: undefined, course: { ...value.course, replayMetadata: { raceContext } } })).toBeNull();
  });

  it("does not let top-level mode hide nested future metadata or conflicting known classes", () => {
    const value = physical("short");
    for (const raceContext of [{ ...physicalRaceContext("short"), geometryRevision: 2 }, physicalRaceContext("long"), LEGACY_RACE_CONTEXT]) {
      expect(sharedReplay({ ...value, mode: "pro", course: { ...value.course, replayMetadata: { raceContext } } })).toBeNull();
    }
    expect(sharedReplay({ ...value, raceContext: undefined, mode: "pro", course: { ...value.course, replayMetadata: { raceContext: physicalRaceContext("short") } } })?.metadata.raceContext).toEqual(physicalRaceContext("short"));
  });

  it("omits absent replay provenance and lets null yield to a known nested context", () => {
    expect(replayMetadata({ raceContext: null })).toEqual({ schema: 1, mode: "simple", penaltySeconds: 0 });
    expect(sharedReplay({ ...fixture(), raceContext: null })?.metadata).not.toHaveProperty("raceContext");
    const value = physical("short");
    const nested = { ...value, raceContext: null, course: { ...value.course,
      replayMetadata: { schema: 1, mode: "pro", raceContext: physicalRaceContext("short") } } };
    const bytes = JSON.stringify(nested);
    expect(sharedReplay(nested)?.metadata.raceContext).toEqual(physicalRaceContext("short"));
    expect(sharedReplay({ ...value, course: { ...value.course, replayMetadata: { raceContext: null } } })?.metadata.raceContext).toEqual(physicalRaceContext("short"));
    expect(JSON.stringify(nested)).toBe(bytes);
    expect(sharedReplay({ ...nested, course: { ...value.course,
      replayMetadata: { raceContext: { ...physicalRaceContext("short"), geometryRevision: 2 } } } })).toBeNull();
  });

  it("requires an explicit control mode for physical classes instead of assigning old Simple defaults", () => {
    const value = physical("short");
    expect(validateNativeRace({ ...value, mode: undefined })).toBeNull();
    expect(sharedReplay({ ...value, mode: undefined })).toBeNull();
    expect(replayMetadata({ raceContext: value.raceContext })).toBeNull();
    expect(replayMetadata({})).toEqual({ schema: 1, mode: "simple", penaltySeconds: 0 });
  });

  it.each(PHYSICAL_RACE_PROFILES)("preserves recorded %s trajectory precision while retaining legacy rounding", profile => {
    const value = physical(profile);
    value.samples = value.samples.map(sample => ({ ...sample, x: 403.123456789, y: 924.987654321,
      heading: 45.123456789, twa: -45.987654321, speed: 4.123456789, windDir: 12.3456789,
      trim: { mainSheet: .123456789, jibSheet: .987654321, reef: .123, jibFurl: .456, mainHoisted: true } }));
    const bytes = JSON.stringify(value);
    expect(sharedReplay(value)?.samples).toEqual(value.samples);
    expect(sharedReplay(value)?.samples).not.toBe(value.samples);
    const old = sharedReplay({ ...value, raceContext: undefined })!;
    expect(old.samples[0]).toMatchObject({ x: 403.1, y: 925, heading: 45.1, twa: -46, speed: 4.12 });
    expect(JSON.stringify(value)).toBe(bytes);
  });

  it("rejects explicit future replay schemas before applying old metadata defaults", () => {
    const value = fixture();
    expect(sharedReplay({ ...value, schema: 2 })).toBeNull();
    expect(sharedReplay({ ...value, course: { ...value.course, replayMetadata: { schema: 2, mode: "pro" } } })).toBeNull();
    expect(replayMetadata({ schema: 2, mode: "pro" })).toBeNull();
    expect(sharedReplay(value)).not.toBeNull();
  });

  it("keeps old scenery fallback but never substitutes a physical finish line or track", () => {
    const old = fixture();
    expect(sharedReplay({ ...old, course: null })?.course).toEqual(defaultReplayCourse());
    const value = physical("short");
    expect(sharedReplay({ ...value, course: null })).toBeNull();
    expect(sharedReplay({ ...value, course: { ...value.course, finishLine: undefined } })).toBeNull();
    expect(sharedReplay({ ...value, mode: "future-mode" })).toBeNull();
    expect(validateNativeRace({ ...old, raceContext: null })?.raceContext).toBeNull();
  });

  it.each(["future-rounding", null, 3])("checks raw physical rounding before legacy normalization: %j", roundSide => {
    const value = physical("short");
    const invalid = { ...value, course: { ...value.course, marks: value.course.marks.map((m, i) => i ? m : { ...m, roundSide }) } };
    expect(validateNativeRace(invalid)).toBeNull();
    expect(sharedReplay(invalid)).toBeNull();
  });

  it.each([{ heading: "invalid" }, { speed: -1 }, { twa: 360 }, { lap: 99 }, { x: 20000 }, { t: "invalid" },
    { trim: { mainSheet: 2, jibSheet: .5, reef: 0, jibFurl: 0, mainHoisted: true } }])("never coerces or drops invalid physical samples: %j", patch => {
    const value = physical("short");
    const invalid = { ...value, samples: [{ ...value.samples[0], ...patch }, value.samples[1]] };
    expect(validateNativeRace(invalid)).toBeNull();
    expect(sharedReplay(invalid)).toBeNull();
  });

  it("requires actual t0 and the finished endpoint while allowing genuine unfinished shares", () => {
    const value = physical("short");
    expect(sharedReplay({ ...value, samples: [{ ...value.samples[0], t: 5 }, value.samples[1]] })).toBeNull();
    expect(validateNativeRace({ ...value, finishTimeSec: 121 })).toBeNull();
    expect(sharedReplay({ ...value, finishTimeSec: 121 })).toBeNull();
    expect(sharedReplay({ ...value, finishTimeSec: null, samples: [value.samples[0], { ...value.samples[1], t: 20, lap: 0 }] })).not.toBeNull();
    expect(sharedReplay({ ...value, finishTimeSec: "invalid" })).toBeNull();
    expect(sharedReplay({ ...fixture(), samples: [{ ...value.samples[0], speed: -1 }, value.samples[1]] })?.samples[0].speed).toBe(0);
  });

  it("keeps physical native result/start emission closed until result classes are ready", () => {
    const postMessage = vi.fn();
    vi.stubGlobal("window", { __REGATTA_RACE_NATIVE__: true, ReactNativeWebView: { postMessage } });
    expect(postNativeRace(physical("short"))).toBe(false);
    expect(postNativeRaceStarted({ ...physical("long"), mode: "pro" })).toBe(false);
    expect(postMessage).not.toHaveBeenCalled();
    expect(postNativeRace(fixture())).toBe(true);
    expect(postMessage).toHaveBeenCalledOnce();
  });
});
