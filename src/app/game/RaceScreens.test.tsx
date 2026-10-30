import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./RaceCockpit", () => ({ RaceModePicker: () => <div data-testid="mode-picker" /> }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
import { RaceBriefing } from "./RaceBriefing";
import { RaceResults } from "./RaceResults";
import type { Boat } from "./race-model";

const noop = () => {};
const copy = { saved: "Race saved", saveError: "Save failed", saving: "Saving race", retry: "Retry", personalBestChecked: "PB checked",
  personalBestError: "PB failed", personalBestSaving: "PB saving", retryPersonalBest: "Retry PB", debrief: "Race debrief", history: "Race history" };

function results(patch: Partial<ComponentProps<typeof RaceResults>> = {}) {
  const props: ComponentProps<typeof RaceResults> = {
    copy: copy as unknown as ComponentProps<typeof RaceResults>["copy"], trialProfile: null, judgeDebrief: null,
    boatsRef: { current: [] as Boat[] }, nativeRace: false, nativeSave: "idle", retryNativeSave: noop,
    nativeBestSave: { status: "idle", id: "", requestId: "", retryable: false }, sceneRaceId: "race_1", requestNativeBest: noop,
    results: [{ name: "Nautilus", time: 98, color: "#f68", isPlayer: false }, { name: "You", time: 101.5, color: "#0df", isPlayer: true },
      { name: "Mistral", time: Infinity, color: "#8df", isPlayer: false }],
    isNewRecord: false, bestRecord: null, missionResult: null, coachingSource: "local", coaching: null, coachingLoading: false,
    coachingError: null, saveState: "idle", setSaveState: noop, saveError: null, saveResult: noop, nicknameInput: "",
    setNicknameInput: noop, replayCode: null, nickname: null, difficulty: "medium", windStrength: "medium", selectedMission: null,
    replayDisabled: false, onMenu: noop, onReplay: noop, onAgain: noop, ...patch,
  };
  return renderToStaticMarkup(<RaceResults {...props} />);
}

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());

describe("solo race screens", () => {
  it("briefing shows the course, the rules and one start action, with the trial picker only on a trial", () => {
    const props: ComponentProps<typeof RaceBriefing> = { onBack: noop, bestRecord: { timeSec: 87.4 } as ComponentProps<typeof RaceBriefing>["bestRecord"],
      difficulty: "medium", windStrength: "light", racePrefs: { mode: "simple" } as ComponentProps<typeof RaceBriefing>["racePrefs"],
      updateRacePrefs: noop, trialProfile: null, onChooseTrialCourse: noop, onStart: noop };
    const html = renderToStaticMarkup(<RaceBriefing {...props} />);
    expect(html).toContain("data-race-scroll");
    expect(html).toContain(">Briefing</h1>");
    expect(html).toContain('data-testid="mode-picker"');
    expect(html).toContain("Ready - starting in 3·2·1");
    expect(html).toContain("light wind");
    expect(html).not.toContain("physical-trial-course");
    expect(html).not.toContain("physical-trial-note");
    const trial = renderToStaticMarkup(<RaceBriefing {...props} trialProfile="short" />);
    expect(trial).toContain('data-testid="physical-trial-course"');
    expect(trial).toContain('data-testid="physical-trial-note"');
    expect(trial.match(/role="radio"/g)?.length).toBe(3);
  });

  it("results show the penalty-adjusted place, the fleet table and the trial note on a trial", () => {
    const html = results();
    expect(html).toContain('data-testid="race-results"');
    expect(html).toMatch(/>2<span[^>]*> of 3<\/span>/);
    expect(html).toContain("1:41.5");
    expect(html).toContain("DNF");
    // Two finishers get gold and silver; the third boat did not finish and gets no bronze.
    expect(html).toContain("🥇");
    expect(html).toContain("🥈");
    expect(html).not.toContain("🥉");
    expect(html).toContain("Race debrief");
    expect(html).not.toContain("physical-trial-note");
    expect(results({ trialProfile: "medium" })).toContain('data-testid="physical-trial-note"');
  });

  it("results show did-not-finish when the player has no time, and the native save status only in the app", () => {
    const dnf = results({ results: [{ name: "You", time: Infinity, color: "#0df", isPlayer: true }] });
    expect(dnf).toContain("Did not finish");
    expect(results({ nativeSave: "saving" })).not.toContain("Saving race");
    expect(results({ nativeRace: true, nativeSave: "saving" })).toContain("Saving race");
    expect(results({ nativeRace: true, nativeBestSave: { status: "error", id: "race_1", requestId: "r", retryable: true } }))
      .toContain('aria-label="Retry PB"');
  });

  it("the analysing steps name only what the coach computes (M0-11)", () => {
    const html = results({ coachingLoading: true });
    expect(html).toContain("Checking close-hauled speed");
    expect(html).toContain("Counting time in the no-go zone");
    expect(html).toContain("Measuring what the tacks cost");
    expect(html).not.toMatch(/layline/i);
    expect(html).not.toContain("Matching track to course");
  });
});
