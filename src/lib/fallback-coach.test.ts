import { describe, expect, it } from "vitest";
import { analyseRaceLocally, measureRaceLog } from "./fallback-coach";

type Sample = { t: number; x: number; y: number; heading: number; twa: number; speed: number; lap: number };
type Event = { type: "start" | "tack" | "gybe" | "mark-rounded" | "finish" | "no-go-entered"; t: number; note?: string };

/** A race log sampled every 0.5 s: `at(t)` gives the TWA and speed at race time t. */
function samples(seconds: number, at: (t: number) => { twa: number; speed: number }): Sample[] {
  return Array.from({ length: seconds * 2 }, (_, i) => {
    const t = i / 2, { twa, speed } = at(t);
    return { t, x: 400, y: 600, heading: twa, twa, speed, lap: 0 };
  });
}
const log = (s: Sample[], events: Event[], finishTime: number | null = 100, position = 2) =>
  ({ difficulty: "medium", courseInfo: { windDirection: 0, windwardMark: { x: 400, y: 180 }, startY: 1050 }, finishTime, position, totalBoats: 4, samples: s, events });
const cleanBeat = (t: number) => ({ twa: t % 30 < 15 ? 45 : -45, speed: 5 });

describe("local coach (M0-4)", () => {
  it("uses one no-go definition: no praise when the samples show the zone, even without a logged event", () => {
    // 10 s of 20 degrees at 1 kn, no 'no-go-entered' event (an older or foreign log).
    const s = samples(100, (t) => t >= 40 && t < 50 ? { twa: 20, speed: 1 } : cleanBeat(t));
    const m = measureRaceLog({ samples: s, events: [] });
    expect(m.noGoEntries).toBe(1);
    expect(m.noGoSeconds).toBe(10);
    const coaching = analyseRaceLocally(log(s, []), "en");
    expect(coaching.strengths.join()).not.toMatch(/no-go/i);
    // Fast at 20 degrees (just turning through the wind) is not the zone.
    const fast = samples(100, (t) => t >= 40 && t < 41 ? { twa: 20, speed: 4 } : cleanBeat(t));
    expect(measureRaceLog({ samples: fast, events: [] }).noGoEntries).toBe(0);
    expect(analyseRaceLocally(log(fast, []), "en").strengths).toContain("Never entered the no-go zone");
  });

  it("criticises tack count from tacks only, not from gybes", () => {
    const s = samples(100, cleanBeat);
    const gybes: Event[] = Array.from({ length: 14 }, (_, i) => ({ type: "gybe", t: 5 + i * 6 }));
    const tacks: Event[] = Array.from({ length: 12 }, (_, i) => ({ type: "tack", t: 5 + i * 7 }));
    expect(analyseRaceLocally(log(s, gybes), "en").mistakes.map((m) => m.titleRu).join()).not.toMatch(/tacks/);
    expect(analyseRaceLocally(log(s, [...gybes, ...tacks]), "en").mistakes.map((m) => m.titleRu)).toContain("Too many tacks (12)");
  });

  it("aims the next goal at the largest measured loss, whichever mistake it is", () => {
    // A: long stall in the zone, a few tacks. B: many costly tacks, a short stall.
    const stall = (from: number, to: number) => (t: number) => t >= from && t < to ? { twa: 10, speed: 0.5 } : cleanBeat(t);
    const fewTacks: Event[] = Array.from({ length: 11 }, (_, i) => ({ type: "tack", t: 2 + i * 9 }));
    const a = samples(100, stall(20, 50));
    const goalA = analyseRaceLocally(log(a, [...fewTacks, { type: "no-go-entered", t: 20 }, { type: "no-go-entered", t: 60 }]), "en").nextGoal!;
    expect(goalA).toMatch(/^Stay out of the no-go zone/);
    // Every tack drops the speed to 2.5 kn for 4 s while the boat bears away onto the new tack.
    const manyTacks: Event[] = Array.from({ length: 16 }, (_, i) => ({ type: "tack", t: 3 + i * 6 }));
    const b = samples(100, (t) => {
      if (t >= 70 && t < 72) return { twa: 10, speed: 1.5 };
      return manyTacks.some((e) => t > e.t && t <= e.t + 4) ? { twa: 60, speed: 2.5 } : cleanBeat(t);
    });
    const coachingB = analyseRaceLocally(log(b, [...manyTacks, { type: "no-go-entered", t: 70 }, { type: "no-go-entered", t: 80 }]), "en");
    expect(coachingB.nextGoal).toMatch(/^Fewer tacks/);
    expect(coachingB.nextGoal).toMatch(/The extra tacks cost about \d+ s\./);
    expect(coachingB.mistakes[0].titleRu).toBe("Too many tacks (16)");
    // Numbers on three inputs: the measured losses move with the cause.
    const loss = (from: number, to: number) => measureRaceLog({ samples: samples(100, stall(from, to)), events: [] }).noGoLossSec!;
    expect(loss(20, 25)).toBeLessThan(loss(20, 35));
    expect(loss(20, 35)).toBeLessThan(loss(20, 50));
    expect(loss(20, 50)).toBeCloseTo(30 * 0.9, 0);
  });

  it("never aims the next goal at an area a strength praises", () => {
    // A fast beat that drops to 3 kn for 3 s after each of 3 tacks: praised
    // close-hauled speed, yet about 3 s measured below 4.5 kn.
    const tacks: Event[] = [20, 50, 80].map((t) => ({ type: "tack", t }));
    const beat = (fast: number) => samples(100, (t) => ({ twa: Math.floor(t / 30) % 2 ? 45 : -45,
      speed: tacks.some((e) => t > e.t && t <= e.t + 3) ? 3 : fast }));
    for (const fast of [4.8, 5.5, 6.2]) {
      const c = analyseRaceLocally(log(beat(fast), tacks, 100, 1), "en");
      expect(c.strengths.join()).toMatch(/Good speed close-hauled/);
      expect(measureRaceLog({ samples: beat(fast), events: tacks }).slowCloseHauledLossSec).toBeGreaterThan(1);
      expect(c.nextGoal).not.toMatch(/Close-hauled speed/);
    }
    // Not praised (3.5 kn average, no mistake either): the measured loss leads the goal.
    expect(analyseRaceLocally(log(beat(3.6), tacks, 100, 1), "en").nextGoal).toMatch(/^Close-hauled speed: .* cost about \d+ s\./);
  });

  it("gives a race that did not finish no praise and no good score", () => {
    const s = samples(300, (t) => ({ twa: t % 60 < 30 ? 45 : -45, speed: 5.5 }));
    const dnf = analyseRaceLocally(log(s, [{ type: "tack", t: 30 }], null, 1), "en");
    expect(dnf.strengths).toEqual([]);
    expect(dnf.score).toBeLessThanOrEqual(30);
    expect(dnf.nextGoal).toMatch(/^Finish the course/);
    const finished = analyseRaceLocally(log(s, [{ type: "tack", t: 30 }], 290, 1), "en");
    expect(finished.strengths.length).toBeGreaterThan(0);
    expect(finished.score).toBeGreaterThanOrEqual(75);
  });

  it("spans whole-race mistakes over the race actually sailed, also to the time limit", () => {
    // TestFlight 72: a race that ran to the 5:00 limit showed "0:00-2:00".
    const slow = samples(300, () => ({ twa: 25, speed: 1.2 }));
    const dnf = analyseRaceLocally(log(slow, [], null, 3), "en");
    const wide = dnf.mistakes.filter((m) => m.timeStart === 0);
    expect(wide.length).toBeGreaterThan(0);
    for (const m of wide) expect(m.timeEnd).toBe(299.5);
    const done = analyseRaceLocally(log(slow, [], 250, 3), "en");
    for (const m of done.mistakes.filter((x) => x.timeStart === 0)) expect(m.timeEnd).toBe(250);
  });

  it("keeps the output shape in all seven languages", () => {
    const s = samples(100, (t) => t >= 20 && t < 50 ? { twa: 10, speed: 0.5 } : cleanBeat(t));
    for (const lang of ["ru", "en", "pl", "es", "fr", "de", "it"] as const) {
      const c = analyseRaceLocally(log(s, [{ type: "no-go-entered", t: 20 }, { type: "no-go-entered", t: 60 }]), lang);
      expect(c.nextGoal).toBe(c.nextGoalRu);
      expect(c.nextGoal).not.toMatch(/[\u2013\u2014]/);
      for (const m of c.mistakes) {
        expect(m.title).toBe(m.titleRu);
        expect(Object.keys(m).sort()).toEqual(["explanation", "explanationRu", "fix", "fixRu", "severity", "timeEnd", "timeStart", "title", "titleRu"]);
      }
    }
  });
});
