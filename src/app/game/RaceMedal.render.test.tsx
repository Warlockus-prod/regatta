import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// M4-5 contract: the finish screen shows the course medal this race earned or
// kept, with "New medal" only when it went up, and the next medal as one
// sentence; gold names the hint switches to turn off (both in Pro, route only
// in Simple), and a gold-fast time with hints says exactly that. A
// did-not-finish and the physical trial show no medal. The race menu shows
// the medal of the selected course and its next goal, nothing for the trial.

vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./RaceCockpit", () => ({ RaceModePicker: () => null }));
vi.mock("@/components/FoundationReturn", () => ({ FoundationReturn: () => null }));
vi.mock("next/link", () => ({
  default: ({ href, prefetch: _p, children, ...rest }: { href: string; prefetch?: boolean; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-controls", () => ({ recordControlChange: () => {}, recordDiagnostic: () => {} }));
import { RaceResults } from "./RaceResults";
import { GameMenu } from "./GameMenu";
import { LEGACY_RACE_CONTEXT } from "@/lib/race-context";
import { RACE_MEDALS_STORAGE_KEY, awardRaceMedal, medalThresholds, type MedalAward, type MedalCourse } from "@/lib/race-medals";
import type { Boat } from "./race-model";

const noop = () => {};
const course: MedalCourse = { raceContext: LEGACY_RACE_CONTEXT, difficulty: "easy", windStrength: "medium" };
const t = medalThresholds(course)!;
const awardFor = (time: number, hints: boolean, before: Parameters<typeof awardRaceMedal>[0] = {}) => awardRaceMedal(before, course, time, hints)!.award;
function results(time: number, medal: ComponentProps<typeof RaceResults>["medal"]) {
  const props = {
    copy: { debrief: "Race debrief" }, trialProfile: null, judgeDebrief: null, boatsRef: { current: [] as Boat[] }, nativeRace: false, nativeSave: "idle",
    retryNativeSave: noop, nativeBestSave: { status: "idle", id: "", requestId: "", retryable: false }, sceneRaceId: "race_1", requestNativeBest: noop,
    results: [{ name: "You", time, color: "#c9f", isPlayer: true }], isNewRecord: false, bestRecord: null, missionResult: null,
    coachingSource: "local", coaching: null, coachingLoading: false, coachingError: null, saveState: "idle", setSaveState: noop, saveError: null,
    saveResult: noop, nicknameInput: "", setNicknameInput: noop, replayCode: null, nickname: null, difficulty: "easy", windStrength: "medium",
    selectedMission: null, replayDisabled: false, onMenu: noop, onReplay: noop, onWatch: noop, onAgain: noop, medal,
  } as unknown as ComponentProps<typeof RaceResults>;
  return renderToStaticMarkup(<RaceResults {...props} />);
}
const medalOf = (award: MedalAward | null, mode: "simple" | "pro", hintsUsed: boolean) => ({ award, course, mode, hintsUsed });
const section = (html: string) => html.match(/<section[^>]*data-testid="race-results-medal"[^>]*>.*?<\/section>/)?.[0] ?? "";

describe("medal on the finish screen", () => {
  it("shows a new gold as the top medal of the course", () => {
    const html = section(results(t.goldSec - 1, medalOf(awardFor(t.goldSec - 1, false), "pro", false)));
    expect(html).toContain('data-medal="gold"');
    expect(html).toContain("New medal: Gold");
    expect(html).toContain("Easy, medium wind");
    expect(html).toContain("Gold: the top medal of this course");
    expect(html).not.toContain("accent-cyan");
  });

  it("names both hint switches for gold in Pro and only the route switch in Simple", () => {
    const silver = awardFor(t.silverSec, false);
    const pro = section(results(t.silverSec, medalOf(silver, "pro", false)));
    expect(pro).toContain("New medal: Silver");
    expect(pro).toContain(`Next, gold: finish faster than 1:${String(t.goldSec - 60).padStart(2, "0")} with &quot;Route and hints&quot; and &quot;Pro trim hints&quot; off in the race settings`);
    const simple = section(results(t.silverSec, medalOf(silver, "simple", false)));
    expect(simple).toContain("with &quot;Route and hints&quot; off");
    expect(simple).not.toContain("Pro trim hints");
  });

  it("says a gold-fast time with hints needs another race with the hints off", () => {
    const html = section(results(t.goldSec - 5, medalOf(awardFor(t.goldSec - 5, true), "simple", true)));
    expect(html).toContain("New medal: Silver");
    expect(html).toContain("Your time was fast enough for gold, but hints were on. Race again with them off");
  });

  it("does not say new for a medal the device could not save, and says it was not saved", () => {
    const before = awardRaceMedal({}, course, t.bronzeSec - 1, true)!.store;
    const html = section(results(t.goldSec - 1, medalOf({ ...awardFor(t.goldSec - 1, false, before), saved: false }, "simple", false)));
    expect(html).toContain('data-saved="false"');
    expect(html).toContain('data-improved="false"');
    expect(html).toContain("This race: Gold");
    expect(html).not.toContain("New medal");
    expect(html).toContain("The medal could not be saved on this device");
  });

  it("does not say new for a medal the course already had", () => {
    const before = awardRaceMedal({}, course, t.silverSec, true)!.store;
    const html = section(results(t.bronzeSec - 1, medalOf(awardFor(t.bronzeSec - 1, true, before), "simple", true)));
    expect(html).toContain('data-improved="false"');
    expect(html).toContain("Course medal: Silver");
    expect(html).not.toContain("New medal");
  });

  it("shows no medal for a did-not-finish or the physical trial", () => {
    expect(section(results(Infinity, medalOf(null, "simple", false)))).toBe("");
    expect(section(results(90, null))).toBe("");
  });
});

describe("medal in the race menu", () => {
  let rows: Map<string, string>;
  beforeEach(() => {
    rows = new Map();
    vi.stubGlobal("React", React);
    vi.stubGlobal("window", { localStorage: { getItem: (k: string) => rows.get(k) ?? null, setItem: () => {} }, location: { search: "" } });
  });
  afterEach(() => vi.unstubAllGlobals());
  const lobby = (medalCourse: MedalCourse | null) => renderToStaticMarkup(<GameMenu difficulty="easy" setDifficulty={noop} windStrength="medium"
    setWindStrength={noop} selectedMission={null} pickMission={noop} onStart={noop} onShowBriefing={noop}
    racePrefs={{ mode: "simple" } as ComponentProps<typeof GameMenu>["racePrefs"]} updateRacePrefs={noop} dailyDay={null} medalCourse={medalCourse} />);

  it("invites a first finish on a course without a medal", () => {
    const html = lobby(course);
    expect(html).toContain('data-testid="race-lobby-medal" data-medal="none"');
    expect(html).toContain("No medal on this course yet");
    expect(html).toContain("Bronze for any finish");
  });

  it("shows the stored medal and the next goal", () => {
    rows.set(RACE_MEDALS_STORAGE_KEY, JSON.stringify(awardRaceMedal({}, course, t.bronzeSec - 1, true)!.store));
    const html = lobby(course);
    expect(html).toContain('data-medal="bronze"');
    expect(html).toContain("Course medal: Bronze");
    expect(html).toContain(`Next, silver: finish faster than 1:${String(t.silverSec - 60).padStart(2, "0")}`);
    expect(lobby({ ...course, windStrength: "heavy" })).toContain('data-medal="none"');
  });

  it("shows nothing for the physical trial", () => {
    expect(lobby(null)).not.toContain("race-lobby-medal");
  });
});
