import { describe, expect, it } from "vitest";
import { coachLuffing, createSilentTargets, mapRaceSoundscape, raceSoundscapeLive, RACE_SOUNDSCAPE, type RaceSoundscapeInput } from "./race-soundscape";

// Contract (M3-2, ADR-0019): what the boat does -> how loud and how bright the
// race sound is. More apparent wind never gives a quieter or darker wind bed,
// more boat speed never a quieter water rush; the sails flog in the no-go zone
// (both modes) and on a luff only in Pro; paused, muted or no reading is silence.

const base: RaceSoundscapeInput = { apparentWindKn: 0, boatSpeedKn: 0, heelDeg: 0, luffing: false, inIrons: false, mode: "simple", paused: false, muted: false };
const map = (patch: Partial<RaceSoundscapeInput>) => mapRaceSoundscape({ ...base, ...patch });

describe("race soundscape mapping on three inputs", () => {
  const calm = map({ apparentWindKn: 3, boatSpeedKn: 0.6, heelDeg: 2 });
  const upwind = map({ apparentWindKn: 18, boatSpeedKn: 6.5, heelDeg: -18 });
  const irons = map({ apparentWindKn: 14, boatSpeedKn: 0.3, heelDeg: 1, inIrons: true });

  it("calm drift: a soft wind bed, a faint water rush, rare slaps, no flogging", () => {
    expect(calm.silent).toBe(false);
    expect(calm.windGain).toBeCloseTo(0.0425, 4);
    expect(calm.windFilterHz).toBeCloseTo(470, 0);
    expect(calm.waterGain).toBeCloseTo(0.0156, 4);
    expect(calm.slapRateHz).toBeGreaterThan(0);
    expect(calm.slapRateHz).toBeLessThan(0.5);
    expect(calm.flogRateHz).toBe(0);
    expect(calm.flogGain).toBe(0);
  });

  it("upwind in a breeze: louder and brighter wind, a real water rush, slaps about once a second, no flogging", () => {
    expect(upwind.windGain).toBeCloseTo(0.155, 3);
    expect(upwind.windFilterHz).toBeCloseTo(920, 0);
    expect(upwind.waterGain).toBeCloseTo(0.169, 3);
    expect(upwind.waterFilterHz).toBeCloseTo(617.5, 1);
    // Heel to port counts like heel to starboard.
    expect(upwind.slapRateHz).toBeCloseTo(1.22, 2);
    expect(upwind.slapGain).toBeCloseTo(0.122, 3);
    expect(upwind.flogGain).toBe(0);
    expect(upwind.windGain).toBeGreaterThan(calm.windGain * 3);
    expect(upwind.waterGain).toBeGreaterThan(calm.waterGain * 10);
  });

  it("in irons: the sails flog fast and loud, the hull barely slaps", () => {
    expect(irons.flogRateHz).toBeCloseTo(6.5, 2);
    expect(irons.flogGain).toBeCloseTo(0.152, 3);
    expect(irons.slapRateHz).toBe(0);
    expect(irons.waterGain).toBeLessThan(0.01);
    expect(irons.windGain).toBeCloseTo(0.125, 3);
  });

  it("flogs in irons in both modes, on a luff only in Pro and softer than in irons", () => {
    expect(map({ apparentWindKn: 14, inIrons: true, mode: "pro" }).flogGain).toBeCloseTo(irons.flogGain, 6);
    expect(map({ apparentWindKn: 14, boatSpeedKn: 5, luffing: true, mode: "simple" }).flogGain).toBe(0);
    const luff = map({ apparentWindKn: 14, boatSpeedKn: 5, luffing: true, mode: "pro" });
    expect(luff.flogRateHz).toBeGreaterThan(0);
    expect(luff.flogGain).toBeCloseTo(irons.flogGain * RACE_SOUNDSCAPE.flog.luffShare, 6);
    // No wind, nothing to flog.
    expect(map({ apparentWindKn: 0.5, inIrons: true }).flogGain).toBe(0);
  });
});

