import { describe, expect, it } from "vitest";
import {
  EMPTY_RACE_HOME, RACE_HOME_MAX_DAYS, dailyRaceDay, daysRacedThisWeek, isRaceHomeStoreText, localDay, localWeekStart,
  hasRacedBefore, medalProgress, parseRaceHomeStore, pickRaceNextStep, raceHomeView, recordRaceEnd, storedBestSec, type RaceHomeStore,
} from "./race-next-step";
import { RACE_COACH_PRACTICE } from "../data/race-practice";
import { LEGACY_RACE_CONTEXT, PHYSICAL_RACE_PROFILES, physicalRaceContext } from "./race-context";
import { awardRaceMedal, medalThresholds, type MedalCourse } from "./race-medals";
import { dailySettings } from "./daily-challenge";

// Contract (M4-6): the race menu shows ONE next step, chosen in a fixed order:
// the last race's goal (its main mistake, with its practice), else the next
// medal of the course the start opens, else today's daily race unless it is
// finished today or the menu already is it; none when nothing applies. The
// days count is the local days of this week with a race and never burns:
// a race never removes a day, and nothing counts down.

const course: MedalCourse = { raceContext: LEGACY_RACE_CONTEXT, difficulty: "easy", windStrength: "medium" };
const bronze = { medal: "bronze" as const, underSec: 300, noHints: false };
// Local noon avoids a date line in any test time zone.
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12, 0, 0);
const empty = (): RaceHomeStore => ({ ...EMPTY_RACE_HOME, days: [] });

describe("which next step shows", () => {
  const base = { goal: null, medal: null, today: "2026-11-01", dailyDone: null, inDaily: false } as const;

  it("puts the last race's goal first, with the practice of that mistake", () => {
    for (const goal of ["no-go", "tacks", "close-hauled"] as const) {
      expect(pickRaceNextStep({ ...base, goal, medal: bronze })).toEqual({ kind: "goal", goal, practice: RACE_COACH_PRACTICE[goal] });
    }
  });

  it("shows the next medal of the course when the last race left no goal", () => {
    expect(pickRaceNextStep({ ...base, medal: bronze })).toEqual({ kind: "medal", goal: bronze });
  });

  it("shows today's daily race when there is no goal and no medal left", () => {
    expect(pickRaceNextStep(base)).toEqual({ kind: "daily", day: "2026-11-01" });
    // Yesterday's daily race does not count for today.
    expect(pickRaceNextStep({ ...base, dailyDone: "2026-10-31" })).toEqual({ kind: "daily", day: "2026-11-01" });
  });

  it("shows nothing when today's daily race is finished or the menu already is the daily race", () => {
    expect(pickRaceNextStep({ ...base, dailyDone: "2026-11-01" })).toBeNull();
    expect(pickRaceNextStep({ ...base, inDaily: true })).toBeNull();
  });

  it("ignores a goal kind the race does not know", () => {
    expect(pickRaceNextStep({ ...base, goal: "laylines" as never, medal: bronze })).toEqual({ kind: "medal", goal: bronze });
  });
});

