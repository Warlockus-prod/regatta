// Package 13 (ADR-0022), cross-cutting check: the bot levels against a player
// who sails with BEST VMG and the turn button, in the legacy race the levels
// are tuned for. The driver does what a player with the new controls does:
// BEST VMG on, the turn button when the mark is past the layline (tack on the
// beat, gybe on the run), and the arrows for the start and round the mark
// (there the driver steers the bots' own rounding course). The assist is
// the real controller (src/lib/helm-assist.ts) on the race's own polar, its
// heading goes through the player's heading hold (angle / 12) and the
// responsive steering, the bots sail their unchanged planner at the seeded
// level speeds. It never moves a boat, rounds a gate or caps a speed itself.
//
// Measured 2026-11-02, seeds 1 / 7 / 42 (finish s, place of 1 + bots):
// - easy and medium: the assisted player wins every race (light 112.6 s,
//   medium 76.3 s, heavy 60.3 s), 2-5 % faster than following the hint
//   (117.7 / 78.5 / 63.6 s); so does the hint follower. The best bot is 19-114 %
//   slower.
// - hard: medium wind 1st (76.3 against 83.4 s); heavy 1st, 1st, 3rd (a start
//   jostle on seed 42, 80.4 s); light wind 2nd of 5 every time (138-144 s
//   against the best bot's 123 s). The hard level keeps its teeth in light air.
// BEST VMG costs gold (R-8), so this moves no medal. The times are pinned
// loosely below, so a planner or physics change that moves them shows up.

import { describe, expect, it } from "vitest";
import { DIFFICULTY_CONFIG, type Difficulty } from "@/data/race-difficulty";
import { angleDiff, bearing, calcTWA, raceAutopilotTurn, resolveCollisions, stepBoat, updateLap, type RaceBoat } from "@/lib/race-physics";
import { legacyRaceSpawns, raceBotSpeedMul } from "@/lib/race-spawn";
import { soloRaceWind } from "@/lib/race-solo-wind";
import { helmProfileFor, raceUpwind } from "@/features/race-hud/target";
import { createHelmAssist, helmTurnToward, requestHelmTurn, setHelmHold, stepHelmAssist } from "@/lib/helm-assist";
import { makeCourse, planRouteGuidance, type RouteGuidanceState } from "./race-model";

type Sailed = RaceBoat & { speedMul: number };

function seeded(seed: number): () => number {
  let x = seed >>> 0;
  return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 2 ** 32; };
}

const WIND = { light: 0.65, medium: 1, heavy: 1.3 } as const;
const SEEDS = [1, 7, 42] as const;

interface Outcome { player: number; place: number; boats: number; buttonTurns: number; bestVmgSec: number; bestBot: number }

