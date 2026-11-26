// Package 7 (audit K3), D1 contract: the course the race suggests to windward
// and the course its grade calls best are one number from one solver
// (upwind-vmg.ts) on the polar of the boat being sailed. The legacy race: the
// route hint, the skill bars and the coach on the classic race table. The
// trainer: the native close-hauled drills on the cruiser polar.

import { describe, expect, it } from "vitest";
import { bestVmg } from "./upwind-vmg";
import { planRaceGuidance } from "./race-guidance";
import { analyseRaceLocallyWithFocus, measureRaceLog } from "./fallback-coach";
import { measureRaceSkills } from "./race-skill-metrics";
import { calcTWA, makeStandardCourse, type RaceBoat } from "./race-physics";
import { polarFor, raceUpwind, targetSpeed } from "@/features/race-hud/target";
import { CRUISER_BOAT } from "./sailing-physics/boat";
import { solvePolarPoint } from "./sailing-physics/polar";
import { NO_GO_HALF_DEG } from "./sailing-physics/constants";
import { trainerCatalog } from "@/data/drills";

const course = makeStandardCourse();
const WINDS = [7.8, 12, 15.6]; // the solo race's light, medium and heavy (12 kn x 0.65 / 1 / 1.3)

/** A boat low on the beat, close-hauled on starboard, already started. */
const beating = (heading: number): RaceBoat => ({ id: "player", name: "You", color: "#0df", pos: { x: 420, y: 700 }, heading, speed: 5,
  lapDone: 0, started: true });

/** A steady beat logged the way the race logs it: samples every 0.5 s. */
function steadyBeat(twa: number, speedKn: number) {
  const samples = Array.from({ length: 120 }, (_, i) => ({ t: i * 0.5, x: 400, y: 900 - i * 2, heading: twa, twa, speed: speedKn, lap: 0 }));
  return { samples, events: [{ type: "start" as const, t: 0 }] };
}

describe("one VMG solver", () => {
  it("finds the optimum of a polar, both ways, deterministically", () => {
    // Speed rising to 6 kn at 90: VMG = s cos(a) peaks where tan(a) = s'/s.
    const speed = (a: number) => (a < 30 ? 0 : 6 * Math.sin(a * Math.PI / 180));
    const up = bestVmg(speed, 1);
    expect(up.twa).toBe(45);
    expect(up.vmgKn).toBeCloseTo(3, 2);
    expect(bestVmg(() => 5, -1)).toMatchObject({ twa: 180, vmgKn: 5 });
    expect(bestVmg(() => NaN, 1)).toMatchObject({ twa: 0, speedKn: 0, vmgKn: 0 });
  });

  for (const tws of WINDS) it(`legacy race at ${tws} kn: the hint beats at the angle the skill bars and the coach call best`, () => {
    const up = raceUpwind(tws), table = polarFor(tws);
    expect(up).toEqual(bestVmg((a) => targetSpeed(table, a), 1));
    // The route hint on the beat sails that angle, on the boat's tack.
    const hint = planRaceGuidance(beating(45), course, 0, null, up.twa).guidance!;
    expect(hint.beating).toBe(true);
    expect(Math.abs(calcTWA(hint.suggestedHeading, 0))).toBeCloseTo(up.twa, 6);
    // The skill bars' best VMG is the same optimum: a beat sailed exactly on
    // the hint at the target speed is graded 100 %, the old 45 deg less.
    const skills = (twa: number) => measureRaceSkills({ ...steadyBeat(twa, targetSpeed(table, twa)), targetKn: (a) => targetSpeed(table, a),
      course: { windwardMark: { x: 400, y: 100 }, startLine: course.startLine }, startedAt: 0 }).upwind!;
    expect(skills(up.twa).bestKn).toBeCloseTo(up.vmgKn, 9);
    expect(skills(up.twa).ratio).toBeCloseTo(1, 6);
    if (up.twa !== 45) expect(skills(45).ratio).toBeLessThan(1);
    // The coach grades the same beat against the same optimum: no slow
    // close-hauled mistake, the close-hauled praise, a VMG ratio of 1.
    const log = { difficulty: "easy", courseInfo: { windDirection: 0, windwardMark: { x: 400, y: 100 }, startY: course.startLine.a.y },
      finishTime: 90, position: 1, totalBoats: 3, ...steadyBeat(up.twa, up.speedKn), upwindTarget: up };
    expect(measureRaceLog(log).closeHauledVmgRatio).toBeCloseTo(1, 6);
    const { coaching } = analyseRaceLocallyWithFocus(log, "en");
    expect(coaching.mistakes.map((m) => m.kind)).not.toContain("close-hauled");
    expect(coaching.strengths.join(" ")).toContain("Good speed close-hauled");
  });

  it("the hint without the solver angle is the planner's own (legacy behaviour unchanged)", () => {
    const own = planRaceGuidance(beating(45), course, 0).guidance!;
    expect(Math.abs(calcTWA(own.suggestedHeading, 0))).toBeCloseTo(45, 6);
  });

  it("the coach calls a beat that pinches far above the optimum slow, at the speed the polar gives there", () => {
    const up = raceUpwind(12), table = polarFor(12), twa = up.twa - 8;
    const log = { difficulty: "easy", courseInfo: { windDirection: 0, windwardMark: { x: 400, y: 100 }, startY: course.startLine.a.y },
      finishTime: 90, position: 2, totalBoats: 3, ...steadyBeat(twa, 0.6 * targetSpeed(table, twa)), upwindTarget: up };
    expect(measureRaceLog(log).closeHauledVmgRatio!).toBeLessThan(0.75);
    expect(analyseRaceLocallyWithFocus(log, "en").coaching.mistakes.map((m) => m.kind)).toContain("close-hauled");
  });

  it("trainer: the cruiser's best upwind VMG in 6 and 12 kn lies in the native close-hauled drill windows", () => {
    // The solver on the boat the trainer sails (CRUISER_BOAT, ADR-0021): whole
    // degrees 36..55 (outside them the cruiser's VMG is lower, cruiser.test.ts).
    const speedAt = (tws: number) => (a: number) => (a < 36 || a > 55 ? 0 : solvePolarPoint(a, tws, 0, CRUISER_BOAT).speed);
    for (const id of ["twa45", "shiftReact"]) {
      const p = trainerCatalog.find((e) => e.id === id)!.params!;
      expect(p.twaMinDeg).toBe(NO_GO_HALF_DEG);
      for (const tws of [6, 12]) {
        const best = bestVmg(speedAt(tws), 1).twa;
        expect(best, `${id} at ${tws} kn`).toBeGreaterThanOrEqual(p.twaMinDeg);
        expect(best, `${id} at ${tws} kn`).toBeLessThanOrEqual(p.twaMaxDeg);
      }
    }
    expect(trainerCatalog.find((e) => e.id === "noGo")!.params!.minTwaDeg).toBe(NO_GO_HALF_DEG);
  }, 30_000);
});
