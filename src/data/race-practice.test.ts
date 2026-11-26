import { describe, expect, it } from "vitest";
import { RACE_COACH_PRACTICE, RACE_JUDGE_PRACTICE, RACE_PRACTICE_COPY, RACE_PRACTICE_DRILL_TITLES, RACE_PRACTICE_RULE_TITLES, type RacePracticeTarget } from "./race-practice";
import { trainerCatalog } from "./drills";
import { ruleScenarios } from "./rules";
import { bootcampLessonHeads } from "./bootcamp-index";
import { COACH_GOAL_KINDS } from "../lib/fallback-coach";
import type { RaceJudgeLesson } from "../lib/race-judge";
import { legacyPick } from "../lib/languages";

const LANGS = ["ru", "en", "pl", "es", "fr", "de", "it"] as const;

// Contract (M4-2): every mistake the race judge or the race coach can name
// has exactly one practice, and that practice is content that exists: a web
// trainer drill, a rule card or a foundation lesson. Only the start jostle
// (not the player's mistake, M0-3) has none.

// Every judge lesson, listed by hand: a new lesson in race-judge.ts fails the
// type below until it is added here, and then fails the mapping check until
// race-practice.ts maps it.
const JUDGE_LESSONS = {
  "keep-clear-port": true, "keep-clear-windward": true, "keep-clear-astern": true,
  "avoid-contact-right-of-way": true, "avoid-contact-unclear": true,
  "return-behind-line": true, "clean-start": true, "mark-clearance": true, "round-to-port": true, "start-jostle": false,
} satisfies Record<RaceJudgeLesson, boolean>;

function exists(target: RacePracticeTarget): boolean {
  if (target.kind === "drill") return trainerCatalog.some(e => e.id === target.id && e.kind === "drill" && e.platforms.includes("web"));
  if (target.kind === "rule") return ruleScenarios.some(r => r.id === target.id);
  return bootcampLessonHeads.some(l => l.id === target.id);
}

describe("race mistake -> practice mapping", () => {
  it("maps every judge lesson but the start jostle to an existing practice", () => {
    const mapped = RACE_JUDGE_PRACTICE as Record<string, RacePracticeTarget | undefined>;
    for (const [lesson, practised] of Object.entries(JUDGE_LESSONS)) {
      if (!practised) { expect(mapped[lesson], lesson).toBeUndefined(); continue; }
      expect(mapped[lesson], lesson).toBeDefined();
      expect(exists(mapped[lesson]!), `${lesson} -> ${mapped[lesson]!.kind}:${mapped[lesson]!.id}`).toBe(true);
    }
    expect(Object.keys(mapped).sort()).toEqual(Object.entries(JUDGE_LESSONS).filter(([, p]) => p).map(([l]) => l).sort());
  });

  it("maps every coach mistake kind to an existing practice", () => {
    expect(Object.keys(RACE_COACH_PRACTICE).sort()).toEqual([...COACH_GOAL_KINDS].sort());
    for (const kind of COACH_GOAL_KINDS) expect(exists(RACE_COACH_PRACTICE[kind]), kind).toBe(true);
  });

  it("an unknown id is caught", () => {
    expect(exists({ kind: "rule", id: "no-such-card" })).toBe(false);
    expect(exists({ kind: "drill", id: "noGo" })).toBe(false); // a native-only drill, not in the web trainer
    expect(exists({ kind: "lesson", id: "no-such-lesson" })).toBe(false);
  });

  it("names each linked rule card and drill with the words of its source, in all seven languages", () => {
    const targets = [...Object.values(RACE_JUDGE_PRACTICE), ...Object.values(RACE_COACH_PRACTICE)];
    for (const target of targets.filter(t => t.kind === "rule")) {
      const card = ruleScenarios.find(r => r.id === target.id)!;
      for (const lang of LANGS) expect(RACE_PRACTICE_RULE_TITLES[target.id]?.[lang], `${target.id} ${lang}`).toBe(legacyPick(card, "title", lang));
    }
    for (const target of targets.filter(t => t.kind === "drill")) {
      const drill = trainerCatalog.find(e => e.id === target.id)!;
      for (const lang of LANGS) expect(RACE_PRACTICE_DRILL_TITLES[target.id]?.[lang]).toBe(drill.title[lang]);
    }
  });

  it("has the link copy in all seven languages without long dashes", () => {
    for (const [key, label] of Object.entries(RACE_PRACTICE_COPY)) {
      for (const lang of LANGS) {
        expect(label[lang], `${key} ${lang}`).toBeTruthy();
        expect(label[lang]).not.toMatch(/[\u2013\u2014]/);
      }
    }
  });
});