describe("the local race home row", () => {
  it("records the day, this race's goal and a finished daily race", () => {
    const one = recordRaceEnd(empty(), { now: at(2026, 11, 2), goal: "tacks", dailyDay: "2026-11-02", finished: true });
    expect(one).toEqual({ schema: 1, days: ["2026-11-02"], goal: "tacks", dailyDone: "2026-11-02" });
    // The next race replaces the goal, also with none; a race on the same day counts once.
    const two = recordRaceEnd(one, { now: at(2026, 11, 2), goal: null, dailyDay: null, finished: true });
    expect(two).toEqual({ schema: 1, days: ["2026-11-02"], goal: null, dailyDone: "2026-11-02" });
  });

  it("counts a timed-out race as a day but not as a finished daily race", () => {
    const row = recordRaceEnd(empty(), { now: at(2026, 11, 3), goal: "no-go", dailyDay: "2026-11-03", finished: false });
    expect(row.days).toEqual(["2026-11-03"]);
    expect(row.dailyDone).toBeNull();
  });

  it("never moves the finished daily day back for an older daily link", () => {
    const today = recordRaceEnd(empty(), { now: at(2026, 11, 1), goal: null, dailyDay: "2026-11-01", finished: true });
    const old = recordRaceEnd(today, { now: at(2026, 11, 1), goal: null, dailyDay: "2026-10-28", finished: true });
    expect(old.dailyDone).toBe("2026-11-01");
    // A newer daily still moves it forward.
    expect(recordRaceEnd(old, { now: at(2026, 11, 2), goal: null, dailyDay: "2026-11-02", finished: true }).dailyDone).toBe("2026-11-02");
  });

  it("keeps at most two weeks of days, newest last", () => {
    let row = empty();
    for (let d = 1; d <= 20; d++) row = recordRaceEnd(row, { now: at(2026, 10, d), goal: null, dailyDay: null, finished: true });
    expect(row.days).toHaveLength(RACE_HOME_MAX_DAYS);
    expect(row.days.at(-1)).toBe("2026-10-20");
    expect(isRaceHomeStoreText(JSON.stringify(row))).toBe(true);
  });

  it("reads a corrupt row as empty and refuses it as text", () => {
    for (const raw of ["{not json", JSON.stringify({ schema: 2, days: [], goal: null, dailyDone: null }),
      JSON.stringify({ schema: 1, days: ["yesterday"], goal: null, dailyDone: null }),
      JSON.stringify({ schema: 1, days: [], goal: "laylines", dailyDone: null }),
      JSON.stringify({ schema: 1, days: Array.from({ length: 15 }, (_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`), goal: null, dailyDone: null })]) {
      expect(parseRaceHomeStore(raw)).toEqual(EMPTY_RACE_HOME);
      expect(isRaceHomeStoreText(raw)).toBe(false);
    }
    expect(parseRaceHomeStore(null)).toEqual(EMPTY_RACE_HOME);
  });
});

describe("days with a race this week", () => {
  it("counts Monday to today, and a new week starts from what it has, not from a lost streak", () => {
    // 2026-11-02 is a Monday.
    expect(localWeekStart(at(2026, 11, 8))).toBe("2026-11-02");
    expect(localWeekStart(at(2026, 11, 2))).toBe("2026-11-02");
    const row: RaceHomeStore = { ...empty(), days: ["2026-10-31", "2026-11-01", "2026-11-02", "2026-11-04"] };
    expect(daysRacedThisWeek(row, at(2026, 11, 1))).toBe(2); // Sat and Sun of the week before
    expect(daysRacedThisWeek(row, at(2026, 11, 5))).toBe(2); // Mon and Wed
    expect(daysRacedThisWeek(row, at(2026, 11, 9))).toBe(0);
  });

  it("uses the local day for the week and the UTC day for the daily race", () => {
    const now = at(2026, 11, 1);
    expect(localDay(now)).toBe("2026-11-01");
    expect(dailyRaceDay(now)).toBe(now.toISOString().slice(0, 10));
  });
});

describe("record and progress", () => {
  it("reads the record of the course and mode from the best-times row, and nothing from a corrupt one", () => {
    const raw = JSON.stringify({ "easy-medium": { timeSec: 101.4, ts: 1 }, "pro:easy-medium": { timeSec: 99, ts: 1 } });
    expect(storedBestSec(raw, { raceContext: LEGACY_RACE_CONTEXT, mode: "simple", difficulty: "easy", windStrength: "medium" })).toBe(101.4);
    expect(storedBestSec(raw, { raceContext: LEGACY_RACE_CONTEXT, mode: "pro", difficulty: "easy", windStrength: "medium" })).toBe(99);
    expect(storedBestSec(raw, { raceContext: LEGACY_RACE_CONTEXT, mode: "simple", difficulty: "hard", windStrength: "medium" })).toBeNull();
    expect(storedBestSec("{bad", { raceContext: LEGACY_RACE_CONTEXT, mode: "simple", difficulty: "easy", windStrength: "medium" })).toBeNull();
    expect(storedBestSec(JSON.stringify({ "easy-medium": { timeSec: -1, ts: 1 } }), { raceContext: LEGACY_RACE_CONTEXT, mode: "simple", difficulty: "easy", windStrength: "medium" })).toBeNull();
  });

  it("counts the courses with a medal out of the nine legacy courses, none for the physical trial", () => {
    let store = awardRaceMedal({}, course, 200, true)!.store;
    store = awardRaceMedal(store, { ...course, difficulty: "hard", windStrength: "heavy" }, 250, true)!.store;
    expect(medalProgress(store, LEGACY_RACE_CONTEXT)).toEqual({ won: 2, total: 9 });
    expect(medalProgress(store, physicalRaceContext(PHYSICAL_RACE_PROFILES[0]))).toEqual({ won: 0, total: 0 });
  });
});

describe("the menu's view", () => {
  const now = at(2026, 11, 4);
  const view = (patch: Partial<Parameters<typeof raceHomeView>[0]> = {}) =>
    raceHomeView({ home: empty(), medals: {}, bestTimesRaw: null, course, mode: "simple", now, inDaily: false, ...patch });

  it("starts a newcomer on the bronze of the course and offers today's daily race", () => {
    const v = view();
    expect(v.step).toEqual({ kind: "medal", goal: { medal: "bronze", underSec: medalThresholds(course)!.bronzeSec, noHints: false } });
    expect(v.daily).toEqual(dailySettings(dailyRaceDay(now)));
    expect(v.weekDays).toBe(0);
    expect(v.recordSec).toBeNull();
  });

  it("goes to the daily race after gold, and shows no medal or record before a course is chosen", () => {
    const gold = awardRaceMedal({}, course, 60, false)!.store;
    expect(view({ medals: gold }).step).toEqual({ kind: "daily", day: dailyRaceDay(now) });
    const raw = JSON.stringify({ "easy-medium": { timeSec: 100, ts: 1 } });
    expect(view({ bestTimesRaw: raw }).recordSec).toBe(100);
    const unchosen = view({ bestTimesRaw: raw, courseChosen: false });
    expect(unchosen.step?.kind).toBe("daily");
    expect(unchosen.recordSec).toBeNull();
  });
});

// Contract (F1): once this device has ended a solo race, the race menu stops
// calling its easy preset a "first race". A race day in the home row, any
// valid personal best or a race in the app's native history is enough; an
// empty or corrupt row is no race.
describe("has this device raced before", () => {
  it("is false with nothing stored or only corrupt rows", () => {
    expect(hasRacedBefore({ home: empty() })).toBe(false);
    expect(hasRacedBefore({ home: empty(), bestTimesRaw: null, savedRaces: 0 })).toBe(false);
    for (const raw of ["", "{", "[]", "null", "{}", JSON.stringify({ "easy-medium": { timeSec: 0, ts: 1 } }), JSON.stringify({ "easy-medium": "fast" })]) {
      expect(hasRacedBefore({ home: parseRaceHomeStore("{bad"), bestTimesRaw: raw }), raw).toBe(false);
    }
  });

  it("is true after an ended race, a personal best or a saved race in the app", () => {
    expect(hasRacedBefore({ home: recordRaceEnd(empty(), { now: at(2026, 11, 1), goal: null, dailyDay: null, finished: false }) })).toBe(true);
    expect(hasRacedBefore({ home: empty(), bestTimesRaw: JSON.stringify({ "legacy|pro|hard|heavy": { timeSec: 142.5, ts: 1 } }) })).toBe(true);
    expect(hasRacedBefore({ home: empty(), savedRaces: 1 })).toBe(true);
  });
});
