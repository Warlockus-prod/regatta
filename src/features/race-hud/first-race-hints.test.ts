import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { makeStandardCourse, type RaceBoat } from "@/lib/race-physics";
import { ENABLED_LANGUAGES } from "@/lib/languages";
import { FIRST_RACE_HINT_COPY, firstRaceHintText } from "@/data/race-first-hints-copy";
import { FEEDBACK_DURATION, FEEDBACK_PRIORITY } from "./feedback";
import {
  FIRST_RACE_HINTS, FIRST_RACE_HINTS_KEY, HINT_TIMING, createFirstRaceHintState, markFirstRaceHintSeen, nextFirstRaceHint,
  playerCrossing, readFirstRaceHints, resetFirstRaceHints, type FirstRaceHintId, type FirstRaceHintSample, type FirstRaceHintState,
} from "./first-race-hints";

// Contract (M4-7): each first race hint fires once, at the moment its
// situation holds in a running race (stalled in the no-go zone, just after
// the first tack, near the windward mark not yet rounded, an opposite-tack
// boat closing in), never during the countdown, never for a hint this device
// has seen, never within the gap after another hint; "Show hints again"
// clears the device record.
const course = makeStandardCourse();
const mark = course.marks[0].pos;
const player = (over: Partial<RaceBoat> = {}): RaceBoat =>
  ({ id: "player", name: "You", color: "#fff", pos: { x: 400, y: 900 }, heading: 45, speed: 5, lapDone: 0, started: true, isPlayer: true, ...over });
const bot = (over: Partial<RaceBoat> = {}): RaceBoat =>
  ({ id: "ai0", name: "AI", color: "#888", pos: { x: 100, y: 1100 }, heading: 315, speed: 5, lapDone: 0, started: true, ...over });
const sample = (over: Partial<FirstRaceHintSample> = {}): FirstRaceHintSample =>
  ({ t: 20, racing: true, tacked: false, twa: -45, windDir: 0, boats: [player(), bot()], course, ...over });
const none = new Set<FirstRaceHintId>();
const LANGS = ENABLED_LANGUAGES.map(l => l.id);

/** Feed samples one second apart; collect the hints that fired. */
function run(samples: FirstRaceHintSample[], seen: ReadonlySet<FirstRaceHintId> = none, start: FirstRaceHintState = createFirstRaceHintState()) {
  let state = start;
  const fired: { t: number; id: string; giveWay?: boolean }[] = [];
  for (const s of samples) {
    const r = nextFirstRaceHint(state, s, seen);
    state = r.state;
    if (r.hint) fired.push({ t: s.t, ...r.hint });
  }
  return { fired, state };
}
const range = (from: number, to: number, over: (t: number) => Partial<FirstRaceHintSample>) =>
  Array.from({ length: to - from + 1 }, (_, i) => sample({ t: from + i, ...over(from + i) }));

