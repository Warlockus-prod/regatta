import { describe, expect, it } from "vitest";
import { REPLAY_LEAD_SEC, REPLAY_MAX_FRAME_SEC, REPLAY_MOMENT_MAX_SEC, REPLAY_SPEEDS, coachMistakeMoment, replayClockStep, replayRibbon, replayRibbonCurrent, replaySeekTarget } from "./race-replay-teaching";
import { measureRaceSkills } from "./race-skill-metrics";

// M4-3 contract: a jump lands REPLAY_LEAD_SEC before the moment, inside the
// recording; the ribbon lists the start, every tack with the speed it cost
// (the same number as the M4-1 skill metric), the mark rounding and the
// judge's items in race order, and nothing the recording cannot show.

/** 0..40 s every 0.5 s at 5 kn on port; a tack at 10 s drops to 4.4 kn for 2 s, then starboard. */
function race() {
  const samples = [];
  for (let t = 0; t <= 40; t += 0.5) {
    samples.push({ t, x: 500, y: 1200 - t * 5, heading: t < 10 ? 315 : 45, twa: t < 10 ? -45 : 45, speed: t >= 10 && t <= 12 ? 4.4 : 5, lap: t < 30 ? 0 : 1 });
  }
  return samples;
}
const events = [{ type: "start", t: 0 }, { type: "tack", t: 10 }, { type: "no-go-entered", t: 14 }, { type: "mark-rounded", t: 30 }, { type: "finish", t: 40 }, { type: "tack", t: 55 }];

describe("replay speeds and seek target", () => {
  it("offers 0.5x, 1x, 2x and 4x, slowest first", () => {
    expect(REPLAY_SPEEDS).toEqual([0.5, 1, 2, 4]);
  });

  it("lands 5 s before the moment, never before the first sample or after the last", () => {
    expect(REPLAY_LEAD_SEC).toBe(5);
    expect(replaySeekTarget(42, 0, 90)).toBe(37);
    expect(replaySeekTarget(3, 0, 90)).toBe(0);
    expect(replaySeekTarget(-4, 0, 90)).toBe(0);
    expect(replaySeekTarget(120, 0, 90)).toBe(90);
    expect(replaySeekTarget(42, 10, 90)).toBe(37);
    expect(replaySeekTarget(12, 10, 90)).toBe(10);
    expect(replaySeekTarget(Number.NaN, 2, 90)).toBe(2);
  });

  it("treats a coach mistake as a moment only when it is short", () => {
    expect(coachMistakeMoment({ timeStart: 31, timeEnd: 34 })).toBe(31);
    expect(coachMistakeMoment({ timeStart: 31, timeEnd: 31 + REPLAY_MOMENT_MAX_SEC })).toBe(31);
    // A whole-race note (0:00 to the finish) is not a moment: jumping would only restart.
    expect(coachMistakeMoment({ timeStart: 0, timeEnd: 95 })).toBeNull();
    expect(coachMistakeMoment({ timeStart: 31, timeEnd: 20 })).toBeNull();
    expect(coachMistakeMoment({ timeStart: Number.NaN, timeEnd: 3 })).toBeNull();
    expect(coachMistakeMoment(undefined)).toBeNull();
  });
});

