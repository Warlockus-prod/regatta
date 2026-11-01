import { describe, expect, it } from "vitest";
import { RACE_COACH_PRACTICE, RACE_JUDGE_PRACTICE } from "../data/race-practice";
import { bootcampLessonHeads } from "../data/bootcamp-index";
import {
  isRaceFinishNativeHref, practiceForCoachMistake, practiceForJudgeItem, raceLessonLinks, racePracticeHref, racePracticeLabel, racePracticeNativeHref,
} from "./race-practice";
import { decodeRaceSetup, encodeRaceSetup, raceReturnFor, raceReturnHref, readRaceReturn, type RaceReturn } from "./race-return";
import { analyseRaceLocally, coachMistakeKind, mirrorCoachKeys, type Coaching } from "./fallback-coach";

type RaceLog = Parameters<typeof analyseRaceLocally>[0];

// Contract (M4-2): a practice link from the race debrief opens the mapped
// practice and carries the race to return to; the practice page's "Back to
// the race" rebuilds exactly the /game link of that race (same setup, same
// lesson return). The app only opens destinations from the shared mapping.

const search = (href: string) => new URL(href, "https://local.invalid").search;

describe("practice hrefs", () => {
  const ret = raceReturnFor({ difficulty: "hard", windStrength: "light", fromLesson: "mini-race" });

  it("links a rule card, a lesson step and a trainer drill, with the race return", () => {
    expect(racePracticeHref({ kind: "rule", id: "start-line" }, ret)).toBe("/rules?rule=start-line&fromRace=hard.light&raceLesson=mini-race");
    expect(racePracticeHref({ kind: "lesson", id: "tacking" }, ret)).toBe("/start?lesson=tacking&step=understand&fromRace=hard.light&raceLesson=mini-race");
    expect(racePracticeHref({ kind: "drill", id: "hold-trim" }, { ...ret, lesson: null })).toBe("/simulator-v3?drill=hold-trim&fromRace=hard.light");
    expect(racePracticeHref({ kind: "rule", id: "start-line" }, null)).toBe("/rules?rule=start-line");
  });

  it("keeps the return target through the practice route: back leads to the same race and lesson", () => {
    const cases: RaceReturn[] = [
      ret,
      raceReturnFor({ difficulty: "easy", windStrength: "heavy" }),
      raceReturnFor({ difficulty: "medium", windStrength: "medium", missionId: "clean-laps" }),
      raceReturnFor({ difficulty: "medium", windStrength: "heavy", dailyDay: "2026-11-01", fromLesson: "unknown-lesson" }),
    ];
    const expected = ["/game?difficulty=hard&wind=light&fromLesson=mini-race", "/game?difficulty=easy&wind=heavy", "/game?mission=clean-laps", "/game?daily=2026-11-01"];
    cases.forEach((race, i) => {
      for (const target of [...Object.values(RACE_JUDGE_PRACTICE), ...Object.values(RACE_COACH_PRACTICE)]) {
        const back = readRaceReturn(search(racePracticeHref(target, race)));
        expect(back, `${target.id}`).toEqual(race);
        expect(raceReturnHref(back!)).toBe(expected[i]);
      }
    });
  });

  it("shows no race return inside the app, an embed or without a valid setup", () => {
    const link = search(racePracticeHref({ kind: "rule", id: "penalty" }, ret));
    expect(readRaceReturn(link, true)).toBeNull();
    expect(readRaceReturn(`${link}&embed=1`)).toBeNull();
    for (const token of ["", "https://evil.test", "medium", "medium.storm", "hard.light.extra", "mission.../x", "daily.tomorrow", "menu.x"]) {
      expect(readRaceReturn(`?fromRace=${encodeURIComponent(token)}`), token).toBeNull();
    }
    // An unknown lesson is dropped, the race return stays.
    expect(readRaceReturn("?fromRace=menu&raceLesson=https://evil.test")).toEqual({ setup: { kind: "menu" }, lesson: null });
    expect(raceReturnHref({ setup: { kind: "menu" }, lesson: null })).toBe("/game");
    for (const setup of [{ kind: "menu" }, { kind: "daily", day: "2026-01-02" }, { kind: "mission", id: "sub-90" }, { kind: "conditions", difficulty: "easy", wind: "medium" }] as const) {
      expect(decodeRaceSetup(encodeRaceSetup(setup))).toEqual(setup);
    }
  });

  it("gives the app in-app destinations and accepts only those", () => {
    expect(racePracticeNativeHref({ kind: "rule", id: "start-line" })).toBe("/rules/start-line");
    expect(racePracticeNativeHref({ kind: "lesson", id: "tacking" })).toBe("/bootcamp/tacking");
    expect(racePracticeNativeHref({ kind: "drill", id: "hold-trim" })).toBe("/simulator-v3?drill=hold-trim");
    for (const target of [...Object.values(RACE_JUDGE_PRACTICE), ...Object.values(RACE_COACH_PRACTICE)]) expect(isRaceFinishNativeHref(racePracticeNativeHref(target))).toBe(true);
    for (const lesson of bootcampLessonHeads) expect(isRaceFinishNativeHref(`/bootcamp/${lesson.id}`)).toBe(true);
    expect(isRaceFinishNativeHref("/learn/sails")).toBe(true);
    for (const href of ["/rules/no-such-card", "/rules/../settings", "/bootcamp/unknown", "/settings", "https://evil.test", "//evil.test", "/simulator-v3?drill=hold-trim&x=1", null, 42]) {
      expect(isRaceFinishNativeHref(href), String(href)).toBe(false);
    }
  });
});

