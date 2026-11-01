import { describe, expect, it } from "vitest";
import { measureRaceSkills, raceSkillBars, SKILL_BAR_SCALE, SKILL_WINDOWS, type RaceSkillInput, type SkillBar, type SkillBarId } from "./race-skill-metrics";
import { classifyManoeuvre, createManoeuvreState, inNoGoZone } from "./race-manoeuvres";
import { calcTWA, makeStandardCourse, UNITS_PER_KNOT_SECOND } from "./race-physics";
import { polarFor, targetSpeed } from "@/features/race-hud/target";

// Synthetic solo races on the standard course, wind from north, logged the
// way the race loop logs them: a sample every 0.5 s (rounded like
// recordSample), tacks from the shared classifier, no-go entries on the
// rising edge of inNoGoZone, mark-rounded and finish events. The target is
// the HUD polar at 12 kn (wind "medium").

const course = makeStandardCourse();
const mark = course.marks[0].pos;
const lineY = course.startLine.a.y;
const table = polarFor(12);
const target = (a: number) => targetSpeed(table, a);
const BEAT = 0.97 * target(45);
const RUN = 0.95 * target(180);
const DT = 0.1;

interface Plan {
  /** Seconds in irons below the line after the gun before sailing off. */
  lateSec: number;
  /** Tack at least this often on the beat (Infinity: only on the layline). */
  tackEverySec: number;
  /** Speed dip through a tack, knots. */
  tackDipKn: number;
  /** Seconds in irons in the middle of the beat (0: none). */
  midIronsSec: number;
  /** Rounding speed, knots. */
  roundKn: number;
}
const CLEAN: Plan = { lateSec: 0, tackEverySec: Infinity, tackDipKn: 0.5, midIronsSec: 0, roundKn: 5 };

const relToWind = (bearing: number) => calcTWA(bearing, 0);
const bearingTo = (p: { x: number; y: number }, q: { x: number; y: number }) => (Math.atan2(q.x - p.x, -(q.y - p.y)) * 180 / Math.PI + 360) % 360;

