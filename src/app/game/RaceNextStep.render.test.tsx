import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// M4-6 contract: the website race lobby shows ONE next-step card on top: the
// last race's goal with its practice link (carrying the race to return to),
// or the course medal line with the next medal (then not a second time below),
// or today's daily race with its link; plus the record, the medal progress
// and the days with a race this week (no line at zero, no streak). The lobby
// always has an entry to today's daily race (in the card or as its own row),
// and still exactly one primary action. Nothing for the app (the native hub
// shows it) or the physical trial.

vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./RaceCockpit", () => ({ RaceModePicker: () => null }));
vi.mock("@/components/FoundationReturn", () => ({ FoundationReturn: () => null }));
vi.mock("next/link", () => ({
  default: ({ href, prefetch: _p, children, ...rest }: { href: string; prefetch?: boolean; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-controls", () => ({ recordControlChange: () => {}, recordDiagnostic: () => {} }));
import { GameMenu } from "./GameMenu";
import { missions } from "@/data/missions";
import { LEGACY_RACE_CONTEXT } from "@/lib/race-context";
import { RACE_MEDALS_STORAGE_KEY, awardRaceMedal, type MedalCourse } from "@/lib/race-medals";
import { RACE_HOME_STORAGE_KEY, dailyRaceDay, localDay } from "@/lib/race-next-step";
import { dailySettings } from "@/lib/daily-challenge";
import { BEST_TIMES_STORAGE_KEY } from "@/lib/best-times";

const noop = () => {};
const course: MedalCourse = { raceContext: LEGACY_RACE_CONTEXT, difficulty: "easy", windStrength: "medium" };
const today = dailyRaceDay(new Date());
let rows: Map<string, string>;
beforeEach(() => {
  rows = new Map();
  vi.stubGlobal("React", React);
  vi.stubGlobal("window", { localStorage: { getItem: (k: string) => rows.get(k) ?? null, setItem: () => {} }, location: { search: "" } });
});
afterEach(() => vi.unstubAllGlobals());

const home = (patch: Record<string, unknown>) => rows.set(RACE_HOME_STORAGE_KEY, JSON.stringify({ schema: 1, days: [], goal: null, dailyDone: null, ...patch }));
const gold = () => rows.set(RACE_MEDALS_STORAGE_KEY, JSON.stringify(awardRaceMedal({}, course, 60, false)!.store));
function lobby(patch: Partial<ComponentProps<typeof GameMenu>> = {}) {
  return renderToStaticMarkup(<GameMenu difficulty="easy" setDifficulty={noop} windStrength="medium" setWindStrength={noop}
    selectedMission={null} pickMission={noop} onStart={noop} onShowBriefing={noop}
    racePrefs={{ mode: "simple" } as ComponentProps<typeof GameMenu>["racePrefs"]} updateRacePrefs={noop} dailyDay={null} medalCourse={course} {...patch} />);
}
const card = (html: string) => html.match(/<section[^>]*data-testid="race-next-step"[^>]*>.*?<\/section>/)?.[0] ?? "";
const count = (html: string, text: string) => html.split(text).length - 1;
const primaryActions = (html: string) => count(html, "background:var(--accent-cyan)");

describe("the race lobby's next step", () => {
  it("shows the last race's goal first, with a practice link back to this race", () => {
    home({ goal: "no-go" });
    const html = lobby();
    const c = card(html);
    expect(c).toContain('data-step="goal"');
    expect(c).toContain("Next step");
    expect(c).toContain("Stay out of the no-go zone");
    expect(c).toContain("keep at least 40° to the wind");
    // Only the solo race writes the row, so the goal names it (not multiplayer).
    expect(c).toContain("In your last solo race");
    expect(c).toContain('href="/start?lesson=wind-direction&amp;step=understand&amp;fromRace=easy.medium"');
    expect(c).toContain("Practise: Lesson 1.");
    // The card comes before the presets, and the separate medal line stays below.
    expect(html.indexOf('data-testid="race-next-step"')).toBeLessThan(html.indexOf("First race"));
    expect(html).toContain('data-testid="race-lobby-medal"');
    expect(html).toContain('data-testid="race-lobby-daily-entry"');
    expect(primaryActions(html)).toBe(1);
  });

  it("shows the course medal line inside the card when there is no goal, and not twice", () => {
    const html = lobby();
    const c = card(html);
    expect(c).toContain('data-step="medal"');
    expect(c).toContain("No medal on this course yet");
    expect(c).toContain("Bronze for any finish");
    expect(count(html, 'data-testid="race-lobby-medal"')).toBe(1);
    expect(c).not.toContain("race-next-step-action");
    expect(html).toContain(`href="/game?daily=${today}"`);
    expect(primaryActions(html)).toBe(1);
  });

  it("offers today's daily race in the card once the course has gold, and no second daily entry", () => {
    gold();
    const html = lobby();
    const c = card(html);
    const daily = dailySettings(today);
    expect(c).toContain('data-step="daily"');
    expect(c).toContain("Daily race");
    expect(c).toContain(`href="/game?daily=${today}"`);
    expect(c).toContain("Go to the daily race");
    expect(c).toContain(`Today: ${({ easy: "Easy", medium: "Medium", hard: "Hard" })[daily.difficulty]}`);
    expect(html).not.toContain("race-lobby-daily-entry");
    expect(primaryActions(html)).toBe(1);
  });

  it("shows no step but keeps the progress when today's daily race is done and the course has gold", () => {
    gold(); home({ dailyDone: today, days: [localDay(new Date())] });
    const c = card(lobby());
    expect(c).toContain('data-step="none"');
    expect(c).not.toContain("Next step");
    expect(c).toContain("Courses with a medal: 1 of 9");
    expect(c).toContain("Days with a solo race this week: 1");
  });

  it("shows the record of the course and mode, the medal progress, and no days line at zero", () => {
    rows.set(BEST_TIMES_STORAGE_KEY, JSON.stringify({ "easy-medium": { timeSec: 101, ts: 1 } }));
    const c = card(lobby());
    expect(c).toContain("Record on this course: 1:41");
    expect(c).toContain("Courses with a medal: 0 of 9");
    expect(c).not.toContain("this week");
    expect(c).not.toMatch(/streak|missed/i);
    expect(card(lobby({ racePrefs: { mode: "pro" } as ComponentProps<typeof GameMenu>["racePrefs"] }))).not.toContain("Record on this course");
  });

  it("does not send the daily race lobby to the daily race again", () => {
    gold();
    const html = lobby({ dailyDay: today });
    expect(card(html)).not.toContain("race-next-step-action");
    expect(html).not.toContain("race-lobby-daily-entry");
  });

  it("still offers today's daily race from an old daily link's lobby", () => {
    gold();
    const html = lobby({ dailyDay: "2026-01-01" });
    expect(card(html)).toContain('data-step="daily"');
    expect(card(html)).toContain(`href="/game?daily=${today}"`);
    expect(primaryActions(html)).toBe(1);
    // Without the gold the card is the medal, and the own entry row offers today's daily.
    rows.clear();
    const entry = lobby({ dailyDay: "2026-01-01" }).match(/<a[^>]*data-testid="race-lobby-daily-entry"[^>]*>/)?.[0] ?? "";
    expect(entry).toContain(`href="/game?daily=${today}"`);
  });

  it("names the chosen mission's course medal and returns a practice to that mission", () => {
    const mission = missions[0];
    expect(card(lobby({ selectedMission: mission }))).toContain('data-step="medal"');
    home({ goal: "tacks" });
    expect(card(lobby({ selectedMission: mission }))).toContain(`fromRace=mission.${mission.id}`);
  });

  it("shows nothing in the app's race page or the physical trial", () => {
    home({ goal: "tacks", days: [localDay(new Date())] });
    expect(lobby({ native: true })).not.toContain("race-next-step");
    expect(lobby({ native: true })).not.toContain("race-lobby-daily-entry");
    expect(lobby({ medalCourse: null })).not.toContain("race-next-step");
  });
});
