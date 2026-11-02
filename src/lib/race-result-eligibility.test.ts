import { describe, expect, it } from "vitest";
import { LEGACY_RACE_CONTEXT, PHYSICAL_RACE_PROFILES, physicalRaceContext, type RaceContext } from "./race-context";
import { makePhysicalRaceCourse } from "./race-courses";
import { makeStandardCourse } from "./race-physics";
import { matchesRegisteredRaceCourse, minimumFinishSec, readClassifiedRaceResult } from "./race-result-eligibility";
import { FINISH_SEC_MIN } from "./race-submission";

const course = () => structuredClone(makeStandardCourse());
const result = () => ({ raceContext: LEGACY_RACE_CONTEXT, mode: "pro", difficulty: "easy", windStrength: "light",
  course: course(), rawFinishTimeSec: 80.125, penaltySeconds: 5, finishTimeSec: 85.125 });

describe("registered result eligibility", () => {
  it("does not infer classification from an absent context even for exact standard geometry", () => {
    for (const context of [undefined, null]) expect(matchesRegisteredRaceCourse(context as unknown as RaceContext, course())).toBe(false);
  });

  it("uses actual standard geometry while allowing every translated label to differ", () => {
    const translated = course();
    for (const mark of translated.marks) Object.assign(mark, { label: "Znak", labelRu: "Знак", labelEn: "Mark", labelPl: "Boja", labelFr: "Bouée" });
    expect(matchesRegisteredRaceCourse(LEGACY_RACE_CONTEXT, translated)).toBe(true);
    expect(readClassifiedRaceResult({ ...result(), course: translated })).toEqual({ ok: true, value: {
      raceContext: LEGACY_RACE_CONTEXT, classId: "legacy-race-v1:standard:r1", mode: "pro", difficulty: "easy", windStrength: "light",
      rawFinishTimeSec: 80.125, penaltySeconds: 5, finishTimeSec: 85.125,
    } });
  });

  it("does not classify a readable custom legacy replay or changed registered geometry", () => {
    const changed = [
      (c: ReturnType<typeof course>) => { c.startLine.a.x += 1; },
      (c: ReturnType<typeof course>) => { c.finishLine.b.y += 1; },
      (c: ReturnType<typeof course>) => { c.marks[0].pos.y += 1; },
      (c: ReturnType<typeof course>) => { c.marks[1].radius += 1; },
      (c: ReturnType<typeof course>) => { c.marks[0].type = "start"; },
      (c: ReturnType<typeof course>) => { c.marks.reverse(); },
      (c: ReturnType<typeof course>) => { c.marks.pop(); },
      (c: ReturnType<typeof course>) => { const a = c.startLine.a; c.startLine.a = c.startLine.b; c.startLine.b = a; },
    ];
    for (const change of changed) {
      const raw = course(); change(raw);
      expect(matchesRegisteredRaceCourse(LEGACY_RACE_CONTEXT, raw)).toBe(false);
      expect(readClassifiedRaceResult({ ...result(), course: raw })).toEqual({ ok: false, reason: "invalid" });
    }
    expect(matchesRegisteredRaceCourse(LEGACY_RACE_CONTEXT, { ...course(), startLine: { a: { x: 420, y: 1250 }, b: { x: 580, y: 1250 } } })).toBe(false);
  });

  it.each([null, "starboard", 0, "future"])("rejects a raw incompatible windward rounding side: %j", roundSide => {
    const raw = course(); Object.assign(raw.marks[0], { roundSide });
    expect(matchesRegisteredRaceCourse(LEGACY_RACE_CONTEXT, raw)).toBe(false);
  });

  it.each(PHYSICAL_RACE_PROFILES)("recognizes exact %s geometry but keeps physical writes disabled", profile => {
    // A sailed time above every metric floor (M5 step 8): this case is about the geometry and the switch.
    const raw = { ...result(), raceContext: physicalRaceContext(profile), course: makePhysicalRaceCourse(profile),
      rawFinishTimeSec: 400, penaltySeconds: 5, finishTimeSec: 405 };
    expect(matchesRegisteredRaceCourse(raw.raceContext, raw.course)).toBe(true);
    expect(readClassifiedRaceResult(raw)).toEqual({ ok: false, reason: "disabled" });
    raw.course.marks[0].radius += 1;
    expect(readClassifiedRaceResult(raw)).toEqual({ ok: false, reason: "invalid" });
  });

  it.each([{}, { raceContext: undefined }, { raceContext: null }, { mode: undefined }, { classId: "physical-cruiser-v1:short:r1" },
    { raceContext: { ...LEGACY_RACE_CONTEXT, geometryRevision: 2 } }, { missionId: "sub-90" }, { dailyDay: "2026-10-26" }, { daily: null }, { daily: "2026-10-26" },
    { rawFinishTimeSec: 0 }, { rawFinishTimeSec: 3600.1 }, { penaltySeconds: -1 }, { penaltySeconds: 3600.1 },
    { finishTimeSec: 19.99 }, { finishTimeSec: Infinity }, { finishTimeSec: 85.126 }, { difficulty: "future" }])("rejects ineligible declared result fields: %j", patch => {
    const raw = Object.keys(patch).length ? { ...result(), ...patch } : {};
    expect(readClassifiedRaceResult(raw).ok).toBe(false);
  });

  it("derives ranked time without rounding and strips course, private text and client authority", () => {
    const raw = Object.freeze({ ...result(), rawFinishTimeSec: 20.123456789, penaltySeconds: .01,
      finishTimeSec: 20.133456789 + 5e-8, nickname: "PRIVATE", course: Object.freeze(course()) });
    const read = readClassifiedRaceResult(raw);
    expect(read.ok).toBe(true);
    if (read.ok) {
      expect(read.value.finishTimeSec).toBe(raw.rawFinishTimeSec + raw.penaltySeconds);
      expect(read.value).not.toHaveProperty("course"); expect(read.value).not.toHaveProperty("nickname");
    }
    expect(raw.finishTimeSec).toBe(20.133456789 + 5e-8);
  });

  it("applies the existing ranked bounds to the derived sum as well as the supplied time", () => {
    for (const [rawFinishTimeSec, penaltySeconds, finishTimeSec] of [[.01, 19.99, 20], [3600, 3600, 7200]]) {
      expect(readClassifiedRaceResult({ ...result(), rawFinishTimeSec, penaltySeconds, finishTimeSec }).ok).toBe(true);
    }
    expect(readClassifiedRaceResult({ ...result(), rawFinishTimeSec: .01, penaltySeconds: 19.99 - 5e-8, finishTimeSec: 20 }))
      .toEqual({ ok: false, reason: "invalid" });
  });
});

