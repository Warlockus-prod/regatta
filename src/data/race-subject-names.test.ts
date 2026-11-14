import { describe, expect, it } from "vitest";
import { legacyPick } from "@/lib/languages";
import { quickRefreshLessons } from "./bootcamp";
import { RACE_SUBJECT_NAMES } from "./race-subject-names";
import { ruleScenarios } from "./rules";
import { glossaryTerms, maneuvers, pointsOfSail, racingStrategies } from "./sailing-data";
import { SAILING_SECTIONS } from "./sailing-visuals";

const LANGS = ["ru", "en", "pl", "es", "fr", "de", "it"] as const;

// Contract: the copied names are the rule cards' own titles, and every subject of every 15-minute
// card has a name from one of the sources the page reads (never a bare id on screen).
describe("names of the race subjects in the 15-minute cards", () => {
  it("are the titles of the rule cards of the same id, in every language", () => {
    for (const [id, names] of Object.entries(RACE_SUBJECT_NAMES)) {
      const rule = ruleScenarios.find(item => item.id === id)!;
      for (const lang of LANGS) expect(names[lang], `${id} ${lang}`).toBe(legacyPick(rule, "title", lang));
    }
  });

  it("names every subject every card shows", () => {
    const named = new Set([...pointsOfSail, ...maneuvers, ...glossaryTerms, ...racingStrategies].map(item => item.id).concat(Object.keys(RACE_SUBJECT_NAMES)));
    for (const card of quickRefreshLessons) for (const subject of SAILING_SECTIONS.quick[card.id as keyof typeof SAILING_SECTIONS.quick]) expect(named.has(subject), `${card.id}: ${subject}`).toBe(true);
  });
});
