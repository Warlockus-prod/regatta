import { describe, expect, it } from "vitest";
import { MANOEUVRES, manoeuvreById, type ManoeuvreExercise } from "@/data/manoeuvres";
import { angleDiff, clearance, createHarbourState, hullWorld, KNOT, OUR_YACHT } from "@/lib/harbour-physics";
import { castOff, createRun, scoreRun, stepRun, stepSeconds, targetDistance, type RunInput, type RunState } from "./runner";
import { isUnlocked, nextExercise, parseProgress, recordStars } from "./progress";

const clampHelm = (v: number) => Math.max(-1, Math.min(1, v));
function drive(exercise: ManoeuvreExercise, pilot: (run: RunState) => RunInput, run = createRun(exercise)) {
  const steps = Math.ceil(exercise.criteria.timeLimit / stepSeconds(exercise)) + 2;
  for (let i = 0; i < steps && run.status === "running"; i++) run = stepRun(exercise, run, pilot(run));
  return run;
}
// Built from code points so this file itself contains none of these characters.
const TYPOGRAPHIC = new RegExp("[" + [0x2013, 0x2014, 0x2026, 0x201c, 0x201d, 0xab, 0xbb].map(c => String.fromCharCode(c)).join("") + "]");
const steer = (run: RunState, heading: number, gain = 15) => clampHelm(angleDiff(heading, run.pose.heading) / gain);

describe("manoeuvre catalogue", () => {
  const LANGS = ["ru", "en", "pl", "es", "fr", "de", "it"] as const;
  it("has the requested exercises, each with complete seven-language texts", () => {
    expect(MANOEUVRES.map(e => e.id)).toEqual(expect.arrayContaining([
      "alongside-onshore", "alongside-offshore", "stern-to", "piles-bow-to", "leave-onshore", "buoy-engine", "turn-fairway", "mob-engine", "gates-sail", "station-sail",
    ]));
    for (const e of MANOEUVRES) for (const field of ["title", "goal", "explain", "hint"] as const) for (const lang of LANGS) {
      const text = e[field][lang];
      expect(text.trim().length, `${e.id}.${field}.${lang}`).toBeGreaterThan(3);
      expect(TYPOGRAPHIC.test(text), `${e.id}.${field}.${lang}`).toBe(false);
    }
    // Polish is written with its diacritics.
    expect(MANOEUVRES.every(e => /[ąćęłńóśźż]/i.test(e.explain.pl + e.goal.pl))).toBe(true);
  });
  it("starts clear of everything it is not moored to, and every berth fits", () => {
    for (const e of MANOEUVRES) {
      const start = hullWorld(e.start);
      const [minX, minY, maxX, maxY] = e.bounds;
      expect(start.every(([x, y]) => x >= minX && x <= maxX && y >= minY && y <= maxY), e.id).toBe(true);
      for (const o of e.obstacles) {
        if (e.lines?.length && o.id === "pontoon") continue;
        expect(clearance(start, o.shape), `${e.id} start vs ${o.id}`).toBeGreaterThan(0.2);
      }
      if (e.target.type === "berth") {
        const berth = hullWorld(e.target);
        for (const o of e.obstacles) expect(clearance(berth, o.shape), `${e.id} berth vs ${o.id}`).toBeGreaterThan(o.kind === "pontoon" || o.kind === "quay" ? 0.2 : 0.5);
      }
    }
  });
});