describe("first race hint triggers", () => {
  it("tells the no-go zone once, while the boat is stalled in it", () => {
    const { fired } = run(range(10, 60, () => ({ twa: 10, boats: [player({ speed: 0.5 }), bot()] })));
    expect(fired).toEqual([{ t: 10 + HINT_TIMING.noGoSec, id: "no-go" }]);
    // Close to the wind but with way on is not the no-go zone.
    expect(run(range(10, 20, () => ({ twa: 25, boats: [player({ speed: 4 }), bot()] }))).fired).toEqual([]);
  });

  it("is not the no-go hint during an ordinary slow tack: that one gets the first tack hint", () => {
    // Port to starboard through head to wind, below 2 kn for a few seconds while crossing it.
    // In the zone 4.5 s in all, longer than noGoSec, but never that long on one side.
    const twas = [-40, -28, -22, -15, -8, -3, 3, 8, 15, 22, 28, 35, 42];
    const tack = twas.map((twa, i) => sample({ t: 10 + i * 0.5, twa, tacked: twa === 22, boats: [player({ speed: Math.abs(twa) < 30 ? 1.5 : 3 }), bot()] }));
    expect(run(tack).fired).toEqual([{ t: 14.5, id: "first-tack" }]);
    // A boat that stays head to wind on one side is stalled: the no-go hint after noGoSec.
    const stuck = Array.from({ length: 9 }, (_, i) => sample({ t: 10 + i * 0.5, twa: -12, boats: [player({ speed: 1.5 }), bot()] }));
    expect(run(stuck).fired).toEqual([{ t: 10 + HINT_TIMING.noGoSec, id: "no-go" }]);
    // Drifting head to wind while the wind swings across the bow is still a stall, not a tack.
    const drifting = Array.from({ length: 9 }, (_, i) => sample({ t: 10 + i * 0.5, twa: i % 2 ? 3 : -3, boats: [player({ speed: 0.4 }), bot()] }));
    expect(run(drifting).fired).toEqual([{ t: 10 + HINT_TIMING.noGoSec, id: "no-go" }]);
  });

  it("is quiet during the countdown and for hints this device has seen", () => {
    const stalled = { twa: 5, boats: [player({ speed: 0.2 }), bot()] };
    expect(run(range(0, 30, () => ({ ...stalled, racing: false }))).fired).toEqual([]);
    expect(run(range(0, 30, () => stalled), new Set(["no-go"])).fired).toEqual([]);
    expect(run(range(0, 30, () => stalled), new Set(FIRST_RACE_HINTS)).state.fired).toEqual([]);
  });

  it("tells the first tack just after it, not after a later one, and not once the moment has passed", () => {
    expect(run([sample({ t: 30, tacked: true }), sample({ t: 31 })]).fired).toEqual([{ t: 30, id: "first-tack" }]);
    // Another hint holds the gap past the tack's moment: the first tack hint does not come late.
    const busy = run([...range(26, 29, () => ({ twa: 5, boats: [player({ speed: 0.3 }), bot()] })), sample({ t: 30, tacked: true }),
      ...range(31, 60, () => ({})), sample({ t: 61, tacked: true }), sample({ t: 62 })]);
    expect(busy.fired).toEqual([{ t: 29, id: "no-go" }]);
  });

  it("tells the windward mark approach on the first leg only", () => {
    const near = { x: mark.x + 40, y: mark.y + 90 };
    expect(Math.hypot(near.x - mark.x, near.y - mark.y)).toBeLessThan(HINT_TIMING.markUnits);
    expect(run(range(40, 50, () => ({ boats: [player({ pos: near }), bot()] }))).fired).toEqual([{ t: 40, id: "mark-approach" }]);
    expect(run(range(40, 50, () => ({ boats: [player({ pos: near, lapDone: 1 }), bot()] }))).fired).toEqual([]);
    expect(run(range(40, 50, () => ({ boats: [player({ pos: { x: mark.x, y: mark.y + 300 } }), bot()] }))).fired).toEqual([]);
  });

  it("tells a crossing with an opposite-tack boat, and who keeps clear", () => {
    // Port tack (heading 45, wind from north) meets starboard tack (heading 315) ahead.
    const port = player({ pos: { x: 370, y: 700 }, heading: 45 }), starboard = bot({ pos: { x: 430, y: 700 }, heading: 315 });
    expect(playerCrossing([port, starboard], 0)).toEqual({ giveWay: true });
    expect(run([sample({ boats: [port, starboard] })]).fired).toEqual([{ t: 20, id: "crossing", giveWay: true }]);
    const onStarboard = player({ pos: { x: 430, y: 700 }, heading: 315 }), onPort = bot({ pos: { x: 370, y: 700 }, heading: 45 });
    expect(run([sample({ twa: 45, boats: [onStarboard, onPort] })]).fired).toEqual([{ t: 20, id: "crossing", giveWay: false }]);
    // Same tack, sailing apart, or a finished boat: no crossing.
    expect(playerCrossing([port, bot({ pos: { x: 430, y: 700 }, heading: 45 })], 0)).toBeNull();
    expect(playerCrossing([player({ pos: { x: 430, y: 700 }, heading: 45 }), bot({ pos: { x: 370, y: 700 }, heading: 315 })], 0)).toBeNull();
    expect(playerCrossing([port, { ...starboard, lapDone: 2 }], 0)).toBeNull();
  });

  it("never shows two hints within the gap, and each fires once per race", () => {
    // Stalled in the no-go zone near the mark with a crossing boat: one hint now, the next after the gap.
    const crowded = (t: number): Partial<FirstRaceHintSample> => t < 35
      ? { twa: 5, boats: [player({ speed: 0.2, pos: { x: mark.x + 40, y: mark.y + 90 } }), bot()] }
      : { boats: [player({ pos: { x: mark.x + 40, y: mark.y + 90 } }), bot()] };
    const { fired } = run(range(20, 60, crowded));
    // The mark first (the stall is not yet long enough), the stall after the gap.
    expect(fired.map(f => f.id)).toEqual(["mark-approach", "no-go"]);
    expect(fired[1].t - fired[0].t).toBe(HINT_TIMING.gapSec);
    // The gap outlasts a hint toast, so a second hint never replaces the first on screen.
    expect(HINT_TIMING.gapSec).toBeGreaterThan(FEEDBACK_DURATION.hint);
    expect(FEEDBACK_PRIORITY.hint).toBeGreaterThan(FEEDBACK_PRIORITY.manoeuvre);
  });
});

