// Package 12 (audit B3 and top-8, expert review C1-C6): the beginner words and
// the rules terms stay fixed. Every check reads the shared data the site and the
// app render (the quiz bank, the rule cards, the glossary, the lessons), never
// code identifiers, the sternik bank or the English radio phrases of the SRC
// course, so it has no false positives there. scripts/sailing-glossary.md
// ("Rules terms and crew roles", "Beginner wind words") holds the decisions.
import { describe, expect, it } from "vitest";
import { BOOTCAMP_QUIZZES, type LocalizedPrompt, type QuizQuestion } from "./bootcamp-quiz";
import { BOOTCAMP_QUIZ_KEY } from "./bootcamp-quiz-key";
import { ruleScenarios } from "./rules";
import { glossaryTerms, racingRules, racingStrategies } from "./sailing-data";
import { bootcampLessons } from "./bootcamp";
import { anatomyParts } from "./anatomy";

const LANGS = ["ru", "en", "pl", "es", "fr", "de", "it"] as const;
const texts = (value: LocalizedPrompt) => LANGS.map(lang => value[lang]).filter((text): text is string => Boolean(text));
const questionTexts = (q: QuizQuestion) => [...texts(q.prompt), ...q.options.flatMap(o => texts(o.label)), ...texts(q.explanation)];
/** Every string field of a record whose key ends with the language suffix (titleRu, descriptionRu...). */
const fields = (record: object, suffix?: string) => Object.entries(record)
  .filter(([key, value]) => typeof value === "string" && (suffix ? key.endsWith(suffix) : /(Ru|En|Pl|Es|Fr|De|It)$/.test(key)))
  .map(([, value]) => value as string);
const sentences = (text: string) => text.split(/(?<=[.!?])\s+/);

describe("lesson 1 check (the first day of the foundation course)", () => {
  const lesson1 = BOOTCAMP_QUIZZES["wind-direction"];

  it("asks about the wind in words: no instrument abbreviation in any prompt or answer, in seven languages", () => {
    expect(lesson1.length).toBeGreaterThanOrEqual(3);
    for (const question of lesson1) {
      for (const lang of LANGS) {
        expect(question.prompt[lang], `${question.id} ${lang}`).toBeTruthy();
        const visible = [question.prompt[lang], ...question.options.map(o => o.label[lang])].join(" | ");
        expect(visible, `${question.id} ${lang}`).not.toMatch(/\b(TWA|AWA|TWS|AWS|TWD|VMG|VMC)\b/);
      }
    }
  });

  it("keeps the stored answers readable: same question and option ids, same correct option", () => {
    expect(lesson1.map(q => ({ id: q.id, options: q.options.map(o => o.id), correct: q.options.find(o => o.correct)?.id })))
      .toEqual(BOOTCAMP_QUIZ_KEY["wind-direction"].map(q => ({ id: q.id, options: [...q.options], correct: q.correct })));
  });
});

describe("quiz answers are fair: plausible mistakes, never jokes", () => {
  // The old joke distractors (audit B3): none of them may come back, in any language.
  const JOKES = [
    /секундомер/i, /без волн/i, /ночью/i, /пугать/i, /крикнет/i, /Я обгоняю/i,
    /stopwatch/i, /no waves/i, /at night/i, /intimidate/i, /shouts first/i, /Shouts "Overtaking/i,
    /stoper/i, /bez fal/i, /straszyć/i, /krzyknie/i, /cronómetro/i, /sin olas/i, /asustar/i, /grite primero/i,
    /chrono/i, /sans vagues/i, /effrayer/i, /crie le premier/i, /Stoppuhr/i, /ohne Wellen/i, /einzuschüchtern/i, /zuerst ruft/i,
    /cronometro/i, /senza onde/i, /spaventare/i, /grida per primo/i,
    /Variable Mast Gear/i, /Vessel Marine GPS/i,
  ];
  it("keeps every former joke distractor out of the whole bank", () => {
    for (const [lesson, questions] of Object.entries(BOOTCAMP_QUIZZES)) {
      for (const question of questions) {
        for (const text of question.options.flatMap(o => texts(o.label))) {
          for (const joke of JOKES) expect(text, `${lesson} ${question.id}`).not.toMatch(joke);
        }
      }
    }
  });
});

