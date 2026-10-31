import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./RaceCockpit", () => ({ RaceModePicker: () => <div data-testid="mode-picker" /> }));
// The language is English unless a test switches it (the replay title in French).
const i18n = vi.hoisted(() => ({ lang: "en" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: i18n.lang,
  tl: (text: Record<string, string>) => text[i18n.lang] ?? text.en,
  tp: (ru: string, en: string, pl: string, rest?: Record<string, string>) =>
    ({ ru, en, pl, ...rest } as Record<string, string>)[i18n.lang] ?? en }) }));
vi.mock("@/features/venues/useVenue", () => ({ useVenue: () => ({ venue: { id: "gocek" } }) }));
vi.mock("@/features/race-3d/useRaceView", () => ({ useRaceView: () => ({ camera: "orbit", setCamera: () => {} }) }));
vi.mock("@/lib/diagnostics-controls", () => ({ recordControlChange: () => {}, recordDiagnostic: () => {} }));
vi.mock("@/lib/diagnostics-bridge", () => ({ initializeDiagnosticBridge: () => {} }));
import { RaceBriefing } from "./RaceBriefing";
import { RaceReplay } from "./RaceReplay";
import { REPLAY_COPY_RESOURCES } from "./replay-copy";
import { missions } from "@/data/missions";
import { RaceResults } from "./RaceResults";
import { RaceFinishPlate } from "./RaceFinishPlate";
import { RaceJudgeReview } from "./RaceJudgeReview";
import { buildRaceJudgeDebrief } from "@/lib/race-judge";
import { RaceFinishPractiseSlot, RaceFinishSkillBarsSlot, RaceFinishWatchSlot } from "./RaceFinishSlots";
import type { Boat, Coaching } from "./race-model";

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
afterEach(() => { vi.unstubAllGlobals(); i18n.lang = "en"; });

// M1-7: race screens draw line icons, not emoji. Extended_Pictographic covers
// the emoji (medals, trophy, bulb, link, pin, compass, warning sign); the plain
// check marks are added by hand because Unicode does not count them.
const EMOJI = /[\p{Extended_Pictographic}\u2713\u2714]/u;
/** An icon is hidden from screen readers and sits right before its visible label. */
const iconThen = (label: string) => new RegExp(`<svg[^>]*aria-hidden="true"[^>]*>(?:(?!</svg>).)*</svg><span[^>]*>${label}`);
/** The fleet table rows, one string per boat. */
const fleetRows = (html: string) => {
  const fleet = html.slice(html.indexOf('data-testid="race-results-fleet"'));
  return fleet.split('class="flex items-center justify-between py-1.5').slice(1).map(row => row.slice(0, row.indexOf("</span></div>") + 13));
};

