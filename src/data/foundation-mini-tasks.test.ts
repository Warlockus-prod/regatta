// Language pass of build 81: the words of the in-lesson task and the name of the
// leaderboard stay fixed. scripts/sailing-glossary.md ("In-lesson tasks and the
// leaderboard name") holds the decisions.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { foundationWebCopy } from "../app/start/copy";
import { destinations, type Language } from "../lib/product/catalog";
import { TRAINER_SWITCHER_LABEL } from "../lib/product/trainer-names";
import { foundationMiniTasks, miniTaskCopy } from "./foundation-mini-tasks";
import { LEADERBOARD_WAITING_COPY } from "./leaderboard-waiting-copy";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const prompts = (lesson: string, lang: Language) => foundationMiniTasks[lesson].targets.map(target => target.prompt[lang]);
const board = destinations.find(destination => destination.id === "leaderboard")!;

describe("in-lesson task words", () => {
  it("the slider is held at an angle, never on a word that means a race mark", () => {
    const raceMark: Record<Language, RegExp> = { ru: /знак/i, en: /\bmark\b/i, pl: /znak/i, es: /marca|baliza/i, fr: /marque|bou[ée]e|rep[èe]re/i, de: /marke|tonne/i, it: /segno|\bboa\b/i };
    for (const lang of Object.keys(raceMark) as Language[]) expect(miniTaskCopy.hold[lang]).not.toMatch(raceMark[lang]);
  });

  it("the sailing verbs follow the glossary", () => {
    expect(miniTaskCopy.noGo.it).toContain("fileggiano");
    expect(foundationMiniTasks["points-of-sail"].done.es).toContain("se lasca");
    expect(prompts("jibing", "it")[1]).toContain("strambare");
  });

  it("Italian 'until' keeps its negative: finché without non means 'as long as'", () => {
    for (const prompt of prompts("wind-direction", "it").filter(text => text.includes("finché"))) expect(prompt).toContain("finché il vento non");
  });

  it("a bare Spanish 'Arriba:' does not open the gybe, it reads as 'up'", () => {
    expect(prompts("jibing", "es")[0]).not.toMatch(/^Arriba:/);
  });

  it("the French more-practice button cannot read as 'no more practice'", () => {
    expect(miniTaskCopy.fullPractice.fr).not.toMatch(/^Plus de/);
  });

  it("the lesson calls it an exercise, not homework", () => {
    for (const text of [foundationWebCopy.practiced, foundationWebCopy.practiceNote, foundationWebCopy.progressNote]) {
      expect(text.es).not.toMatch(/tarea/i);
      expect(text.fr).not.toMatch(/t[âa]che/i);
      expect(text.it).not.toMatch(/compit/i);
    }
  });
});

describe("one name for the leaderboard", () => {
  const named: Language[] = ["ru", "en", "pl", "es", "fr", "de", "it"];

  it("the message under 10 results names the board the menu names", () => {
    for (const lang of named) expect(LEADERBOARD_WAITING_COPY.title[lang].toLowerCase()).toContain(board.title[lang].toLowerCase());
  });

  it("the page heading and the menu agree in every language", () => {
    const heading = source("src/app/leaderboard/leaderboard-copy.ts");
    for (const lang of named) expect(heading).toContain(`${lang}: "${board.title[lang]}"`);
  });

  it("Russian says Результаты гонок everywhere, owner's decision 2026-11-05", () => {
    expect(board.title.ru).toBe("Результаты гонок");
    for (const path of ["src/app/leaderboard/leaderboard-copy.ts", "src/app/game/RaceResults.tsx", "src/app/multiplayer/MultiplayerClient.tsx", "src/app/support/page.tsx", "mobile/app/leaderboard/index.tsx"]) {
      expect(source(path)).not.toMatch(/[Лл]идерборд|[Тт]аблиц\S* (лучших|лидеров)/);
    }
  });

  it("the nickname prompt says the same word, and the old German word is gone", () => {
    const prompt = source("src/app/game/RaceResults.tsx");
    expect(prompt).not.toMatch(/the table shows|w tabeli będzie|la tabla mostrará|le tableau affichera|in der Tabelle|in tabella/);
    expect(source("src/app/support/page.tsx")).not.toContain("Rangliste");
  });
});

it("the German switcher does not reuse the word of the AI coach, KI-Trainer", () => {
  expect(TRAINER_SWITCHER_LABEL.de).toBe("Simulatoren");
});