describe("replay event ribbon", () => {
  it("lists the start, the tack with its speed loss, the mark and the judge items in race order", () => {
    const samples = race();
    const ribbon = replayRibbon({ samples, events, judgeItems: [
      { id: "j1", time: 22, kind: "give-way" },
      { id: "j0", time: -3, kind: "early-start" },
      { id: "j2", time: 1, kind: "contact", jostle: true },
    ] });
    expect(ribbon.map(i => [i.kind, i.t, i.seekT])).toEqual([
      ["judge", -3, 0], ["start", 0, 0], ["judge", 1, 0], ["tack", 10, 5], ["judge", 22, 17], ["mark", 30, 25],
    ]);
    const tack = ribbon.find(i => i.kind === "tack");
    expect(tack?.kind === "tack" && tack.lossKn).toBeCloseTo(0.6, 6);
    // The same number the M4-1 skill metric reports for this tack.
    const skills = measureRaceSkills({ samples, events, course: { windwardMark: { x: 500, y: 1050 }, startLine: { a: { x: 400, y: 1250 }, b: { x: 600, y: 1250 } } }, targetKn: () => 6, startedAt: 0 });
    expect(tack?.kind === "tack" && tack.lossKn).toBe(skills.tacks.list[0].speedLossKn);
    expect(ribbon.filter(i => i.kind === "judge").map(i => i.kind === "judge" && [i.judgeKind, i.jostle])).toEqual([["early-start", false], ["contact", true], ["give-way", false]]);
    // Unique ids: the ribbon keys its buttons by them.
    expect(new Set(ribbon.map(i => i.id)).size).toBe(ribbon.length);
  });

  it("leaves out what the recording cannot show and the events it does not teach", () => {
    const ribbon = replayRibbon({ samples: race(), events });
    // The tack at 55 s is after the last sample (40 s); no-go and finish are not ribbon events.
    expect(ribbon.map(i => i.kind)).toEqual(["start", "tack", "mark"]);
    expect(replayRibbon({ samples: [], events })).toEqual([]);
    expect(replayRibbon({ samples: race(), events: [] })).toEqual([]);
  });

  it("marks the event the replay is at: the last one that has happened, or the one jumped to", () => {
    const ribbon = replayRibbon({ samples: race(), events });
    expect(replayRibbonCurrent(ribbon, 0)).toBe("start");
    // The tack (10 s) is not marked during its lead-in unless it was jumped to.
    expect(replayRibbonCurrent(ribbon, 5)).toBe("start");
    expect(replayRibbonCurrent(ribbon, 5, "tack-0")).toBe("tack-0");
    expect(replayRibbonCurrent(ribbon, 10)).toBe("tack-0");
    expect(replayRibbonCurrent(ribbon, 29.9, "tack-0")).toBe("tack-0");
    // The pin lets go at the next event, or when the cursor goes back before its target.
    expect(replayRibbonCurrent(ribbon, 30, "tack-0")).toBe("mark-3");
    expect(replayRibbonCurrent(ribbon, 4, "tack-0")).toBe("start");
    expect(replayRibbonCurrent(ribbon, 39)).toBe("mark-3");
    expect(replayRibbonCurrent(ribbon, 39, "gone")).toBe("mark-3");
    expect(replayRibbonCurrent([], 10)).toBeNull();
  });

  it("keeps Start current at the start when early events share its clamped jump target", () => {
    // Start at 0, a crowd at the start at 3 s and a tack at 4 s: all three jump to 0.
    const samples = race();
    const early = [{ type: "start", t: 0 }, { type: "tack", t: 4 }];
    const ribbon = replayRibbon({ samples, events: early, judgeItems: [{ id: "c", time: 3, kind: "contact", jostle: true }] });
    expect(ribbon.map(i => [i.id, i.seekT])).toEqual([["start", 0], ["judge-c", 0], ["tack-0", 0]]);
    expect(replayRibbonCurrent(ribbon, 0)).toBe("start");
    expect(replayRibbonCurrent(ribbon, 0, "start")).toBe("start");
    expect(replayRibbonCurrent(ribbon, 0, "tack-0")).toBe("tack-0");
    expect(replayRibbonCurrent(ribbon, 3.5)).toBe("judge-c");
  });
});

describe("replay clock", () => {
  const on = { rate: 2, total: 60, playing: true, sceneReady: true, hidden: false };
  it("moves at the chosen speed, one capped frame at a time, and stops at the end", () => {
    expect(replayClockStep(10, 0.05, on)).toBeCloseTo(10.1, 9);
    expect(replayClockStep(10, 3, on)).toBeCloseTo(10 + REPLAY_MAX_FRAME_SEC * 2, 9);
    expect(replayClockStep(59.95, 0.05, on)).toBe(60);
  });

  it("holds while paused, in a hidden tab and until the scene has drawn its first frame", () => {
    expect(replayClockStep(26, 0.05, { ...on, sceneReady: false })).toBe(26);
    expect(replayClockStep(26, 0.05, { ...on, playing: false })).toBe(26);
    expect(replayClockStep(26, 0.05, { ...on, hidden: true })).toBe(26);
    expect(replayClockStep(26, Number.NaN, on)).toBe(26);
  });
});
