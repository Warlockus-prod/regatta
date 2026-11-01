import { describe, expect, it } from "vitest";
import { SRC_BANK } from "@/data/src-radio";
import { SCENARIOS } from "./symulator/scenarios";
import { THEORY_CHAPTERS } from "./teoria/courseData";
import { SCENARIO_IDS, SRC_QUESTION_IDS, THEORY_CHAPTER_IDS } from "./courseIds";
import { SCENARIO_TITLES_PL } from "./sciaga/scenarioTitles";

// The /radio hub counts progress against these lists instead of importing the
// data. If they drift, the hub silently shows wrong totals ("40/324" while the
// bank has 330) and never counts the new items as done. This is the guard.
describe("radio hub id lists match their sources", () => {
  it("SRC question ids", () => {
    expect([...SRC_QUESTION_IDS]).toEqual(SRC_BANK.map((q) => q.id));
  });

  it("simulator scenario ids", () => {
    expect([...SCENARIO_IDS]).toEqual(SCENARIOS.map((s) => s.id));
  });

  it("simulator scenario certificate titles", () => {
    expect(Object.keys(SCENARIO_TITLES_PL)).toEqual(SCENARIOS.map((s) => s.id));
    expect(SCENARIO_IDS.map((id) => SCENARIO_TITLES_PL[id])).toEqual(SCENARIOS.map((s) => s.title.pl));
  });

  it("theory chapter ids", () => {
    expect([...THEORY_CHAPTER_IDS]).toEqual(THEORY_CHAPTERS.map((c) => c.id));
  });
});