// Contract (M5 step 8, ADR-0015 point 12): a metric course has its own floor
// of plausible sailed time, from its length (2 x leg at a mean 8 kn); a time
// under it is invalid, a time at it passes validation (and is refused only by
// switch A while that is off: "disabled", not "invalid"). The legacy course
// keeps its 20 s bound on the penalty-adjusted time, exactly as before.
describe("the finish floor of a class (M5 step 8)", () => {
  const metric = (profile: "short" | "medium" | "long", rawFinishTimeSec: number) => {
    const course = makePhysicalRaceCourse(profile);
    return { finishTimeSec: rawFinishTimeSec, difficulty: "easy", windStrength: "light", raceContext: physicalRaceContext(profile), mode: "simple",
      course: { ...course, marks: course.marks.map(mark => ({ ...mark, label: "x", labelEn: "x", labelPl: "x" })) }, rawFinishTimeSec, penaltySeconds: 0 };
  };

  it("is 2 x leg at 8 kn for each metric course and 20 s for the legacy one", () => {
    expect(PHYSICAL_RACE_PROFILES.map(p => minimumFinishSec(physicalRaceContext(p)))).toEqual([58, 145, 291]);
    expect(minimumFinishSec(LEGACY_RACE_CONTEXT)).toBe(FINISH_SEC_MIN);
  });

  it.each([["short", 58], ["medium", 145], ["long", 291]] as const)("refuses a %s finish under %i s and lets one at it through validation", (profile, floor) => {
    expect(readClassifiedRaceResult(metric(profile, floor - .5))).toEqual({ ok: false, reason: "invalid" });
    expect(readClassifiedRaceResult(metric(profile, floor))).toEqual({ ok: false, reason: "disabled" });
  });

  it("keeps the legacy course at 20 s on the penalty-adjusted time", () => {
    const legacy = { ...result(), rawFinishTimeSec: 21, penaltySeconds: 0, finishTimeSec: 21 };
    expect(readClassifiedRaceResult(legacy).ok).toBe(true);
    expect(readClassifiedRaceResult({ ...legacy, rawFinishTimeSec: 10, penaltySeconds: 10, finishTimeSec: 20 }).ok).toBe(true);
  });
});