describe("one attempt", () => {
  it("doing nothing times out with no stars", () => {
    const e = manoeuvreById("alongside-onshore")!;
    const run = drive(e, () => ({ helm: 0, throttle: 0, sheets: "trim" }));
    expect(run.status).toBe("timeout");
    expect(scoreRun(e, run).stars).toBe(0);
  });

  it("alongside in an onshore wind can be done the way a skipper does it, for three stars", () => {
    const e = manoeuvreById("alongside-onshore")!;
    let phase: "approach" | "stop" | "wait" = "approach";
    const run = drive(e, run => {
      const ahead = (e.target as { x: number }).x - run.pose.x;
      if (phase === "approach" && ahead < 7.5) phase = "stop";
      if (phase === "stop" && run.speedKn < 0.1) phase = "wait";
      const yRef = run.pose.x < -16 ? -8.5 : -5.5;
      const desired = 90 - Math.max(-12, Math.min(12, (yRef - run.pose.y) * 4));
      if (phase === "approach") return { helm: steer(run, desired), throttle: 0.4, sheets: "trim" };
      if (phase === "stop") return { helm: 0, throttle: -1, sheets: "trim" };
      return { helm: 0, throttle: 0, sheets: "trim" };
    });
    const score = scoreRun(e, run);
    expect(run.status).toBe("success");
    expect(score.hits).toBe(0);
    expect(score.stars).toBe(3);
    expect(score.touches).toBeGreaterThan(0);
  });

  it("ramming the berth at speed costs stars even if the boat ends up there", () => {
    const e = manoeuvreById("alongside-onshore")!;
    const run = drive(e, run => ({ helm: steer(run, run.pose.x < -6 ? 72 : 90), throttle: run.pose.x < -6 ? 1 : 0, sheets: "trim" }));
    const score = scoreRun(e, run);
    expect(score.hardestKn).toBeGreaterThan(e.criteria.gentleKn);
    expect(score.stars).toBeLessThanOrEqual(1);
  });

  it("leaving on a spring: stern swings out, cast off, back out clear", () => {
    const e = manoeuvreById("leave-onshore")!;
    let run = createRun(e), cast = false;
    const steps = Math.ceil(e.criteria.timeLimit / stepSeconds(e));
    for (let i = 0; i < steps && run.status === "running"; i++) {
      if (!cast && run.pose.heading < 52) { run = castOff(run, "bow-spring"); cast = true; }
      run = stepRun(e, run, cast ? { helm: 0, throttle: -1, sheets: "trim" } : { helm: -1, throttle: 0.4, sheets: "trim" });
    }
    expect(cast).toBe(true);
    expect(run.status).toBe("success");
    expect(scoreRun(e, run).hits).toBe(0);
    // Without the spring the same throttle just slides her forward into the boat ahead.
    let plain = castOff(createRun(e), "bow-spring");
    for (let i = 0; i < 30 * 60; i++) plain = stepRun(e, plain, { helm: -1, throttle: 0.4, sheets: "trim" });
    expect(plain.harbour!.contacts.some(c => c.obstacleId === "ahead")).toBe(true);
  });

  it("man overboard counts only with the propeller in neutral", () => {
    const e = manoeuvreById("mob-engine")!;
    const beside = (gear: -1 | 0 | 1): RunState => {
      const base = createRun(e);
      // Person 1 m off the starboard side, drifting slowly past.
      const harbour = createHarbourState({ x: -(OUR_YACHT.beam / 2 + 1.2), y: -14, heading: 0 }, { u: 0.3 * KNOT, gear, engine: gear * 0.3 });
      return { ...base, harbour, pose: { x: harbour.x, y: harbour.y, heading: 0 } };
    };
    expect(stepRun(e, beside(1), { helm: 0, throttle: 0.3, sheets: "trim" }).status).toBe("running");
    expect(stepRun(e, beside(0), { helm: 0, throttle: 0, sheets: "trim" }).status).toBe("success");
  });

  it("gate slalom under sail runs on the shared sailing session and can be finished", () => {
    const e = manoeuvreById("gates-sail")!;
    if (e.target.type !== "gates") throw new Error("gates");
    const gates = e.target.gates;
    const mid = (id: string) => { const o = e.obstacles.find(b => b.id === id)!; return o.shape.type === "circle" ? [o.shape.x, o.shape.y] : [0, 0]; };
    const run = drive(e, run => {
      const gate = gates[Math.min(run.progress.gate, gates.length - 1)];
      const a = mid(gate[0]), b = mid(gate[1]);
      const tx = (a[0] + b[0]) / 2 + 15, ty = (a[1] + b[1]) / 2;
      const bearing = (Math.atan2(tx - run.pose.x, ty - run.pose.y) * 180 / Math.PI + 360) % 360;
      return { helm: steer(run, bearing, 25), throttle: 0, sheets: "trim" };
    });
    expect(run.sail).not.toBeNull();
    expect(run.progress.gate).toBe(4);
    expect(run.status).toBe("success");
    expect(scoreRun(e, run).stars).toBeGreaterThanOrEqual(2);
  });

  it("reports distance to the target that shrinks as the boat closes in", () => {
    const e = manoeuvreById("buoy-engine")!;
    const first = createRun(e);
    const later = drive(e, run => ({ helm: steer(run, (Math.atan2(-run.pose.x, -2 - run.pose.y) * 180 / Math.PI + 360) % 360), throttle: run.t < 20 ? 0.4 : 0, sheets: "trim" }), first);
    expect(targetDistance(e, later).value).toBeLessThan(targetDistance(e, first).value);
  });
});

describe("local progress", () => {
  const ids = MANOEUVRES.map(e => e.id);
  it("keeps the best stars and survives corrupt storage", () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } };
    let stars = recordStars(storage, {}, "alongside-onshore", 2)!;
    stars = recordStars(storage, stars, "alongside-onshore", 1)!;
    expect(stars["alongside-onshore"]).toBe(2);
    expect(parseProgress(store.get("regatta.manoeuvres.v1")!, ids)).toEqual({ "alongside-onshore": 2 });
    expect(parseProgress("{nope", ids)).toEqual({});
    expect(parseProgress(JSON.stringify({ version: 2, stars: { "alongside-onshore": 3 } }), ids)).toEqual({});
    expect(parseProgress(JSON.stringify({ version: 1, stars: { "alongside-onshore": 7, other: 3 } }), ids)).toEqual({});
    expect(recordStars({ getItem: () => null, setItem: () => { throw new Error("full"); } }, {}, "x", 3)).toBeNull();
  });
  it("opens the next exercise in a track after one star on the previous", () => {
    expect(isUnlocked(MANOEUVRES, {}, "alongside-onshore")).toBe(true);
    expect(isUnlocked(MANOEUVRES, {}, "gates-sail")).toBe(true);
    const second = nextExercise(MANOEUVRES, "alongside-onshore")!;
    expect(isUnlocked(MANOEUVRES, {}, second.id)).toBe(false);
    expect(isUnlocked(MANOEUVRES, { "alongside-onshore": 1 }, second.id)).toBe(true);
    expect(nextExercise(MANOEUVRES, "turn-fairway")).toBeUndefined();
  });
});
