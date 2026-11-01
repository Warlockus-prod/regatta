import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { ENABLED_LANGUAGES } from "@/lib/languages";
import { NO_GO } from "@/lib/race-manoeuvres";
import { RACE_INTRO_COPY, raceIntroStepLabel } from "@/data/race-intro-copy";
import {
  RACE_INTRO_CARDS, RACE_INTRO_KEY, hasSeenRaceIntro, markRaceIntroSeen, raceIntroDue, raceIntroEndRecordsSeen, raceIntroMove, raceIntroRequested,
  resetRaceIntroMemory, stepAfterRaceIntro,
} from "./race-intro";

// Contract (F5): the race intro opens by itself only on the lobby's start of a
// solo race, once per device (never in the physical trial, never for Again,
// Restart, the "i" briefing or the reload resume); Start race goes straight to
// the countdown and Skip to the start's own step; finishing or skipping
// records it on the device and in the app's race storage allowlist; its copy
// is complete in every language.
const LANGS = ENABLED_LANGUAGES.map(l => l.id);
function store(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return { values, getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); } };
}
beforeEach(() => resetRaceIntroMemory());

describe("when the intro opens by itself", () => {
  it("opens on the lobby start of a device that has not seen it", () => {
    expect(raceIntroDue({ trigger: "start", trial: false, seen: false })).toBe(true);
  });
  it("stays closed once seen, in the physical trial and for every other start request", () => {
    expect(raceIntroDue({ trigger: "start", trial: false, seen: true })).toBe(false);
    expect(raceIntroDue({ trigger: "start", trial: true, seen: false })).toBe(false);
    for (const trigger of ["info", "again", "restart", "resume"]) expect(raceIntroDue({ trigger, trial: false, seen: false })).toBe(false);
  });
});

describe("the intro opened by the link (the app's Race hub)", () => {
  const q = (search: string) => new URLSearchParams(search);
  it("opens for ?intro=1 alone", () => {
    expect(raceIntroRequested(q("?intro=1"), { trial: false, linkedSetup: false })).toBe(true);
    expect(raceIntroRequested(q("?intro=1&view=3d&scene=next&mode=pro"), { trial: false, linkedSetup: false })).toBe(true);
  });
  it("never in the trial, a saved replay, a race set up by the link or without the flag", () => {
    expect(raceIntroRequested(q("?intro=1&race=short"), { trial: true, linkedSetup: false })).toBe(false);
    expect(raceIntroRequested(q("?intro=1&replayId=abc"), { trial: false, linkedSetup: false })).toBe(false);
    expect(raceIntroRequested(q("?intro=1&difficulty=easy"), { trial: false, linkedSetup: true })).toBe(false);
    expect(raceIntroRequested(q("?intro=0"), { trial: false, linkedSetup: false })).toBe(false);
    expect(raceIntroRequested(q(""), { trial: false, linkedSetup: false })).toBe(false);
  });
});

describe("which endings record the intro as seen", () => {
  it("before the first race Start race and Skip; on request in the solo race only Got it", () => {
    expect(raceIntroEndRecordsSeen("first", "start")).toBe(true);
    expect(raceIntroEndRecordsSeen("first", "skip")).toBe(true);
    for (const opened of ["lobby", "race", "hub"] as const) {
      expect(raceIntroEndRecordsSeen(opened, "done"), opened).toBe(true);
      expect(raceIntroEndRecordsSeen(opened, "close"), opened).toBe(false);
    }
  });
  it("never from multiplayer, whose cards leave out Pro and the hint log", () => {
    expect(raceIntroEndRecordsSeen("multiplayer", "done")).toBe(false);
    expect(raceIntroEndRecordsSeen("multiplayer", "close")).toBe(false);
  });
});

describe("after the intro", () => {
  it("Start race goes to the countdown, Skip to the briefing on a course's first start", () => {
    expect(stepAfterRaceIntro("start", false)).toBe("countdown");
    expect(stepAfterRaceIntro("skip", false)).toBe("briefing");
    expect(stepAfterRaceIntro("skip", true)).toBe("countdown");
  });
  it("moves between four cards and never past either end", () => {
    expect(RACE_INTRO_CARDS).toEqual(["goal", "steer", "wind", "hud"]);
    expect(raceIntroMove(0, "back")).toBe(0);
    expect(raceIntroMove(0, "next")).toBe(1);
    expect(raceIntroMove(3, "next")).toBe(3);
    expect(raceIntroMove(3, "back")).toBe(2);
  });
});

describe("the device record", () => {
  it("reads nothing as not seen and remembers a finished or skipped intro", () => {
    const s = store();
    expect(hasSeenRaceIntro(s)).toBe(false);
    markRaceIntroSeen(s);
    expect(s.values.get(RACE_INTRO_KEY)).toBe("1");
    resetRaceIntroMemory();
    expect(hasSeenRaceIntro(s)).toBe(true);
  });
  it("reads a corrupt row as not seen and survives a storage that throws", () => {
    expect(hasSeenRaceIntro(store({ [RACE_INTRO_KEY]: "yes" }))).toBe(false);
    const broken = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); } };
    expect(hasSeenRaceIntro(broken)).toBe(false);
    markRaceIntroSeen(broken);
    // This visit still remembers: the intro does not open twice.
    expect(hasSeenRaceIntro(broken)).toBe(true);
  });
  it("is in the app's race storage allowlist, so it survives a relaunch", () => {
    const file = readFileSync(join(process.cwd(), "mobile/src/persistence/race-web-storage.ts"), "utf8");
    expect(file).toContain(`"${RACE_INTRO_KEY}"`);
  });
});

describe("the intro copy", () => {
  const texts = (value: unknown): Record<string, string>[] => {
    if (!value || typeof value !== "object") return [];
    const record = value as Record<string, unknown>;
    return typeof record.ru === "string" ? [record as Record<string, string>] : Object.values(record).flatMap(texts);
  };
  it("is complete in every language, with no long dashes or typographic quotes", () => {
    const all = texts(RACE_INTRO_COPY);
    expect(all.length).toBeGreaterThan(14);
    for (const text of all) for (const lang of LANGS) {
      expect(text[lang], `${text.en} in ${lang}`).toMatch(/\S/);
      expect(text[lang]).not.toMatch(new RegExp("[\\u2013\\u2014\\u201c\\u201d\\u2018\\u2019\\u2026]"));
    }
  });
  it("has a card for every step and says the rules the race applies", () => {
    expect(Object.keys(RACE_INTRO_COPY.cards)).toEqual([...RACE_INTRO_CARDS]);
    for (const lang of LANGS) expect(RACE_INTRO_COPY.cards.wind.body[lang]).toContain(`${NO_GO.angleDeg}°`);
    expect(RACE_INTRO_COPY.cards.goal.body.en).toContain("leaving it to port");
    expect(RACE_INTRO_COPY.cards.goal.body.pl).toContain("po lewej burcie");
  });
  it("numbers the step", () => {
    expect(raceIntroStepLabel("en", 2, 4)).toBe("Step 2 of 4");
    expect(raceIntroStepLabel("ru", 4, 4)).toBe("Шаг 4 из 4");
  });
});
