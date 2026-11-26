// Package 7 (audit K4), D1 contract: one term and one number for the no-go
// zone (src/data/no-go-zone.ts).
// - Teaching copy (every src/data module except the race's own copy): in a
//   sentence that names the no-go zone or close-hauled sailing, the closest
//   wind angle (20-90 deg: helm, heel and trim tolerances are smaller) is
//   NO_GO_HALF_DEG; a range may run freer, never inside the zone.
// - Race copy (intro, missions, next step, finish screen, the local coach and
//   the AI coach's prompt, the briefing): no angle at all in such a sentence;
//   the legacy race sails the classic boat with its own zone and points to
//   the suggested course instead.
// - Source: the teaching modules never type the number (they import it).
// Each rule fails on the strings package 7 replaced (30 / 40 / 45 / "~90").

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NO_GO_HALF_DEG } from "@/lib/sailing-physics/constants";
import { analyseRaceLocallyWithFocus } from "@/lib/fallback-coach";
import { ENABLED_LANGUAGES } from "@/lib/languages";
import { FINISH_COPY } from "@/app/game/race-finish-summary";
import { NO_GO_DEG, NO_GO_GLOSSARY_ID, NO_GO_TERM } from "./no-go-zone";
import { glossaryTerms } from "./sailing-data";

const NO_GO = /мёртв|мертв|no-go|k[ąa]\S* martw|zona muerta|zone morte|tote[nrm]? winkel|totzone|angolo morto|strefe martwa/i;
const CLOSE_HAULED = /бейдевинд|close-hauled|bajdewind|ceñida|(?<![a-zà-ÿ])près(?![a-zà-ÿ])|am wind|bolina|лавир|beating|halsówk|louvoy|kreuz|bordegg/i;
// An angle or a range of angles ("42-50°", "3 bis 5 Grad").
const ANGLE = /(\d+(?:[.,]\d+)?)(?:\s*(?:-|à|bis|a)\s*(\d+(?:[.,]\d+)?))?\s*(?:°|degrees?\b|градус|stopni|grados?\b|degrés?\b|grad\b|gradi\b)/gi;
/** Wind angles only: helm, heel, angle of attack and tolerances sit below 20. */
const WIND_ANGLES = { min: 20, max: 90 };
const LANGS = ENABLED_LANGUAGES.map((l) => l.id);

/** Every string inside a value (objects, arrays, functions skipped). */
function strings(value: unknown, out: string[] = [], seen = new Set<unknown>()): string[] {
  if (typeof value === "string") out.push(value);
  else if (value && typeof value === "object" && !seen.has(value)) {
    seen.add(value);
    for (const v of Array.isArray(value) ? value : Object.values(value)) strings(v, out, seen);
  }
  return out;
}

const sentences = (text: string) => text.split(/(?<=[.!?])\s+/);
const angles = (sentence: string) => [...sentence.matchAll(ANGLE)].flatMap((m) => [m[1], m[2]].filter(Boolean).map((n) => Number(n.replace(",", "."))));
const windAngles = (sentence: string) => angles(sentence).filter((n) => n >= WIND_ANGLES.min && n <= WIND_ANGLES.max);

/** Teaching rule violations: a sentence about the zone or the beat whose
 * closest wind angle is not the no-go edge (a range may run freer). */
function teachingViolations(texts: readonly string[]): string[] {
  const bad: string[] = [];
  for (const text of texts) for (const s of sentences(text)) {
    const a = windAngles(s);
    if (a.length && (NO_GO.test(s) || CLOSE_HAULED.test(s)) && Math.min(...a) !== NO_GO_HALF_DEG) bad.push(s);
  }
  return bad;
}

/** Race rule violations: a no-go or close-hauled sentence with any angle. */
function raceViolations(texts: readonly string[]): string[] {
  return texts.flatMap((text) => sentences(text).filter((s) => (NO_GO.test(s) || CLOSE_HAULED.test(s)) && angles(s).length > 0));
}

// The race's own copy (legacy race, classic boat): file names under src/data.
const RACE_FILES = /^\.\/(race-|missions)/;
const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts", "!./**/*.fixture*.ts"], { eager: true }) as Record<string, Record<string, unknown>>;
const teaching = Object.entries(modules).filter(([path]) => !RACE_FILES.test(path));
const race = Object.entries(modules).filter(([path]) => RACE_FILES.test(path));

/** The local race coach's copy in all seven languages: logs that trigger its
 * no-go, time-in-no-go, slow close-hauled and tack findings and goals. */
