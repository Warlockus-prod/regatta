import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RaceJudgeReview } from "@/app/game/RaceJudgeReview";
import { fillJudgeTemplate, raceJudgeCopy } from "@/data/race-judge-copy";
import { ENABLED_LANGUAGES } from "./languages";
import { makeStandardCourse, type RaceBoat } from "./race-physics";
import { buildRaceJudgeDebrief, RACE_JUDGE_MERGE_GAP, RACE_JUDGE_NOT_COVERED, resolvePhase } from "./race-judge";
import { createRaceRulesState, evaluateRaceRules, RULE_EVENT_COOLDOWN, type RaceRuleEvent } from "./race-rules";

let seq = 0;
const ev = (e: Omit<RaceRuleEvent, "id" | "penaltySeconds"> & { penaltySeconds?: number }): RaceRuleEvent =>
  ({ id: `e${seq++}`, penaltySeconds: 0, ...e });
const boat = (id: string, x: number, y: number, heading: number, speed = 4): RaceBoat => ({ id, name: id, color: "white", pos: { x, y }, heading, speed, lapDone: 0, started: true });

describe("merging repeated events into one incident", () => {
  it("merges the engine's cooldown repeats of one situation and keeps a later one separate", () => {
    const events = [
      ev({ kind: "give-way", rule: "10", boatId: "player", otherBoatId: "bot1", time: 20 }),
      ev({ kind: "give-way", rule: "10", boatId: "player", otherBoatId: "bot1", time: 20 + RULE_EVENT_COOLDOWN }),
      ev({ kind: "give-way", rule: "10", boatId: "player", otherBoatId: "bot1", time: 20 + 2 * RULE_EVENT_COOLDOWN }),
      // Same kind, different boat at the same moment: a different incident.
      ev({ kind: "give-way", rule: "10", boatId: "player", otherBoatId: "bot2", time: 21 }),
      // Same boat again, but long after: a new incident.
      ev({ kind: "give-way", rule: "10", boatId: "player", otherBoatId: "bot1", time: 20 + 2 * RULE_EVENT_COOLDOWN + RACE_JUDGE_MERGE_GAP + 1 }),
    ];
    const { items, summary } = buildRaceJudgeDebrief(events, { startedAt: 5 });
    expect(items.map(i => [i.otherBoatId, i.occurrences])).toEqual([["bot1", 3], ["bot2", 1], ["bot1", 1]]);
    expect(items[0]).toMatchObject({ time: 20, until: 20 + 2 * RULE_EVENT_COOLDOWN, rightOfWay: "other", penalty: { kind: "advice" }, lesson: "keep-clear-port" });
    expect(summary.counts["give-way"]).toBe(3);
  });

  it("sums the seconds of merged penalised events so the total matches the engine", () => {
    const events = [
      ev({ kind: "mark-touch", rule: "31", boatId: "player", time: 50, penaltySeconds: 3 }),
      ev({ kind: "mark-touch", rule: "31", boatId: "player", time: 52, penaltySeconds: 3 }),
      ev({ kind: "contact", rule: "11", boatId: "player", otherBoatId: "bot1", time: 30, penaltySeconds: 5 }),
    ];
    const { items, summary } = buildRaceJudgeDebrief(events, { startedAt: 2 });
    expect(items).toHaveLength(2);
    expect(items[1]).toMatchObject({ kind: "mark-touch", occurrences: 2, penalty: { kind: "applied", seconds: 6 } });
    expect(summary.totalPenaltySeconds).toBe(11);
  });

  it("ignores other boats' own incidents", () => {
    const events = [ev({ kind: "give-way", rule: "10", boatId: "bot1", otherBoatId: "bot2", time: 10 })];
    expect(buildRaceJudgeDebrief(events).items).toEqual([]);
  });
});