function sail(plan: Plan): RaceSkillInput {
  const samples: RaceSkillInput["samples"][number][] = [];
  const events: RaceSkillInput["events"][number][] = [{ type: "start", t: 0 }];
  const pos = { x: 400, y: lineY + 30 };
  let heading = 45, speed = BEAT, lap = 0, t = 0, startedAt: number | null = null;
  let phase: "irons" | "beat" | "tack" | "mid-irons" | "round" | "run" = plan.lateSec > 0 ? "irons" : "beat";
  let phaseT = 0, lastTack = 0, tackFrom = 45, midDone = plan.midIronsSec === 0, resume = 45, wasNoGo = false, nextSample = 0;
  let manoeuvres = createManoeuvreState(1);
  while (t < 400) {
    // Steering and speed by phase.
    if (phase === "irons") { heading = 0; speed = 0.1; if (t >= plan.lateSec) { phase = "beat"; heading = 45; speed = BEAT; } }
    else if (phase === "beat") {
      speed = BEAT;
      const side = calcTWA(heading, 0) > 0 ? 1 : -1;
      const rel = relToWind(bearingTo(pos, mark));
      const far = Math.hypot(pos.x - mark.x, pos.y - mark.y);
      if (far < 40 || pos.y < mark.y) { phase = "round"; phaseT = t; tackFrom = heading; }
      else if (!midDone && startedAt !== null && t > startedAt + 8) { phase = "mid-irons"; phaseT = t; resume = heading; midDone = true; }
      else if ((side * rel <= -46 && t - lastTack > 4) || (t - lastTack >= plan.tackEverySec && far > 60)) { phase = "tack"; phaseT = t; tackFrom = heading; }
    } else if (phase === "tack") {
      const p = (t - phaseT) / 2.2; // a 90 degree tack in 2.2 s, then 3 s to pick up again
      const to = tackFrom === 45 ? -45 : 45;
      const fromTwa = tackFrom === 45 ? 45 : -45;
      heading = (fromTwa + (to - fromTwa) * Math.min(1, p) + 360) % 360;
      speed = BEAT - plan.tackDipKn * (p <= 1 ? p : Math.max(0, 1 - (p - 1) * 2.2 / 3));
      if (p >= 1 + 3 / 2.2) { phase = "beat"; heading = to === 45 ? 45 : 315; lastTack = t; }
    } else if (phase === "mid-irons") { heading = 0; speed = 1.2; if (t - phaseT >= plan.midIronsSec) { phase = "beat"; heading = resume; } }
    else if (phase === "round") {
      const p = Math.min(1, (t - phaseT) / 4);
      const from = tackFrom === 45 ? 45 : -45; // via east or via west to dead downwind
      heading = ((from + ((from > 0 ? 180 : -180) - from) * p) + 360) % 360;
      speed = plan.roundKn;
      if (p >= 1) { phase = "run"; lap = 1; events.push({ type: "mark-rounded", t }); }
    } else { heading = 180; speed = RUN; }

    const prevY = pos.y;
    const r = heading * Math.PI / 180;
    pos.x += Math.sin(r) * speed * UNITS_PER_KNOT_SECOND * DT;
    pos.y -= Math.cos(r) * speed * UNITS_PER_KNOT_SECOND * DT;
    t = Math.round((t + DT) * 10) / 10;
    if (startedAt === null && prevY >= lineY && pos.y < lineY) startedAt = t;
    const twa = calcTWA(heading, 0);
    const noGo = inNoGoZone(twa, speed);
    if (noGo && !wasNoGo) events.push({ type: "no-go-entered", t });
    wasNoGo = noGo;
    const c = classifyManoeuvre(manoeuvres, { twa, speedKn: speed, pinned: false });
    manoeuvres = c.state;
    if (c.manoeuvre) events.push({ type: c.manoeuvre, t });
    if (t >= nextSample - 1e-9) {
      samples.push({ t, x: Math.round(pos.x), y: Math.round(pos.y), heading: Math.round(heading), twa: Math.round(twa), speed: Math.round(speed * 10) / 10, lap, windDir: 0 });
      nextSample += 0.5;
    }
    if (lap === 1 && pos.y >= lineY) { events.push({ type: "finish", t }); break; }
  }
  return { samples, events, course: { windwardMark: mark, startLine: course.startLine }, targetKn: target, startedAt };
}

const bar = (bars: SkillBar[], id: SkillBarId) => {
  const found = bars.find((b) => b.id === id);
  if (!found) throw new Error(`no ${id} bar`);
  return found;
};

const clean = sail(CLEAN);
const manyTacks = sail({ ...CLEAN, tackEverySec: 2, tackDipKn: 1.8 });
const lateNoGo = sail({ ...CLEAN, lateSec: 15, midIronsSec: 20 });
const lateOnly = sail({ ...CLEAN, lateSec: 15 });
const m = { clean: measureRaceSkills(clean), manyTacks: measureRaceSkills(manyTacks), lateNoGo: measureRaceSkills(lateNoGo), lateOnly: measureRaceSkills(lateOnly) };
const bars = { clean: raceSkillBars(m.clean), manyTacks: raceSkillBars(m.manyTacks), lateNoGo: raceSkillBars(m.lateNoGo), lateOnly: raceSkillBars(m.lateOnly) };

