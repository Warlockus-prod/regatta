import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { UI_TERMS, sections, type Language } from "./catalog";
import { TRAINER_TERMS } from "./trainer-terms";
import { RACE_MODE_LABELS } from "@/app/game/race-mode-labels";
import { FINISH_COPY } from "@/app/game/race-finish-summary";
import { RACE_RECORD_COPY } from "@/lib/race-record-copy";
import { RACE_UNITS } from "@/features/race-hud/units";
import { RACE_HINT_LOG_COPY } from "@/data/race-hint-log-copy";
import { raceCopy } from "../../../mobile/src/game/copy";
import { homeCopy } from "../../../mobile/src/home/copy";

/**
 * Package 10: the site and the app name the same thing the same way. Every
 * shared word comes from UI_TERMS (src/lib/product/ui-terms.ts); this test
 * fails when one side forks a term or drifts from the other.
 */

const ROOT = path.resolve(__dirname, "../../..");
const LANGS: Language[] = ["ru", "en", "pl", "es", "fr", "de", "it"];
// En and em dash by code point, so this file itself stays free of them (AGENTS.md rule 1).
const TYPOGRAPHIC_DASH = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");

describe("one UI dictionary (package 10)", () => {
  it("every term has seven non-empty words without typographic dashes", () => {
    for (const [term, label] of Object.entries(UI_TERMS)) {
      expect(Object.keys(label).sort(), term).toEqual([...LANGS].sort());
      for (const lang of LANGS) {
        expect(label[lang].trim(), `${term}.${lang}`).not.toBe("");
        expect(label[lang], `${term}.${lang}`).not.toMatch(TYPOGRAPHIC_DASH);
      }
    }
  });

  it("keeps the owner's decisions (R-12 mode names, ё, ИИ, brand, Russian units)", () => {
    expect(UI_TERMS.modeSimple.ru).toBe("Простой");
    for (const lang of LANGS) expect(UI_TERMS.modePro[lang]).toBe("Pro");
    expect(UI_TERMS.again.ru).toBe("Ещё раз");
    expect(UI_TERMS.aiCoach.ru).toBe("ИИ-тренер");
    for (const lang of LANGS) expect(UI_TERMS.brand[lang]).toBe("Week to Regatta");
    expect(UI_TERMS.raceSection.pl).toBe("Regaty");
    expect(UI_TERMS.race.pl).toBe("Wyścig");
    expect([UI_TERMS.knots.ru, UI_TERMS.metres.ru, UI_TERMS.minutes.ru]).toEqual(["уз", "м", "мин"]);
  });

  it("the site reads its race words from the dictionary", () => {
    expect(RACE_MODE_LABELS.simple).toEqual(UI_TERMS.modeSimple);
    expect(RACE_MODE_LABELS.pro).toEqual(UI_TERMS.modePro);
    expect(RACE_RECORD_COPY.simple).toEqual(UI_TERMS.modeSimple);
    expect(RACE_RECORD_COPY.pro).toEqual(UI_TERMS.modePro);
    expect(FINISH_COPY.again).toEqual(UI_TERMS.again);
    expect(RACE_UNITS).toBe(UI_TERMS);
    expect(RACE_UNITS.knots).toEqual(UI_TERMS.knots);
    expect(RACE_UNITS.metres).toEqual(UI_TERMS.metres);
    expect(RACE_UNITS.seconds).toEqual(UI_TERMS.seconds);
    expect(RACE_HINT_LOG_COPY.kinds.race).toEqual(UI_TERMS.race);
    expect(sections.find((s) => s.id === "race")?.title).toEqual(UI_TERMS.raceSection);
  });

  it("the app shows the same words as the site", () => {
    expect(raceCopy.simple).toEqual(RACE_MODE_LABELS.simple);
    expect(raceCopy.pro).toEqual(RACE_MODE_LABELS.pro);
    expect(homeCopy.brand).toEqual(UI_TERMS.brand);
  });

  // Screens that render a term inline must name it through UI_TERMS (not a
  // literal of their own): [file, terms it shows].
  const INLINE: [string, (keyof typeof UI_TERMS)[]][] = [
    ["src/app/game/race-copy.ts", ["raceDebrief"]],
    ["src/app/game/replay-copy.ts", ["race"]],
    ["src/app/game/RaceResults.tsx", ["aiCoach"]],
    ["src/app/r/[code]/ReplayViewer.tsx", ["modeSimple", "modePro", "seconds"]],
    ["src/app/multiplayer/MultiplayerCockpit.tsx", ["brandShort"]],
    ["src/components/product/HomeView.tsx", ["brand"]],
    ["src/app/sternik/SternikHub.tsx", ["minutes"]],
    ["src/app/spots/page.tsx", ["knots", "metres"]],
    ["src/features/simulator-3d/Simulator3D.tsx", ["knots"]],
    ["mobile/src/game/SharedRaceHost.tsx", ["race"]],
    ["mobile/app/coach/index.tsx", ["raceDebrief", "aiCoach"]],
    ["mobile/app/spots/index.tsx", ["knots", "metres"]],
    ["mobile/src/design-system/components/WindNowCard.tsx", ["knots", "metres"]],
  ];

  it.each(INLINE)("%s reads its terms from UI_TERMS", (file, terms) => {
    const source = read(file);
    for (const term of terms) expect(source, `${file} -> UI_TERMS.${term}`).toContain(`UI_TERMS.${term}`);
  });

  // Screens that reach a term through a module already holding it (the race
  // copy hook, RACE_UNITS, which IS the dictionary) instead of a literal.
  it.each([
    ["src/app/game/GameMenu.tsx", "raceCopy.race"],
    ["src/features/simulator-v3/ui/pods/MainTrimPod.tsx", "RACE_UNITS.metres"],
    ["src/features/simulator-v3/ui/pods/ShapeTrimControls.tsx", "RACE_UNITS.metres"],
  ])("%s reads its term through %s", (file, access) => {
    expect(read(file)).toContain(access);
  });

  it("app copy never keeps its own copy of a dictionary word", () => {
    const mobileCopy = (dir: string, out: string[] = []): string[] => {
      for (const entry of readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) mobileCopy(rel, out);
        else if (entry.name === "copy.ts") out.push(rel);
      }
      return out;
    };
    const files = [...mobileCopy("mobile/src"), ...INLINE.map(([file]) => file).filter((file) => file.startsWith("mobile/"))];
    expect(files).toEqual(expect.arrayContaining(["mobile/src/game/copy.ts", "mobile/src/home/copy.ts"]));
    // Distinctive dictionary words (Russian and the brand): a literal equal to one is a fork.
    const words = new Map<string, string>();
    for (const [term, label] of Object.entries({ ...UI_TERMS, ...TRAINER_TERMS })) {
      if (/[А-Яа-яЁё]{3,}/.test(label.ru)) words.set(label.ru, term);
    }
    words.set(UI_TERMS.brand.en, "brand");
    words.set(UI_TERMS.brand.en.toUpperCase(), "brand");
    const forks: string[] = [];
    for (const file of files) {
      const sf = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      const visit = (node: ts.Node) => {
        if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && words.has(node.text) && !ts.isImportDeclaration(node.parent)) {
          forks.push(`${file}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1} "${node.text}" (use UI_TERMS.${words.get(node.text)})`);
        }
        ts.forEachChild(node, visit);
      };
      visit(sf);
    }
    expect(forks).toEqual([]);
  });
});