describe("uncertain situations never get a penalty", () => {
  it("shows a rule 14 contact as undecided with no penalty, even if seconds were attached", () => {
    const events = [
      ev({ kind: "contact", rule: "14", boatId: "player", otherBoatId: "bot1", time: 40 }),
      ev({ kind: "contact", rule: "14", boatId: "bot1", otherBoatId: "player", time: 40 }),
      ev({ kind: "contact", rule: "14", boatId: "player", otherBoatId: "bot2", time: 90, penaltySeconds: 5 }),
    ];
    const { items, summary } = buildRaceJudgeDebrief(events, { startedAt: 1 });
    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(item.rightOfWay).toBe("undecided");
      expect(item.penalty).toEqual({ kind: "uncertain" });
      expect(item.lesson).toBe("avoid-contact-unclear");
    }
    expect(summary.totalPenaltySeconds).toBe(0);
    expect(summary.uncertain).toBe(2);
  });

  it("uses the engine's real output: an undecided contact earns nothing, a decided one is charged to the give-way boat", () => {
    const course = makeStandardCourse();
    // Both boats closer than 42 degrees to the wind: the engine refuses to assign right of way.
    const unclear = evaluateRaceRules(createRaceRulesState(), { boats: [boat("player", 400, 700, 30), boat("bot1", 410, 700, 330)], course, windDir: 0, time: 30, racing: true });
    expect(unclear.events.filter(e => e.kind === "contact").map(e => e.rule)).toEqual(["14", "14"]);
    const decided = evaluateRaceRules(createRaceRulesState(), { boats: [boat("player", 390, 700, 45), boat("bot1", 410, 700, 315)], course, windDir: 0, time: 60, racing: true });
    const all = [...unclear.events, ...decided.events];
    const debrief = buildRaceJudgeDebrief(all, { startedAt: 0 });
    const contacts = debrief.items.filter(i => i.kind === "contact");
    expect(contacts.map(i => i.rightOfWay).sort()).toEqual(["other", "undecided"]);
    for (const item of contacts) {
      if (item.rightOfWay === "undecided") expect(item.penalty.kind).toBe("uncertain");
      else expect(item).toMatchObject({ rule: "10", rightOfWay: "other", penalty: { kind: "applied", seconds: 5 } });
    }
    expect(debrief.summary.totalPenaltySeconds).toBe(decided.state.penalties.player ?? 0);
    // The stand-on boat sees the same contact as the other boat's penalty, not its own.
    const bot = buildRaceJudgeDebrief(decided.events, { boatId: "bot1", startedAt: 0 });
    expect(bot.items.find(i => i.kind === "contact")).toMatchObject({ rightOfWay: "you", penalty: { kind: "other-boat", seconds: 5 }, lesson: "avoid-contact-right-of-way" });
    expect(bot.summary.totalPenaltySeconds).toBe(0);
  });

  it("decides right of way in a close approach only from the engine's events", () => {
    const standOn = [
      ev({ kind: "give-way", rule: "10", boatId: "bot1", otherBoatId: "player", time: 12 }),
      ev({ kind: "avoid-contact", rule: "14", boatId: "player", otherBoatId: "bot1", time: 12 }),
    ];
    expect(buildRaceJudgeDebrief(standOn).items).toEqual([expect.objectContaining({ kind: "avoid-contact", rightOfWay: "you", penalty: { kind: "advice" } })]);
    const unresolved = [
      ev({ kind: "avoid-contact", rule: "14", boatId: "player", otherBoatId: "bot1", time: 12 }),
      ev({ kind: "avoid-contact", rule: "14", boatId: "bot1", otherBoatId: "player", time: 12 }),
    ];
    expect(buildRaceJudgeDebrief(unresolved).items[0]).toMatchObject({ rightOfWay: "undecided", penalty: { kind: "uncertain" } });
    const playerOnly = [ev({ kind: "avoid-contact", rule: "14", boatId: "player", otherBoatId: "bot1", time: 12 })];
    expect(buildRaceJudgeDebrief(playerOnly).items[0]).toMatchObject({ rightOfWay: "unknown", penalty: { kind: "advice" } });
  });
});

describe("early start", () => {
  it("is explained as a required return behind the line, with no time penalty", () => {
    const events = [
      ev({ kind: "early-start", rule: "29.1", boatId: "player", time: 0.5 }),
      ev({ kind: "start-clear", rule: "29.1", boatId: "player", time: 9 }),
    ];
    const { items } = buildRaceJudgeDebrief(events);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ kind: "early-start", rule: "29.1", phase: "start", penalty: { kind: "correction-required" }, lesson: "return-behind-line", resolved: true });
    for (const lang of ENABLED_LANGUAGES.map(l => l.id)) expect(raceJudgeCopy.lesson["return-behind-line"][lang].length).toBeGreaterThan(40);
    expect(raceJudgeCopy.lesson["return-behind-line"].en).toMatch(/return completely behind the start line/i);
    expect(raceJudgeCopy.lesson["return-behind-line"].ru).toMatch(/вернуться целиком за стартовую линию/);
    expect(raceJudgeCopy.lesson["return-behind-line"].pl).toMatch(/wrócić całym kadłubem za linię startu/);
  });

  it("reports an early start without a recorded return as unresolved", () => {
    const { items } = buildRaceJudgeDebrief([ev({ kind: "early-start", rule: "29.1", boatId: "player", time: 0 })]);
    expect(items[0].resolved).toBe(false);
  });

  it("comes from the engine for a boat over the line at the signal", () => {
    const course = makeStandardCourse();
    const lineY = (course.startLine.a.y + course.startLine.b.y) / 2;
    const over = { ...boat("player", 400, lineY - 20, 0), started: false };
    const { events } = evaluateRaceRules(createRaceRulesState(), { boats: [over], course, windDir: 0, time: 0, racing: true });
    expect(buildRaceJudgeDebrief(events).items[0]).toMatchObject({ kind: "early-start", lesson: "return-behind-line", resolved: false });
  });
});