describe("race skill metrics (M4-1) on three synthetic races", () => {
  it("the synthetic races finish and log what the race loop logs", () => {
    for (const race of [clean, manyTacks, lateNoGo, lateOnly]) {
      expect(race.events.some((e) => e.type === "mark-rounded")).toBe(true);
      expect(race.events.some((e) => e.type === "finish")).toBe(true);
      expect(race.startedAt).not.toBeNull();
    }
    expect(clean.events.filter((e) => e.type === "tack")).toHaveLength(1);
    expect(manyTacks.events.filter((e) => e.type === "tack").length).toBeGreaterThanOrEqual(4);
    expect(lateNoGo.events.filter((e) => e.type === "no-go-entered").length).toBeGreaterThanOrEqual(2);
  });

  it("a clean race: on time, near the best VMG, a cheap 90 degree tack, no no-go time; every bar good", () => {
    const c = m.clean;
    expect(c.start.lateSec!).toBeLessThan(2);
    expect(c.upwind!.ratio).toBeGreaterThan(0.85);
    expect(c.upwind!.ratio).toBeLessThanOrEqual(1);
    expect(c.tacks.count).toBe(1);
    expect(c.tacks.avgAngleDeg!).toBeGreaterThan(80);
    expect(c.tacks.avgAngleDeg!).toBeLessThan(100);
    expect(c.tacks.avgSpeedLossKn!).toBeGreaterThan(0.3);
    expect(c.tacks.avgSpeedLossKn!).toBeLessThan(0.7);
    expect(c.noGo.seconds).toBe(0);
    expect(c.downwind!.ratio).toBeGreaterThan(0.9);
    expect(bars.clean.map((b) => b.id)).toEqual(["start", "upwind", "tacks", "no-go"]);
    expect(bars.clean.every((b) => b.good)).toBe(true);
  });

  it("many sloppy tacks: the tack bar and the upwind bar drop, the start and no-go bars do not", () => {
    const c = m.manyTacks;
    expect(c.tacks.count).toBeGreaterThanOrEqual(4);
    expect(c.tacks.avgSpeedLossKn!).toBeGreaterThan(1.4);
    expect(bar(bars.manyTacks, "tacks").fill).toBeLessThan(bar(bars.clean, "tacks").fill - 0.3);
    expect(bar(bars.manyTacks, "tacks").good).toBe(false);
    expect(c.upwind!.ratio).toBeLessThan(m.clean.upwind!.ratio - 0.03);
    expect(bar(bars.manyTacks, "upwind").fill).toBeLessThan(bar(bars.clean, "upwind").fill);
    expect(bar(bars.manyTacks, "start").fill).toBeCloseTo(bar(bars.clean, "start").fill, 5);
    expect(bar(bars.manyTacks, "no-go").fill).toBe(1);
  });

  it("a late start with time in irons: the start, no-go and upwind bars drop, the tack bar does not", () => {
    const c = m.lateNoGo;
    expect(c.start.lateSec!).toBeGreaterThan(14);
    expect(bar(bars.lateNoGo, "start").fill).toBeLessThan(0.4);
    expect(bar(bars.lateNoGo, "start").good).toBe(false);
    // 15 s before the start and 20 s mid-beat, both in irons.
    expect(c.noGo.seconds).toBeGreaterThan(30);
    expect(c.noGo.entries).toBe(2);
    expect(bar(bars.lateNoGo, "no-go").fill).toBe(0);
    expect(bar(bars.lateNoGo, "no-go").good).toBe(false);
    expect(c.upwind!.ratio).toBeLessThan(m.clean.upwind!.ratio - 0.1);
    expect(bar(bars.lateNoGo, "upwind").good).toBe(false);
    expect(bar(bars.lateNoGo, "tacks").fill).toBeCloseTo(bar(bars.clean, "tacks").fill, 1);
  });

  it("a late start alone lowers the start bar and leaves the upwind and tack bars as in the clean race", () => {
    const c = m.lateOnly;
    expect(c.start.lateSec!).toBeGreaterThan(14);
    expect(bar(bars.lateOnly, "start").good).toBe(false);
    // The time waiting below the line before the crossing is not upwind sailing.
    expect(c.upwind!.ratio).toBeCloseTo(m.clean.upwind!.ratio, 2);
    expect(bar(bars.lateOnly, "upwind").good).toBe(true);
    expect(c.tacks.count).toBe(m.clean.tacks.count);
    expect(bar(bars.lateOnly, "tacks").fill).toBeCloseTo(bar(bars.clean, "tacks").fill, 2);
  });

  it("the last seconds before the mark rounding are not upwind sailing", () => {
    const roundedAt = clean.events.find((e) => e.type === "mark-rounded")!.t;
    const lastSeconds = (s: { t: number; x: number; y: number }) => s.t >= roundedAt - SKILL_WINDOWS.roundingSec && s.t < roundedAt
      && Math.hypot(s.x - mark.x, s.y - mark.y) > SKILL_WINDOWS.markZone;
    expect(clean.samples.some(lastSeconds)).toBe(true);
    const stalled = measureRaceSkills({ ...clean, samples: clean.samples.map((s) => lastSeconds(s) ? { ...s, speed: 0 } : s) });
    expect(stalled.upwind!.ratio).toBeCloseTo(m.clean.upwind!.ratio, 6);
  });

  it("a tack's angle is the sum of the two close-hauled angles either side of it", () => {
    const angleOf = (twa: number) => {
      const samples = Array.from({ length: 41 }, (_, i) => {
        const t = 20 + i * 0.5;
        return { t, x: 400, y: 900, heading: 0, twa: t < 30 ? -twa : twa, speed: 6, lap: 0 };
      });
      return measureRaceSkills({ ...clean, samples, events: [{ type: "tack", t: 30 }], startedAt: 0 }).tacks.avgAngleDeg;
    };
    expect(angleOf(50)).toBeCloseTo(100, 6);
    expect(angleOf(40)).toBeCloseTo(80, 6);
  });

  it("finds the start crossing in the samples when the loop did not hand it over", () => {
    const fromSamples = measureRaceSkills({ ...lateNoGo, startedAt: null });
    expect(fromSamples.start.lateSec!).toBeCloseTo(m.lateNoGo.start.lateSec!, 0);
  });

  it("a slow rounding shows as more time below the target at the mark", () => {
    const slow = measureRaceSkills(sail({ ...CLEAN, roundKn: 1.5 }));
    expect(slow.mark!.belowTargetSec).toBeGreaterThan(m.clean.mark!.belowTargetSec + 2);
  });

  it("never claims a layline number: the race does not measure one", () => {
    for (const metrics of Object.values(m)) expect(metrics.laylineOverstandSec).toBeNull();
  });

  it("leaves out bars without data", () => {
    const noTacks = measureRaceSkills({ ...clean, events: clean.events.filter((e) => e.type !== "tack") });
    expect(raceSkillBars(noTacks).map((b) => b.id)).toEqual(["start", "upwind", "no-go"]);
    const empty = measureRaceSkills({ ...clean, samples: [], events: [], startedAt: null });
    expect(raceSkillBars(empty)).toEqual([]);
  });

  it("a tack's speed loss is read over the live tack cue's windows: 3 s before, 1 s before to 4 s after", () => {
    const speedAt = (t: number) => t === 26 ? 7 : t === 31 ? 5.5 : t === 34.5 ? 5 : 6;
    const samples = Array.from({ length: 41 }, (_, i) => {
      const t = 20 + i * 0.5;
      return { t, x: 400, y: 900, heading: 0, twa: t < 30 ? -45 : 45, speed: speedAt(t), lap: 0 };
    });
    // 7 kn 4 s before and 5 kn 4.5 s after lie outside the cue's windows.
    const tack = measureRaceSkills({ ...clean, samples, events: [{ type: "tack", t: 30 }], startedAt: 0 }).tacks.list[0];
    expect(tack.speedLossKn).toBeCloseTo(0.5, 6);
  });

  it("never shows more than 100% of the best upwind VMG", () => {
    // A gust or the way carried through a wind shift can lift a beat above
    // the mean-wind target; the share shown stops at the target.
    const above = { ...m.clean, upwind: { ...m.clean.upwind!, ratio: 1.03 } };
    const upwind = bar(raceSkillBars(above), "upwind");
    expect(upwind.value).toBe(1);
    expect(upwind.fill).toBe(1);
    expect(upwind.good).toBe(true);
  });

  it("the bar scales stay ordered", () => {
    const s = SKILL_BAR_SCALE;
    expect(s.start.fullSec).toBeLessThan(s.start.goodSec);
    expect(s.start.goodSec).toBeLessThan(s.start.emptySec);
    expect(s.tacks.goodKn).toBeLessThan(s.tacks.emptyKn);
    expect(s.noGo.goodSec).toBeLessThan(s.noGo.emptySec);
  });
});
