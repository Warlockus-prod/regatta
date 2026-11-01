import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Contract (M4-2): on the race finish screen every judge item and every coach
// mistake with a known kind carries one practice link with the right href and
// the race to return to; the "Practise" action opens the main mistake's
// practice; a race opened from lesson 8 offers "Back to the lesson" and the
// next step; the practice page's "Back to the race" leads to the same race.
// Inside the app the same links ask the app for the in-app screen instead.

vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./RaceCockpit", () => ({ RaceModePicker: () => null }));
vi.mock("next/link", () => ({
  default: ({ href, prefetch: _p, children, ...rest }: { href: string; prefetch?: boolean; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  // Client render: RaceReturn reads the live query, not the server default.
  useSyncExternalStore: (_subscribe: unknown, get: () => unknown) => get(),
}));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en",
  tl: (text: Record<string, string>) => text.en,
  tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-controls", () => ({ recordControlChange: () => {}, recordDiagnostic: () => {} }));
import { RaceResults } from "./RaceResults";
import { RaceJudgeReview } from "./RaceJudgeReview";
import { RaceLessonReturn, RacePracticeLink } from "./RacePracticeLink";
import { RaceReturn } from "@/components/RaceReturn";
import { buildRaceJudgeDebrief } from "@/lib/race-judge";
import type { RaceRuleEvent } from "@/lib/race-rules";
import { raceReturnFor } from "@/lib/race-return";
import type { Boat, Coaching } from "./race-model";

const noop = () => {};
const ret = raceReturnFor({ difficulty: "medium", windStrength: "light", fromLesson: "mini-race" });

function results(patch: Partial<ComponentProps<typeof RaceResults>>) {
  const props = {
    copy: { debrief: "Race debrief" }, trialProfile: null, judgeDebrief: null, boatsRef: { current: [] as Boat[] }, nativeRace: false, nativeSave: "idle",
    retryNativeSave: noop, nativeBestSave: { status: "idle", id: "", requestId: "", retryable: false }, sceneRaceId: "race_1", requestNativeBest: noop,
    results: [{ name: "You", time: 101.5, color: "#c9f", isPlayer: true }], isNewRecord: false, bestRecord: null, missionResult: null,
    coachingSource: "local", coaching: null, coachingLoading: false, coachingError: null, saveState: "idle", setSaveState: noop, saveError: null,
    saveResult: noop, nicknameInput: "", setNicknameInput: noop, replayCode: null, nickname: null, difficulty: "medium", windStrength: "light",
    selectedMission: null, replayDisabled: false, onMenu: noop, onReplay: noop, onAgain: noop, ...patch,
  } as unknown as ComponentProps<typeof RaceResults>;
  return renderToStaticMarkup(<RaceResults {...props} />);
}

const mistake = (kind: string | undefined, title: string) => ({ timeStart: 3, timeEnd: 9, severity: "major" as const, titleRu: title, explanationRu: "why", fixRu: "fix", title, ...(kind ? { kind } : {}) });
const coaching = { overall: "ok", score: 60, strengths: [], nextGoalRu: "goal",
  mistakes: [mistake("no-go", "No-go entries"), mistake("tacks", "Slow tacks"), mistake(undefined, "Wide rounding")] } as unknown as Coaching;
const hrefs = (html: string, testId: string) => [...html.matchAll(new RegExp(`<a href="([^"]*)"[^>]*data-testid="${testId}"`, "g"))].map(m => m[1].replace(/&amp;/g, "&"));

let host: EventTarget & { location: { search: string }; ReactNativeWebView?: { postMessage: (m: string) => void }; __REGATTA_RACE_NATIVE__?: boolean };
beforeEach(() => {
  vi.stubGlobal("React", React);
  host = Object.assign(new EventTarget(), { location: { search: "" } });
  vi.stubGlobal("window", host);
});
afterEach(() => vi.unstubAllGlobals());

describe("race finish screen links each mistake to its practice", () => {
  it("the Practise action opens the main mistake's practice; each coach mistake with a kind links its own", () => {
    const html = results({ coaching, practiceReturn: ret });
    expect(hrefs(html, "race-practise")).toEqual(["/start?lesson=wind-direction&step=understand&fromRace=medium.light&raceLesson=mini-race"]);
    expect(html).toContain("Practise: Lesson 1. Wind &amp; direction");
    // Collapsed coach details: two kinds linked, the AI-style mistake without a kind has no link.
    expect(hrefs(html, "race-practice-link")).toEqual([
      "/start?lesson=wind-direction&step=understand&fromRace=medium.light&raceLesson=mini-race",
      "/start?lesson=tacking&step=understand&fromRace=medium.light&raceLesson=mini-race",
    ]);
    // "Again" stays the one primary action.
    expect(html.match(/data-action="primary"/g)).toHaveLength(1);
  });

  it("on the website a practice opens in a new tab, so the finish screen and an unsaved result stay; the lesson return leaves", () => {
    const html = results({ coaching, practiceReturn: ret });
    const anchors = (testId: string) => [...html.matchAll(new RegExp(`<a [^>]*data-testid="${testId}"[^>]*>`, "g"))].map(m => m[0]);
    for (const testId of ["race-practise", "race-practice-link"]) {
      expect(anchors(testId).length).toBeGreaterThan(0);
      for (const a of anchors(testId)) expect(a, testId).toMatch(/target="_blank" rel="noopener"/);
    }
    for (const testId of ["race-lesson-back", "race-lesson-next"]) for (const a of anchors(testId)) expect(a, testId).not.toContain("target=");
    // Inside the app the native screen opens over the race: no new tab.
    expect(renderToStaticMarkup(<RacePracticeLink target={{ kind: "rule", id: "start-line" }} ret={ret} native />)).not.toContain("target=");
  });

  it("the Practise action names the practice with one colon", () => {
    const rule = renderToStaticMarkup(<RacePracticeLink target={{ kind: "rule", id: "port-vs-starboard" }} ret={ret} native={false} variant="action" />);
    expect(rule).toContain(">Practise: Port vs Starboard Tack<");
    expect(renderToStaticMarkup(<RacePracticeLink target={{ kind: "rule", id: "port-vs-starboard" }} ret={ret} native={false} />)).toContain(">Rule card: Port vs Starboard Tack<");
  });

  it("shows no practice links without a race return, and no Practise action without a main mistake kind", () => {
    expect(results({ coaching })).not.toContain("race-practi");
    const noKind = { ...coaching, mistakes: [mistake(undefined, "Wide rounding")] } as unknown as Coaching;
    expect(results({ coaching: noKind, practiceReturn: ret })).not.toContain('data-testid="race-practise"');
  });

  it("every judge item but the start jostle links its rule card or lesson", () => {
    const e = (kind: RaceRuleEvent["kind"], rule: RaceRuleEvent["rule"], time: number, otherBoatId?: string, penaltySeconds = 0): RaceRuleEvent =>
      ({ id: `${kind}:${time}`, kind, rule, boatId: "player", time, penaltySeconds, ...(otherBoatId ? { otherBoatId } : {}) });
    const debrief = buildRaceJudgeDebrief([
      e("early-start", "29.1", 0.2), e("give-way", "10", 40, "bot-1"), e("mark-touch", "31", 70, undefined, 5), e("wrong-rounding", "28", 75),
    ], { startedAt: 1, markRoundedAt: 80, finishedAt: 120 });
    expect(debrief.items.map(i => i.lesson)).toEqual(["return-behind-line", "keep-clear-port", "mark-clearance", "round-to-port"]);
    const html = renderToStaticMarkup(<RaceJudgeReview debrief={debrief} practiceReturn={ret} />);
    expect(hrefs(html, "race-practice-link")).toEqual([
      "/rules?rule=start-line&fromRace=medium.light&raceLesson=mini-race",
      "/rules?rule=port-vs-starboard&fromRace=medium.light&raceLesson=mini-race",
      "/rules?rule=penalty&fromRace=medium.light&raceLesson=mini-race",
      "/start?lesson=mini-race&step=understand&fromRace=medium.light&raceLesson=mini-race",
    ]);
    expect(html).toContain("Rule card: Port vs Starboard Tack");
    expect(renderToStaticMarkup(<RaceJudgeReview debrief={debrief} />)).not.toContain("race-practice-link");
    // The start jostle: penalty-free touches right after the signal, no practice.
    const jostle = buildRaceJudgeDebrief([e("avoid-contact", "14", 2, "bot-1"), e("avoid-contact", "14", 3, "bot-2"), e("avoid-contact", "14", 4, "bot-3")], { startedAt: 1 });
    expect(jostle.items.some(i => i.jostle)).toBe(true);
    expect(renderToStaticMarkup(<RaceJudgeReview debrief={jostle} practiceReturn={ret} />)).not.toContain("race-practice-link");
  });

  it("a race from lesson 8 offers Back to the lesson and the next course; another race offers neither", () => {
    const html = results({ coaching, practiceReturn: ret });
    expect(hrefs(html, "race-lesson-back")).toEqual(["/start?lesson=mini-race&step=practice"]);
    expect(hrefs(html, "race-lesson-next")).toEqual(["/learn/sails"]);
    expect(html).toContain(">Back to the lesson<");
    expect(html).toContain(">Next course: Working with sails<");
    expect(results({ coaching, practiceReturn: { ...ret, lesson: null } })).not.toContain("race-lesson-return");
  });

  it("inside the app a click asks the app for the in-app screen instead of following the web link", () => {
    const posted: string[] = [];
    host.__REGATTA_RACE_NATIVE__ = true;
    host.ReactNativeWebView = { postMessage: m => posted.push(m) };
    const link = RacePracticeLink({ target: { kind: "rule", id: "start-line" }, ret, native: true }) as React.ReactElement<{ props: Record<string, unknown> }>;
    const anchor = (link.type as (p: unknown) => React.ReactElement<{ onClick: (e: { preventDefault: () => void }) => void; "data-native-href": string }>)(link.props);
    let prevented = false;
    anchor.props.onClick({ preventDefault: () => { prevented = true; } });
    expect(prevented).toBe(true);
    expect(posted.map(m => JSON.parse(m))).toEqual([{ type: "native-navigate", href: "/rules/start-line" }]);
    const lesson = renderToStaticMarkup(<RaceLessonReturn lessonId="mini-race" native />);
    expect(lesson).toContain('data-native-href="/race"');
    expect(lesson).toContain('data-native-href="/learn/sails"');
  });
});

describe("Back to the race on the practice page", () => {
  it("rebuilds the race the link came from, with its lesson", () => {
    host.location.search = "?rule=start-line&fromRace=medium.light&raceLesson=mini-race";
    const html = renderToStaticMarkup(<RaceReturn />);
    expect(hrefs(html, "race-return")).toEqual(["/game?difficulty=medium&wind=light&fromLesson=mini-race"]);
    expect(html).toContain("Back to the race");
    expect(hrefs(renderToStaticMarkup(<RaceReturn initialSearch="?drill=hold-trim&fromRace=mission.clean-laps" />), "race-return")).toEqual(["/game?mission=clean-laps"]);
  });

  it("renders nothing without a race, with a forged one or inside the app", () => {
    host.location.search = "?rule=start-line";
    expect(renderToStaticMarkup(<RaceReturn />)).toBe("");
    host.location.search = "?fromRace=https://evil.test";
    expect(renderToStaticMarkup(<RaceReturn />)).toBe("");
    host.location.search = "?fromRace=medium.light";
    host.ReactNativeWebView = { postMessage: noop };
    expect(renderToStaticMarkup(<RaceReturn />)).toBe("");
  });
});