describe("device record of shown hints", () => {
  const store = () => {
    const values = new Map<string, string>();
    return { values, getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } };
  };
  beforeEach(() => resetFirstRaceHints(null));

  it("remembers each shown hint once, and Show hints again clears it", () => {
    const s = store();
    expect(readFirstRaceHints(s)).toEqual(new Set());
    markFirstRaceHintSeen("mark-approach", s);
    markFirstRaceHintSeen("no-go", s);
    markFirstRaceHintSeen("no-go", s);
    expect(JSON.parse(s.values.get(FIRST_RACE_HINTS_KEY)!)).toEqual(["no-go", "mark-approach"]);
    expect(readFirstRaceHints(s)).toEqual(new Set(["no-go", "mark-approach"]));
    resetFirstRaceHints(s);
    expect(s.values.has(FIRST_RACE_HINTS_KEY)).toBe(false);
    expect(readFirstRaceHints(s)).toEqual(new Set());
  });

  it("is a row the iOS app is asked to carry", () => {
    expect(FIRST_RACE_HINTS_KEY).toBe("regatta.race.hints-seen.v1");
    // The app copies only listed rows between the race WebView and native storage.
    const file = readFileSync(join(process.cwd(), "mobile/src/persistence/race-web-storage.ts"), "utf8");
    expect(file).toContain(`"${FIRST_RACE_HINTS_KEY}"`);
  });

  it("reads a corrupt or hostile row as nothing seen, and survives a storage that throws", () => {
    const s = store();
    s.values.set(FIRST_RACE_HINTS_KEY, "{not json");
    expect(readFirstRaceHints(s)).toEqual(new Set());
    s.values.set(FIRST_RACE_HINTS_KEY, JSON.stringify(["no-go", 7, "../x", "crossing"]));
    expect(readFirstRaceHints(s)).toEqual(new Set(["no-go", "crossing"]));
    const blocked = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); }, removeItem: () => { throw new Error("denied"); } };
    expect(() => markFirstRaceHintSeen("crossing", blocked)).not.toThrow();
    // This visit still remembers the hint it showed.
    expect(readFirstRaceHints(blocked)).toEqual(new Set(["crossing"]));
    // A reset storage refused does not bring the old row back.
    const stale = { ...store(), removeItem: () => { throw new Error("denied"); } };
    stale.values.set(FIRST_RACE_HINTS_KEY, JSON.stringify(["no-go"]));
    resetFirstRaceHints(stale);
    expect(readFirstRaceHints(stale)).toEqual(new Set());
  });
});

describe("first race hint copy", () => {
  it("has every hint in all seven languages, short and without dashes", () => {
    const hints = [{ id: "no-go" }, { id: "first-tack" }, { id: "mark-approach" }, { id: "crossing", giveWay: true }, { id: "crossing", giveWay: false }] as const;
    for (const lang of LANGS) for (const hint of hints) {
      const text = firstRaceHintText(lang, hint);
      expect(text.length, `${lang} ${hint.id}`).toBeGreaterThan(20);
      expect(text.length, `${lang} ${hint.id}`).toBeLessThanOrEqual(120);
      expect(text).not.toMatch(new RegExp("[\\u2013\\u2014]"));
    }
    expect(firstRaceHintText("en", { id: "crossing", giveWay: true })).toContain("port tack: keep clear");
    expect(firstRaceHintText("en", { id: "crossing", giveWay: false })).toContain("right of way");
    for (const key of ["again", "againNote", "againDone"] as const) for (const lang of LANGS) expect(FIRST_RACE_HINT_COPY[key][lang]).toBeTruthy();
    // The race does not measure laylines: no hint may claim one.
    expect(JSON.stringify(FIRST_RACE_HINT_COPY).toLowerCase()).not.toContain("layline");
  });
});