/** One solo race; `assisted` sails BEST VMG and the button, otherwise the hint (the package 7 driver). */
function sailRace(difficulty: Difficulty, windMul: number, seed: number, assisted: boolean): Outcome {
  const cfg = DIFFICULTY_CONFIG[difficulty];
  const course = makeCourse();
  const spawns = legacyRaceSpawns(course, cfg.opponents);
  const random = seeded(seed);
  const boats: Sailed[] = spawns.map((s, i) => ({
    id: i ? `ai${i - 1}` : "player", name: i ? `Bot ${i}` : "You", color: "#888", pos: { ...s.pos }, heading: s.heading,
    speed: 0, lapDone: 0, isPlayer: i === 0, speedMul: i ? raceBotSpeedMul(cfg.aiSpeedMul, random) : 1,
  }));
  const player = boats[0];
  const profile = helmProfileFor(12 * windMul, "classic");
  const dt = 1 / 30;
  let memory: RouteGuidanceState | null = null, hint = player.heading, rounding = true;
  let helm = setHelmHold(createHelmAssist(), "vmg", calcTWA(player.heading, 0));
  let course_: number | null = null;
  for (let i = 0; i < 30 * 600 && boats.some((b) => b.lapDone < 2); i++) {
    const t = i * dt, wind = soloRaceWind(t);
    if (i % 3 === 0 && player.lapDone < 2) {
      const advice = planRouteGuidance(player, course, wind.dir, memory, null, raceUpwind(12 * windMul).twa);
      memory = advice.state;
      if (advice.guidance) hint = advice.guidance.suggestedHeading;
    }
    let target = hint, manual: number | null = null;
    // The start and the rounding (within 160 units of the windward mark) are sailed by hand.
    rounding = !player.started || (player.lapDone === 0 && Math.hypot(player.pos.x - course.marks[0].pos.x, player.pos.y - course.marks[0].pos.y) < 160);
    if (assisted && player.lapDone < 2) {
      const mark = player.lapDone >= 1
        ? { x: (course.finishLine.a.x + course.finishLine.b.x) / 2, y: (course.finishLine.a.y + course.finishLine.b.y) / 2 } : course.marks[0].pos;
      const markTwa = calcTWA(bearing(player.pos, mark), wind.dir), twa = calcTWA(player.heading, wind.dir);
      if (rounding) {
        // The arrows: BEST VMG goes off and the player steers the bots' own course.
        manual = raceAutopilotTurn(player, course, wind.dir); course_ = null;
        if (helm.hold === "vmg" || helm.turn) helm = { ...setHelmHold(helm, "off", twa), turn: null };
      } else {
        if (helm.hold !== "vmg" && !helm.turn) { helm = setHelmHold(helm, "vmg", twa); course_ = null; }
        const up = player.lapDone === 0;
        const past = Math.sign(markTwa) !== Math.sign(twa) && (up ? Math.abs(markTwa) >= profile.angles.upwind.twa + 3 : Math.abs(markTwa) <= profile.angles.downwind.twa - 3);
        if (past && !helm.turn) helm = requestHelmTurn(helm, { twa, courseHold: course_, profile });
      }
      if (manual === null) {
        const r = stepHelmAssist(helm, { dt, heading: player.heading, windDir: wind.dir, speedKn: player.speed, manual: 0, arrows: 0, nudgeDeg: 0,
          courseHold: course_, markTwa, profile });
        helm = r.state; course_ = r.courseHold;
        if (r.heading !== null) target = r.heading;
      }
    }
    const previous = new Map(boats.map((b) => [b.id, { ...b.pos }]));
    for (const b of boats) {
      if (b.lapDone === 2) continue;
      const turn = b.isPlayer ? (assisted ? manual ?? helmTurnToward(b.heading, target) : Math.max(-1, Math.min(1, angleDiff(b.heading, target) / 12)))
        : raceAutopilotTurn(b, course, wind.dir);
      stepBoat(b, dt, wind.dir, wind.gust, b.isPlayer ? { turn, autoTrim: true } : { turn },
        { windStrengthMul: windMul, speedMul: b.speedMul, steering: b.isPlayer ? "responsive" : "legacy" });
    }
    resolveCollisions(boats, dt);
    for (const b of boats) updateLap(b, previous.get(b.id)!, course, (i + 1) * dt);
  }
  const time = (b: RaceBoat) => b.lapDone === 2 && Number.isFinite(b.finishTime) ? b.finishTime! : Infinity;
  const mine = time(player), bots = boats.slice(1).map(time);
  return { player: mine, place: 1 + bots.filter((t) => t < mine).length, boats: boats.length, buttonTurns: helm.usage.buttonTurns,
    bestVmgSec: helm.usage.bestVmgSec, bestBot: Math.min(...bots) };
}

describe("bot levels against BEST VMG and the turn button (package 13)", () => {
  const table: string[] = [];
  for (const difficulty of ["easy", "medium", "hard"] as const) {
    it(`${difficulty}: the assisted player finishes every race; places reported`, () => {
      for (const [wind, mul] of Object.entries(WIND)) for (const seed of SEEDS) {
        const assisted = sailRace(difficulty, mul, seed, true);
        const hinted = sailRace(difficulty, mul, seed, false);
        table.push(`${difficulty} ${wind} s${seed}: BEST VMG ${assisted.player.toFixed(1)} s place ${assisted.place}/${assisted.boats} (turns ${assisted.buttonTurns}, VMG ${assisted.bestVmgSec.toFixed(0)} s); hint ${hinted.player.toFixed(1)} s place ${hinted.place}/${hinted.boats}; best bot ${assisted.bestBot.toFixed(1)} s`);
        expect(assisted.player, `${difficulty} ${wind} ${seed}`).toBeLessThan(Infinity);
        expect(assisted.buttonTurns).toBeGreaterThanOrEqual(1);
        expect(assisted.bestVmgSec).toBeGreaterThan(10);
      }
      if (process.env.HELM_LEVELS) console.log(`[helm-assist bot levels]\n${table.join("\n")}`);
    }, 120_000);
  }

  it("pins the measured times and the hard level in light air", () => {
    for (const [mul, seconds] of [[WIND.light, 112.6], [WIND.medium, 76.3], [WIND.heavy, 60.3]] as const) {
      expect(Math.abs(sailRace("medium", mul, 1, true).player - seconds)).toBeLessThan(3);
    }
    for (const seed of SEEDS) expect(sailRace("hard", WIND.light, seed, true).place).toBeGreaterThanOrEqual(2);
  }, 60_000);

  it("on the easy level the assisted player beats at least one bot in every wind", () => {
    for (const mul of Object.values(WIND)) {
      const r = sailRace("easy", mul, 1, true);
      expect(r.place).toBeLessThan(r.boats);
    }
  }, 60_000);
});
