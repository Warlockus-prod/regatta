import { describe, expect, it } from "vitest";
import { LEGACY_RACE_CONTEXT, PHYSICAL_RACE_PROFILES, physicalRaceContext, type RaceContext } from "./race-context";
import { makePhysicalRaceCourse } from "./race-courses";
import { makeStandardCourse } from "./race-physics";
import { matchesRegisteredRaceCourse, readClassifiedRaceResult } from "./race-result-eligibility";

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
    const raw = { ...result(), raceContext: physicalRaceContext(profile), course: makePhysicalRaceCourse(profile) };
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