describe("race phase", () => {
  it("places incidents on the legs the events prove and says when it cannot", () => {
    const events = [
      ev({ kind: "give-way", rule: "10", boatId: "player", otherBoatId: "bot1", time: 30 }),
      ev({ kind: "wrong-rounding", rule: "28", boatId: "player", time: 70 }),
      ev({ kind: "mark-rounded", rule: "28", boatId: "player", time: 80 }),
      ev({ kind: "give-way", rule: "12", boatId: "player", otherBoatId: "bot2", time: 100 }),
      ev({ kind: "mark-touch", rule: "31", boatId: "player", time: 140, penaltySeconds: 3 }),
    ];
    expect(buildRaceJudgeDebrief(events, { startedAt: 4 }).items.map(i => i.phase)).toEqual(["upwind", "mark", "downwind", "finish"]);
    const noStart = buildRaceJudgeDebrief(events).items;
    expect(noStart[0]).toMatchObject({ phase: "unknown", phaseNote: "start-or-upwind" });
    expect(noStart.map(i => i.phase).slice(1)).toEqual(["mark", "downwind", "finish"]);
  });

  it("does not guess which mark was touched or which leg without a rounding", () => {
    expect(resolvePhase("mark-touch", 20, {})).toEqual({ phase: "unknown", phaseNote: "start-or-windward-mark" });
    expect(resolvePhase("contact", 20, { startedAt: 3, finishedAt: 200 })).toEqual({ phase: "unknown", phaseNote: "rounding-not-recorded" });
    expect(resolvePhase("contact", 2, { startedAt: 3 })).toEqual({ phase: "start" });
    expect(resolvePhase("contact", -1, {})).toEqual({ phase: "pre-start" });
    expect(resolvePhase("contact", 210, { markRoundedAt: 90, finishedAt: 200 })).toEqual({ phase: "after-finish" });
  });
});

describe("summary and copy", () => {
  it("always lists what the judge does not cover, also for a clean race", () => {
    const clean = buildRaceJudgeDebrief([]);
    expect(clean.items).toEqual([]);
    expect(clean.summary.notCovered).toEqual(["mark-room", "tack-and-course-change", "penalty-turns", "protests", "umpire"]);
    expect(RACE_JUDGE_NOT_COVERED).toContain("mark-room");
    expect(raceJudgeCopy.notCovered["mark-room"].en).toMatch(/rule 18/);
    expect(raceJudgeCopy.notCovered["penalty-turns"].en).toMatch(/rule 44/);
  });

  it("has every string in all seven languages, non-empty and without long dashes", () => {
    const langs = ENABLED_LANGUAGES.map(l => l.id);
    expect(langs).toHaveLength(7);
    const visit = (node: unknown, path: string) => {
      if (node && typeof node === "object" && "ru" in node && "en" in node) {
        for (const lang of langs) {
          const text = (node as Record<string, unknown>)[lang];
          expect(typeof text, `${path}.${lang}`).toBe("string");
          expect((text as string).trim(), `${path}.${lang}`).not.toBe("");
          expect(text as string, `${path}.${lang}`).not.toMatch(/[\u2013\u2014\u201c\u201d\u2026]/);
        }
        return;
      }
      if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) visit(v, `${path}.${k}`);
    };
    visit(raceJudgeCopy, "raceJudgeCopy");
    for (const lang of langs) {
      expect(raceJudgeCopy.penalty.applied[lang]).toContain("{s}");
      expect(raceJudgeCopy.penalty["other-boat"][lang]).toContain("{s}");
      expect(raceJudgeCopy.rule[lang]).toContain("{rule}");
      expect(raceJudgeCopy.withBoat[lang]).toContain("{boat}");
      expect(raceJudgeCopy.occurrences[lang]).toContain("{n}");
    }
    expect(fillJudgeTemplate(raceJudgeCopy.penalty.applied.en, { s: 5 })).toBe("Penalty: +5 s");
  });

  it("renders the debrief with the not-covered list", () => {
    const debrief = buildRaceJudgeDebrief([
      ev({ kind: "early-start", rule: "29.1", boatId: "player", time: 0 }),
      ev({ kind: "contact", rule: "14", boatId: "player", otherBoatId: "bot1", time: 40 }),
    ], { startedAt: 6 });
    const html = renderToStaticMarkup(createElement(RaceJudgeReview, { debrief, boatName: id => id === "bot1" ? "Aurora" : id }));
    expect(html.match(/data-testid="race-judge-item"/g)).toHaveLength(2);
    expect(html).toContain('data-penalty="uncertain"');
    expect(html).toContain("Aurora");
    expect(html.match(/<li>/g)?.length).toBe(RACE_JUDGE_NOT_COVERED.length);
  });
});