describe("VMG and VMC in the quiz (expert C4)", () => {
  const vmg = BOOTCAMP_QUIZZES["vmg-beating"].find(q => q.id === "vmg-q1")!;
  const correct = vmg.options.find(o => o.correct)!;
  const WIND = { ru: /ветр/i, en: /wind/i, pl: /wiatr/i, es: /viento/i, fr: /vent/i, de: /Wind/i, it: /vento/i };
  const MARK = { ru: /цел|знак/i, en: /goal|mark|target/i, pl: /cel|znak/i, es: /objetivo|baliza/i, fr: /objectif|bouée/i, de: /Ziel|Bahnmarke/i, it: /obiettivo|boa\b/i };

  it("defines VMG against the wind and names VMC as the speed toward a mark, in seven languages", () => {
    for (const lang of LANGS) {
      expect(correct.label[lang], lang).toMatch(WIND[lang]);
      expect(correct.label[lang], lang).not.toMatch(MARK[lang]);
      expect(vmg.explanation[lang], lang).toMatch(/\bVMC\b/);
      // The old wrong definition: "VMG is the projection ... onto the direction of the goal".
      for (const sentence of sentences(vmg.explanation[lang]!).filter(s => /\bVMG\b/.test(s) && !/\bVMC\b/.test(s))) {
        expect(sentence, lang).not.toMatch(MARK[lang]);
      }
    }
    // The wrong option is the VMC description, so the item tells the two apart.
    expect(vmg.options.some(o => !o.correct && MARK.ru.test(o.label.ru))).toBe(true);
  });

  it("keeps the lesson summary on the same definition", () => {
    const lesson = bootcampLessons.find(l => l.id === "vmg-beating")!;
    for (const text of fields(lesson, "")) {
      if (!/VMG =/.test(text)) continue;
      const definition = text.slice(text.indexOf("VMG ="), text.indexOf(".", text.indexOf("VMG =")));
      expect(definition).not.toMatch(/цел|goal|celu|objetivo|objectif|Ziel|obiettivo|нужную сторону/i);
    }
  });
});

describe("rules terms (expert C1, C3)", () => {
  it("says перекрытие in Russian racing text, never связка or a Latin overlap / mark-room", () => {
    const ruTexts = [
      ...ruleScenarios.filter(r => r.source !== "colregs").flatMap(r => fields(r, "Ru")),
      ...racingRules.flatMap(r => fields(r, "Ru")),
      ...racingStrategies.flatMap(r => [...fields(r, "Ru"), ...(Array.isArray((r as { tips?: unknown }).tips) ? ((r as { tips: { ru?: string }[] }).tips.map(t => t.ru ?? "")) : [])]),
      ...glossaryTerms.flatMap(t => fields(t, "Ru")),
    ];
    expect(ruTexts.length).toBeGreaterThan(50);
    for (const text of ruTexts) {
      expect(text).not.toMatch(/связк/i);
      expect(text).not.toMatch(/\boverlap\b/i);
      expect(text).not.toMatch(/mark-room/i);
    }
    expect(glossaryTerms.find(t => t.id === "race-overlap")?.termRu).toBe("Перекрытие");
  });

  // "Right of way" (and "priority") is a racing-rules word. A COLREGS sentence
  // says who gives way and who keeps course and speed instead.
  const RIGHT_OF_WAY = /прав\S* дороги|приоритет|right of way|priority|prawo drogi|prawa drogi|pierwszeństw|derecho de paso|preferencia|prioritaire|priorité|privilégié|Wegerecht|Vorrang|diritto di rotta|precedenza/i;
  const COLREG = /МППСС|COLREG|MPZZM|RIPAM?\b|KVR\b/;

  it("keeps right of way out of every COLREGS card, in seven languages", () => {
    const colregs = ruleScenarios.filter(r => r.source === "colregs");
    expect(colregs.length).toBeGreaterThanOrEqual(8);
    for (const card of colregs) for (const text of fields(card)) expect(text, card.id).not.toMatch(RIGHT_OF_WAY);
  });

  it("never pairs right of way with the COLREGS in one sentence (quiz, rule cards, glossary)", () => {
    const pool = [
      ...Object.values(BOOTCAMP_QUIZZES).flat().flatMap(questionTexts),
      ...ruleScenarios.flatMap(r => fields(r)),
      ...glossaryTerms.flatMap(t => fields(t)),
      ...racingRules.flatMap(r => fields(r)),
    ];
    const hits = pool.flatMap(sentences).filter(s => COLREG.test(s) && RIGHT_OF_WAY.test(s));
    expect(hits).toEqual([]);
  });

  it("explains the COLREGS side of the port and starboard quiz with give way and stand on", () => {
    const sr1 = BOOTCAMP_QUIZZES["simple-rules"].find(q => q.id === "sr-q1")!;
    expect(sr1.explanation.ru).toMatch(/уступает дорогу/);
    expect(sr1.explanation.ru).toMatch(/сохраняет курс и скорость/);
    expect(sr1.explanation.en).toMatch(/gives way/);
    expect(sr1.explanation.en).toMatch(/stands on/);
  });
});

