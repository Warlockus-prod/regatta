import { describe, expect, it } from "vitest";
import { DIFFICULTY_CONFIG } from "../data/race-difficulty";
import { DEFAULT_LAST_RACE_SETUP, LAST_RACE_SETUP_KEY, parseLastRaceSetup, raceSetupHref, readLastRaceSetup, rememberLastRaceSetup } from "./race-last-setup";
import { raceHubCopy, raceSetupSummary } from "./product/race-hub";

// Package 9 (audit B10): the website's Race hub plays the last used setup.

const memory = () => { const rows = new Map<string, string>(); return { rows, getItem: (k: string) => rows.get(k) ?? null, setItem: (k: string, v: string) => { rows.set(k, v); } }; };

describe("last race setup", () => {
  it("starts with the first race (easy, medium wind) and plays it with play=1", () => {
    expect(readLastRaceSetup(null)).toEqual(DEFAULT_LAST_RACE_SETUP);
    expect(raceSetupHref(DEFAULT_LAST_RACE_SETUP, true)).toBe("/game?difficulty=easy&wind=medium&play=1");
    expect(raceSetupHref(DEFAULT_LAST_RACE_SETUP, false)).toBe("/game?difficulty=easy&wind=medium");
  });

  it("reads back what the race remembered, for a free race and a mission", () => {
    const store = memory();
    rememberLastRaceSetup(store, { kind: "free", difficulty: "hard", wind: "light" });
    expect(readLastRaceSetup(store)).toEqual({ kind: "free", difficulty: "hard", wind: "light" });
    expect(raceSetupHref(readLastRaceSetup(store), true)).toBe("/game?difficulty=hard&wind=light&play=1");
    rememberLastRaceSetup(store, { kind: "mission", missionId: "port-tack" });
    expect(raceSetupHref(readLastRaceSetup(store), false)).toBe("/game?mission=port-tack");
    expect(JSON.parse(store.rows.get(LAST_RACE_SETUP_KEY)!)).toEqual({ v: 1, kind: "mission", missionId: "port-tack" });
  });

  it("treats broken, foreign or hostile rows as no setup, and never throws", () => {
    for (const raw of ["{", "null", "[]", '{"v":2,"kind":"free","difficulty":"easy","wind":"medium"}', '{"v":1,"kind":"free","difficulty":"insane","wind":"medium"}',
      '{"v":1,"kind":"mission","missionId":"https://evil.test"}', `{"v":1,"kind":"mission","missionId":"${"a".repeat(600)}"}`]) expect(parseLastRaceSetup(raw)).toBeNull();
    expect(readLastRaceSetup({ getItem: () => { throw new Error("denied"); } })).toEqual(DEFAULT_LAST_RACE_SETUP);
    expect(() => rememberLastRaceSetup({ setItem: () => { throw new Error("quota"); } }, DEFAULT_LAST_RACE_SETUP)).not.toThrow();
  });

  it("names the setup with the race's own level words", () => {
    for (const d of ["easy", "medium", "hard"] as const) {
      const c = DIFFICULTY_CONFIG[d];
      expect(raceHubCopy.level[d]).toEqual({ ru: c.label, en: c.labelEn, pl: c.labelPl, es: c.labelEs, fr: c.labelFr, de: c.labelDe, it: c.labelIt });
    }
    expect(raceSetupSummary(DEFAULT_LAST_RACE_SETUP, "ru")).toBe("Лёгкий · средний ветер");
    expect(raceSetupSummary({ kind: "free", difficulty: "hard", wind: "heavy" }, "en")).toBe("Hard · strong wind");
    expect(raceSetupSummary({ kind: "mission", missionId: "x" }, "pl")).toBe("Misja");
  });
});