function coachTexts(): string[] {
  const out: string[] = [];
  const course = { windDirection: 0, windwardMark: { x: 400, y: 100 }, startY: 1050 };
  const stalled = Array.from({ length: 200 }, (_, i) => ({ t: i * 0.5, x: 400, y: 1000 - i, heading: 0, twa: i % 20 < 8 ? 10 : 44, speed: i % 20 < 8 ? 0.5 : 2.4, lap: 0 }));
  const slow = Array.from({ length: 200 }, (_, i) => ({ t: i * 0.5, x: 400, y: 1000 - i, heading: 45, twa: 45, speed: 2, lap: 0 }));
  const tacks = Array.from({ length: 12 }, (_, i) => ({ type: "tack" as const, t: 5 + i * 6 }));
  for (const lang of LANGS) {
    for (const [samples, finishTime] of [[stalled, 120], [slow, 120], [slow, null]] as const) {
      out.push(...strings(analyseRaceLocallyWithFocus({ difficulty: "easy", courseInfo: course, finishTime, position: 3, totalBoats: 3,
        samples: [...samples], events: [{ type: "start", t: 0 }, ...tacks] }, lang).coaching));
    }
  }
  return out;
}

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("one no-go number in teaching copy", () => {
  it("the article and the number are the engine's", () => {
    expect(NO_GO_DEG).toBe(NO_GO_HALF_DEG);
    const article = glossaryTerms.find((t) => t.id === NO_GO_GLOSSARY_ID)!;
    expect(article.termRu.toLowerCase()).toBe(NO_GO_TERM.ru);
    expect(article.termEn.toLowerCase()).toBe(NO_GO_TERM.en);
    for (const lang of LANGS) {
      const def = article[`definition${lang[0].toUpperCase()}${lang[1]}` as "definitionRu"] as string;
      expect(def, lang).toContain(`±${NO_GO_HALF_DEG}°`);
    }
  });

  it(`every teaching sentence about the zone or the beat states ${NO_GO_HALF_DEG}`, () => {
    expect(teaching.length).toBeGreaterThan(30);
    const bad = teaching.flatMap(([path, mod]) => teachingViolations(strings(mod)).map((s) => `${path}: ${s}`));
    expect(bad).toEqual([]);
  });

  it("the teaching modules import the number instead of typing it", () => {
    const files = ["src/data/sailing-data.ts", "src/data/bootcamp-quiz.ts", "src/data/bootcamp.ts", "src/data/drills.ts", "src/data/foundation-wind.ts",
      "src/features/simulator-v3/ui/panels/TourOverlay.tsx", "src/features/simulator-v3/ui/GlossaryFooter.tsx",
      "mobile/src/design-system/components/LessonDiagram.tsx"];
    const typed = new RegExp(`(?<![\\d.$])(?:30|35|40|${NO_GO_HALF_DEG}|45)\\s*(?:°|degrees|градус|stopni|grados|degrés|Grad\\b|gradi)`);
    for (const file of files) {
      const hits = source(file).split("\n").filter((line) => (NO_GO.test(line) || CLOSE_HAULED.test(line)) && typed.test(line));
      expect(hits, file).toEqual([]);
    }
  });
});

describe("race copy states no no-go angle", () => {
  it("intro, missions, next step and the finish screen", () => {
    expect(race.map(([path]) => path)).toEqual(expect.arrayContaining(["./race-intro-copy.ts", "./race-next-step-copy.ts", "./missions.ts"]));
    const bad = [...race.flatMap(([path, mod]) => raceViolations(strings(mod)).map((s) => `${path}: ${s}`)),
      ...raceViolations(strings(FINISH_COPY)).map((s) => `FINISH_COPY: ${s}`)];
    expect(bad).toEqual([]);
  });

  it("the local race coach in all seven languages", () => {
    const texts = coachTexts();
    expect(texts.some((t) => NO_GO.test(t))).toBe(true);
    expect(texts.some((t) => CLOSE_HAULED.test(t))).toBe(true);
    expect(raceViolations(texts)).toEqual([]);
  });

  it("the briefing and the AI coach's prompt", () => {
    for (const file of ["src/app/game/RaceBriefing.tsx", "src/app/api/coach/route.ts"]) {
      const hits = source(file).split("\n").filter((line) => NO_GO.test(line) && (angles(line).length > 0 || /TWA\s*<\s*\d/.test(line)));
      expect(hits, file).toEqual([]);
    }
  });
});