describe("glossary terms (expert C2, C5, C6)", () => {
  const term = (id: string) => glossaryTerms.find(t => t.id === id);

  it("keeps skipper and helmsman as two entries, in seven languages", () => {
    const skipper = term("skipper")!;
    const helmsman = term("helmsman")!;
    expect(skipper).toBeDefined();
    expect(helmsman).toBeDefined();
    expect(fields(skipper).join(" ")).not.toMatch(/рулевой\)|Helmsman|\(sternik\)|\(timonel\)|\(barreur\)|\(Rudergänger\)|\(timoniere\)/);
    expect([helmsman.termRu, helmsman.termEn, helmsman.termPl, helmsman.termEs, helmsman.termFr, helmsman.termDe, helmsman.termIt])
      .toEqual(["Рулевой", "Helmsman", "Sternik", "Timonel", "Barreur", "Rudergänger", "Timoniere"]);
  });

  it("puts the start line between the committee boat and the pin, not between two buoys", () => {
    const start = term("race-start-line")!;
    expect(start.definitionRu).toMatch(/судне комиссии/);
    expect(start.definitionEn).toMatch(/committee boat/);
    expect(start.definitionPl).toMatch(/komisji/);
    expect(start.definitionEs).toMatch(/comité/);
    expect(start.definitionFr).toMatch(/comité/);
    expect(start.definitionDe).toMatch(/Startschiff/);
    expect(start.definitionIt).toMatch(/comitato/);
    for (const text of fields(start)) expect(text).not.toMatch(/двумя|two marks|dwoma|dos balizas|deux bouées|zwei Tonnen|due boe/i);
  });

  it("has a VMG, a VMC, a give-way and a stand-on entry in seven languages", () => {
    for (const id of ["vmg", "vmc", "give-way", "stand-on"]) {
      const entry = term(id)!;
      expect(entry, id).toBeDefined();
      expect(fields(entry, "").length, id).toBe(14);
    }
    expect(term("stand-on")!.termRu).toMatch(/курс и скорость/);
  });

  it("says the crew sits on the windward side, never откренивание, in beginner text", () => {
    const ruTexts = [
      ...glossaryTerms.flatMap(t => fields(t, "Ru")),
      ...anatomyParts.flatMap(p => fields(p, "Ru")),
      ...bootcampLessons.flatMap(l => fields(l, "Ru")),
      ...Object.values(BOOTCAMP_QUIZZES).flat().flatMap(q => [q.prompt.ru, ...q.options.map(o => o.label.ru), q.explanation.ru]),
    ];
    for (const text of ruTexts) expect(text).not.toMatch(/откренив/i);
    expect(term("hiking")!.definitionRu).toMatch(/наветренный борт/);
  });
});