describe("which practice a debrief item opens", () => {
  it("judge items open their mapped practice, the start jostle none", () => {
    expect(practiceForJudgeItem({ lesson: "keep-clear-port" })).toEqual({ kind: "rule", id: "port-vs-starboard" });
    expect(practiceForJudgeItem({ lesson: "round-to-port" })).toEqual({ kind: "lesson", id: "mini-race" });
    expect(practiceForJudgeItem({ lesson: "start-jostle", jostle: true })).toBeNull();
  });

  it("coach mistakes open their kind's practice; an unknown or missing kind opens none", () => {
    expect(practiceForCoachMistake({ kind: "no-go" })).toEqual({ kind: "lesson", id: "wind-direction" });
    expect(practiceForCoachMistake({ kind: "close-hauled" })).toEqual({ kind: "lesson", id: "vmg-beating" });
    for (const kind of ["other", "mark", "", undefined, 3]) expect(practiceForCoachMistake({ kind })).toBeNull();
    expect(practiceForCoachMistake(undefined)).toBeNull();
  });

  it("names the practice in the reader's language", () => {
    expect(racePracticeLabel({ kind: "lesson", id: "wind-direction" }, "en")).toBe("Lesson 1. Wind & direction");
    expect(racePracticeLabel({ kind: "rule", id: "start-line" }, "pl")).toBe("Karta przepisu: Linia startu");
    expect(racePracticeLabel({ kind: "lesson", id: "tacking" }, "ru")).toBe("Урок 4. Поворот оверштаг");
  });
});

describe("the local coach and the AI answer carry the mistake kind", () => {
  it("each local coach mistake has the kind the coach ranked it by", () => {
    // Head to wind for most of the race: the no-go zone mistakes.
    const samples = Array.from({ length: 120 }, (_, i) => ({ t: i * 0.5, x: 0, y: -i, heading: 0, twa: i % 10 < 6 ? 5 : 45, speed: i % 10 < 6 ? 0.5 : 5, lap: 0 }));
    const events = [10, 20, 30, 40].map(t => ({ type: "no-go-entered", t }));
    const log = { difficulty: "easy", courseInfo: { windDirection: 0, windwardMark: { x: 0, y: -500 }, startY: 0 }, finishTime: null, position: 3, totalBoats: 3, samples, events } as RaceLog;
    const coaching = analyseRaceLocally(log, "en");
    expect(coaching.mistakes.length).toBeGreaterThan(0);
    for (const m of coaching.mistakes) expect(coachMistakeKind(m)).not.toBeNull();
    expect(coaching.mistakes.some(m => m.kind === "no-go")).toBe(true);
  });

  it("keeps a known kind from an AI answer and drops any other", () => {
    const base = { timeStart: 0, timeEnd: 5, severity: "minor" as const, titleRu: "t", explanationRu: "e", fixRu: "f" };
    const raw = { overall: "o", score: 50, strengths: [], nextGoalRu: "g", mistakes: [{ ...base, kind: "tacks" }, { ...base, kind: "other" }, { ...base, kind: "<script>" }, base] } as unknown as Coaching;
    const kinds = mirrorCoachKeys(raw).mistakes.map(m => m.kind);
    expect(kinds).toEqual(["tacks", undefined, undefined, undefined]);
    expect(mirrorCoachKeys(raw).mistakes.map(m => "kind" in m)).toEqual([true, false, false, false]);
  });
});

describe("the return of a lesson race (lesson 8, the mini race)", () => {
  it("goes back to the lesson's practice step and on to the sails course after the last lesson", () => {
    expect(raceLessonLinks("mini-race", "en", false)).toEqual({
      back: { href: "/start?lesson=mini-race&step=practice", label: "Back to the lesson" },
      next: { href: "/learn/sails", label: "Next course: Working with sails" },
    });
    expect(raceLessonLinks("mini-race", "ru", true)).toEqual({
      back: { href: "/race", label: "Вернуться к уроку" },
      next: { href: "/learn/sails", label: "Следующий курс: Работа с парусами" },
    });
  });

  it("offers the next lesson before the last one, and nothing for an unknown lesson", () => {
    expect(raceLessonLinks("tacking", "en", false)?.next).toEqual({ href: "/start?lesson=jibing&step=understand", label: "Next lesson: Jibing (gybing)" });
    expect(raceLessonLinks("tacking", "en", true)?.next.href).toBe("/bootcamp/jibing");
    expect(raceLessonLinks("unknown", "en", false)).toBeNull();
  });
});