describe("race soundscape monotonicity", () => {
  it("more apparent wind is never a quieter or darker wind bed, nor a slower or quieter flog", () => {
    let prev = map({ apparentWindKn: 0, boatSpeedKn: 4, heelDeg: 10, inIrons: true });
    for (let aws = 0.25; aws <= 60; aws += 0.25) {
      const next = map({ apparentWindKn: aws, boatSpeedKn: 4, heelDeg: 10, inIrons: true });
      expect(next.windGain, `wind ${aws}`).toBeGreaterThanOrEqual(prev.windGain);
      expect(next.windFilterHz, `filter ${aws}`).toBeGreaterThanOrEqual(prev.windFilterHz);
      expect(next.flogGain, `flog ${aws}`).toBeGreaterThanOrEqual(prev.flogGain);
      expect(next.flogRateHz, `flog rate ${aws}`).toBeGreaterThanOrEqual(prev.flogRateHz);
      prev = next;
    }
    expect(prev.windGain).toBe(RACE_SOUNDSCAPE.wind.max);
  });

  it("more boat speed is never a quieter water rush nor fewer or softer slaps; more heel never fewer slaps", () => {
    let prev = map({ apparentWindKn: 12, boatSpeedKn: 0, heelDeg: 8 });
    for (let kn = 0.1; kn <= 20; kn += 0.1) {
      const next = map({ apparentWindKn: 12, boatSpeedKn: kn, heelDeg: 8 });
      expect(next.waterGain, `water ${kn}`).toBeGreaterThanOrEqual(prev.waterGain);
      expect(next.waterFilterHz, `water filter ${kn}`).toBeGreaterThanOrEqual(prev.waterFilterHz);
      expect(next.slapRateHz, `slaps ${kn}`).toBeGreaterThanOrEqual(prev.slapRateHz);
      expect(next.slapGain, `slap gain ${kn}`).toBeGreaterThanOrEqual(prev.slapGain);
      prev = next;
    }
    let heel = map({ apparentWindKn: 12, boatSpeedKn: 5, heelDeg: 0 });
    for (let deg = 1; deg <= 90; deg += 1) {
      const next = map({ apparentWindKn: 12, boatSpeedKn: 5, heelDeg: deg });
      expect(next.slapRateHz, `heel ${deg}`).toBeGreaterThanOrEqual(heel.slapRateHz);
      heel = next;
    }
  });
});

describe("race soundscape silence", () => {
  const loud: Partial<RaceSoundscapeInput> = { apparentWindKn: 25, boatSpeedKn: 7, heelDeg: 25, inIrons: true };
  const silentTargets = createSilentTargets();

  it("is silent when paused or muted", () => {
    for (const patch of [{ paused: true }, { muted: true }]) {
      const t = map({ ...loud, ...patch });
      expect(t).toEqual(silentTargets);
      expect(t.silent).toBe(true);
    }
  });

  it("is silent when a reading is not a number", () => {
    for (const patch of [{ apparentWindKn: NaN }, { boatSpeedKn: Infinity }, { heelDeg: NaN }]) expect(map({ ...loud, ...patch }).silent).toBe(true);
  });

  it("fills and returns the caller's target object, so the race loop allocates nothing per tick", () => {
    const out = createSilentTargets();
    const input = { ...base, ...loud };
    expect(mapRaceSoundscape(input, out)).toBe(out);
    expect(out.silent).toBe(false);
    input.paused = true;
    expect(mapRaceSoundscape(input, out)).toBe(out);
    expect(out).toEqual(silentTargets);
  });

  it("reads a luff from the trim coach keys only", () => {
    expect(["luffMain", "luffJib", "luffBoth"].every(k => coachLuffing(k as never))).toBe(true);
    expect(["inIrons", "good", "stallMain", "pinching", "run"].some(k => coachLuffing(k as never))).toBe(false);
    expect(coachLuffing(null)).toBe(false);
  });
});

describe("race soundscape phases", () => {
  it("sounds only while the boat is raced, not paused and with sound on", () => {
    expect(raceSoundscapeLive("countdown", false, true)).toBe(true);
    expect(raceSoundscapeLive("racing", false, true)).toBe(true);
    // Results (the end of the finish hold), replay, menu and briefing are silent.
    for (const phase of ["finished", "replay", "menu", "briefing"]) expect(raceSoundscapeLive(phase, false, true), phase).toBe(false);
    expect(raceSoundscapeLive("racing", true, true)).toBe(false);
    expect(raceSoundscapeLive("racing", false, false)).toBe(false);
  });
});