describe("solo race screens", () => {
  it("briefing shows the course, the rules and one start action, with the trial picker only on a trial", () => {
    const props: ComponentProps<typeof RaceBriefing> = { onBack: noop, bestRecord: { timeSec: 87.4 } as ComponentProps<typeof RaceBriefing>["bestRecord"],
      difficulty: "medium", windStrength: "light", mode: "simple", trialProfile: null, onChooseTrialCourse: noop, onStart: noop };
    const html = renderToStaticMarkup(<RaceBriefing {...props} />);
    expect(html).toContain("data-race-scroll");
    expect(html).toContain(">Briefing</h1>");
    // M1-1: the mode is chosen once in the lobby; the briefing only shows it.
    expect(html).not.toContain('data-testid="mode-picker"');
    expect(html).toMatch(/data-testid="briefing-mode"[^>]*>Simple</);
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
    // Two finishers get the first and second medal; the third boat did not finish and gets no medal (M1-7).
    const rows = fleetRows(html);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain('role="img" aria-label="Place 1" data-medal="1"');
    expect(rows[1]).toContain('role="img" aria-label="Place 2" data-medal="2"');
    expect(rows[2]).toContain("Mistral");
    expect(rows[2]).not.toContain("data-medal");
    expect(rows[2]).toMatch(/>-<\/span>/);
    // A third finisher would get the third medal: the DNF row above is the only reason it had none.
    const podium = fleetRows(results({ results: [{ name: "Nautilus", time: 98, color: "#f68", isPlayer: false },
      { name: "You", time: 101.5, color: "#0df", isPlayer: true }, { name: "Mistral", time: 104, color: "#8df", isPlayer: false }] }));
    expect(podium[2]).toContain('aria-label="Place 3" data-medal="3"');
    expect(html).toContain("Race debrief");
    expect(html).not.toContain("physical-trial-note");
    expect(results({ trialProfile: "medium" })).toContain('data-testid="physical-trial-note"');
  });

  it("results show did-not-finish when the player has no time, and the native save status only in the app", () => {
    const dnf = results({ results: [{ name: "You", time: Infinity, color: "#0df", isPlayer: true }] });
    expect(dnf).toContain('data-testid="race-results-dnf"');
    expect(dnf).toContain("Time ran out");
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

  // M1-4: place and time, gap to the winner, record, ONE main mistake, then
  // "Again" as the only primary button; judge, coach, fleet and share collapsed.
  const coaching: Coaching = { overall: "Solid race.", score: 64, strengths: [], nextGoalRu: "goal", nextGoal: "Tack on the shifts.",
    mistakes: [
      { timeStart: 12, timeEnd: 20, severity: "major", titleRu: "t", explanationRu: "e", fixRu: "f", title: "Late tack at the layline", explanation: "You overstood.", fix: "Tack when the mark is abeam." },
      { timeStart: 40, timeEnd: 44, severity: "minor", titleRu: "t", explanationRu: "e", fixRu: "f", title: "Slow mark rounding", explanation: "Wide turn.", fix: "Enter wide, exit tight." },
    ] };
  const judgeDebrief = { items: [], summary: { incidents: 0, totalPenaltySeconds: 0, uncertain: 0, notCovered: [] } } as unknown as ComponentProps<typeof RaceResults>["judgeDebrief"];
  const order = (html: string, needles: string[]) => needles.map(n => { const at = html.indexOf(n); expect(at, n).toBeGreaterThanOrEqual(0); return at; });

  it("a finish reads place and time, gap to the winner, record, one main mistake and Again, with the details collapsed (M1-4)", () => {
    const html = results({ coaching, bestRecord: { timeSec: 100, ts: 1 }, judgeDebrief, replayCode: "ABC123" });
    const at = order(html, ['data-testid="race-results-finished"', ">2<span", "1:41.5", "+3.5 s behind the winner (Nautilus)",
      "+1.5 s off your record (1:40)", 'data-testid="race-results-main-mistake"', 'data-testid="race-again"',
      'data-testid="race-results-judge"', 'data-testid="race-results-coach"', 'data-testid="race-results-fleet"', 'data-testid="race-results-share"']);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    // Exactly one mistake on the main screen: the coach's top one.
    const main = html.slice(at[5], at[6]);
    expect(main).toContain("Late tack at the layline");
    expect(main).toContain("Tack when the mark is abeam.");
    expect(main).not.toContain("Slow mark rounding");
    // The details are closed <details>, not open sections.
    for (const id of ["judge", "coach", "fleet", "share"]) expect(html).toMatch(new RegExp(`<details[^>]*data-testid="race-results-${id}"`));
    expect(html).not.toMatch(/<details[^>]*\sopen/);
  });

  it("the record line: new record, slower or faster than the record, and none without a record (M1-4)", () => {
    const fresh = results({ isNewRecord: true, bestRecord: { timeSec: 101.5, ts: 1 } });
    expect(fresh).toContain("New record");
    expect(fresh).not.toContain("your record");
    expect(results({ bestRecord: { timeSec: 100, ts: 1 } })).toContain("+1.5 s off your record (1:40)");
    expect(results({ bestRecord: { timeSec: 103, ts: 1 } })).toContain("1.5 s faster than your record (1:43)");
    const none = results();
    expect(none).not.toContain('data-testid="race-results-record"');
    expect(none).not.toContain("New record");
    // A winner sees the lead over second place, not a gap to themselves.
    const won = results({ results: [{ name: "You", time: 95, color: "#0df", isPlayer: true }, { name: "Nautilus", time: 98, color: "#f68", isPlayer: false }] });
    expect(won).toContain("You won, 3.0 s ahead of second place");
    expect(won).not.toContain("behind the winner");
  });

  it("Again is the one primary button on a finish and on a did-not-finish (M1-4)", () => {
    const dnfRows = [{ name: "Nautilus", time: 98, color: "#f68", isPlayer: false }, { name: "You", time: Infinity, color: "#0df", isPlayer: true }];
    for (const html of [results({ coaching }), results({ results: dnfRows, coaching })]) {
      expect(html.match(/data-action="primary"/g)?.length).toBe(1);
      expect(html).toMatch(/<button[^>]*data-action="primary"[^>]*style="background:var\(--accent-cyan\)[^"]*"[^>]*>Again<\/button>/);
      expect(html.indexOf('data-action="primary"')).toBeLessThan(html.indexOf("Race replay"));
    }
  });

  it("a did-not-finish says what happened and one thing to try, with no medal and no red verdict (M1-4)", () => {
    const rows = [{ name: "Nautilus", time: 98, color: "#f68", isPlayer: false }, { name: "You", time: Infinity, color: "#0df", isPlayer: true }];
    const before = results({ results: rows, playerLapDone: 0 });
    const summary = before.slice(before.indexOf('data-testid="race-results-dnf"'), before.indexOf('data-testid="race-results-actions"'));
    expect(summary).toContain("Time ran out");
    expect(summary).toContain("The race closed before you rounded the windward mark.");
    expect(summary).toContain("Many first races end this way.");
    expect(summary).toContain("One thing to try");
    expect(summary).toContain("Sail close-hauled, about 45 degrees off the wind, and tack when the mark is abeam.");
    expect(summary).not.toMatch(/--danger|data-medal|Did not finish/);
    expect(summary).not.toMatch(EMOJI);
    // The player's own DNF row in the fleet table has no medal either.
    expect(fleetRows(before)[1]).not.toContain("data-medal");
    expect(before).not.toContain('data-testid="race-results-finished"');
    expect(before).not.toContain('data-testid="race-results-main-mistake"');
    const after = results({ results: rows, playerLapDone: 1 });
    expect(after).toContain("You had rounded the windward mark, but the race closed before your finish.");
    expect(after).toContain("After the mark, bear away to a broad reach and point the bow at the finish line.");
    // With a coach's top mistake, that mistake's fix is the one thing to try.
    const coached = results({ results: rows, playerLapDone: 0, coaching });
    expect(coached).toContain("Tack when the mark is abeam.");
    expect(coached).not.toContain("Sail close-hauled, about 45 degrees");
    // Without the boat's progress the text and the tip stay general.
    const unknown = results({ results: rows });
    expect(unknown).toContain("The race closed before you crossed the finish line.");
    expect(unknown).toContain("Keep the sails full: if the boat slows, bear away until it picks up speed, then head for the next mark.");
  });

  it("the M4 slots render nothing today, and the finish plate states the place without cyan (M1-4)", () => {
    for (const Slot of [RaceFinishSkillBarsSlot, RaceFinishWatchSlot, RaceFinishPractiseSlot]) expect(renderToStaticMarkup(<Slot />)).toBe("");
    const plate = renderToStaticMarkup(<RaceFinishPlate place={2} total={6} />);
    expect(plate).toContain('data-testid="race-finish-plate"');
    expect(plate).toContain('role="status"');
    expect(plate).toContain(">Finish<");
    expect(plate).toContain(">2nd<");
    expect(plate).toContain(">of 6<");
    expect(plate).toContain("pointer-events-none");
    expect(plate).toContain("page-enter");
    expect(plate).not.toContain("accent-cyan");
  });

  it("the result screen draws no emoji: icons are hidden and every one keeps its text label (M1-7)", () => {
    const coached: Coaching = { ...coaching, strengths: ["Clean start"] };
    const mission = missions[0];
    for (const passed of [true, false]) {
      const html = results({ coaching: coached, coachingLoading: true, saveState: "saved", replayCode: "ABC123",
        missionResult: { passed, reasons: ["Kept the boat clean"], mission } });
      expect(html.match(EMOJI)?.[0], passed ? "passed" : "failed").toBeUndefined();
      expect(html).not.toContain(mission.emoji);
      expect(html).toMatch(iconThen(passed ? "Mission passed: Clean race" : "Mission failed: Clean race"));
      expect(html).toMatch(iconThen("Result saved to the leaderboard"));
      expect(html).toMatch(iconThen("Tack when the mark is abeam."));
      expect(html).toMatch(iconThen("Clean start"));
      expect(html).toMatch(iconThen("Share"));
      // The share block's "Open" link is a 44 px target like the buttons next to it.
      expect(html.match(/<a[^>]*href="\/r\/ABC123"[^>]*>/)?.[0]).toMatch(/class="[^"]*\bmin-h-11\b/);
      expect(html).toMatch(iconThen("Race replay"));
      // The analysing steps keep their text and lose the emoji; the waiting step is not cyan.
      expect(html).toContain("Checking close-hauled speed");
      const steps = html.slice(html.indexOf("AI is reviewing"), html.indexOf("Checking close-hauled speed") + 40);
      expect(steps).not.toContain("accent-cyan");
    }
    // The did-not-finish layout is free of emoji too.
    expect(results({ results: [{ name: "You", time: Infinity, color: "#0df", isPlayer: true }] })).not.toMatch(EMOJI);
  });

  it("the briefing shows the record with a hidden trophy icon and a spoken label, no emoji (M1-7)", () => {
    const html = renderToStaticMarkup(<RaceBriefing onBack={noop} bestRecord={{ timeSec: 87.4, ts: 1 }} difficulty="medium"
      windStrength="light" mode="pro" trialProfile={null} onChooseTrialCourse={noop} onStart={noop} />);
    expect(html).not.toMatch(EMOJI);
    const record = html.slice(html.indexOf('data-testid="briefing-record"'), html.indexOf('data-testid="briefing-mode"'));
    expect(record).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(record).toContain('<span class="sr-only">Your best: </span><span>1:27</span>');
  });

  it("the replay title is the shared replay wording in every language (M1-7)", () => {
    const sample = { t: 0, x: 0, y: 0, heading: 0, speed: 0, windDir: 0 } as unknown as ComponentProps<typeof RaceReplay>["samples"][number];
    const props = { samples: [sample], course: {} as ComponentProps<typeof RaceReplay>["course"], onClose: noop };
    for (const lang of ["en", "fr", "es"] as const) {
      i18n.lang = lang;
      const html = renderToStaticMarkup(<RaceReplay {...props} />);
      expect(html, lang).toContain(`<strong>${REPLAY_COPY_RESOURCES.raceReplay[lang]}</strong>`);
    }
    expect(REPLAY_COPY_RESOURCES.raceReplay.fr).toBe("Revoir la course");
    // The results button names the replay the same way, also where the old button said "Rennen ansehen" or "Repetición".
    for (const lang of ["es", "de"] as const) {
      i18n.lang = lang;
      expect(results(), lang).toMatch(iconThen(REPLAY_COPY_RESOURCES.raceReplay[lang]));
    }
  });

  it("the collapsed judge row carries the title once: the card's own heading is for screen readers only (M1-4)", () => {
    const debrief = buildRaceJudgeDebrief([], { startedAt: 1 });
    const inResults = renderToStaticMarkup(<RaceJudgeReview debrief={debrief} titleHidden />);
    expect(inResults).toMatch(/<h2 id="race-judge-title" class="sr-only">Training judge<\/h2>/);
    expect(inResults).toContain('aria-labelledby="race-judge-title"');
    // Elsewhere the card keeps its visible heading.
    expect(renderToStaticMarkup(<RaceJudgeReview debrief={debrief} />)).toMatch(/<h2 id="race-judge-title" class="text-lg[^"]*">Training judge<\/h2>/);
  });
});
