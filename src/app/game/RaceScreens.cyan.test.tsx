import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./RaceCockpit", () => ({ RaceModePicker: () => null }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en",
  tl: (text: Record<string, string>) => text.en,
  tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-controls", () => ({ recordControlChange: () => {}, recordDiagnostic: () => {} }));
import { COURSE_PREVIEW_INK, RaceBriefing } from "./RaceBriefing";
import { RaceResults } from "./RaceResults";
import type { Boat } from "./race-model";

// M1-7 leftovers: cyan means an action, the selected section or an active
// control (DESIGN.md). The briefing chart, the leaderboard nickname prompt and
// the replay share card are none of these, so only their buttons keep cyan.
const CYAN = /#00d4ff|0,\s*212,\s*255|accent-cyan/i;
const noop = () => {};

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());

function briefingChart() {
  const html = renderToStaticMarkup(<RaceBriefing onBack={noop} bestRecord={null} difficulty="medium" windStrength="medium" mode="simple"
    trialProfile={null} onChooseTrialCourse={noop} onStart={noop} />);
  return html.slice(html.indexOf('<svg viewBox="0 0 220 274"'), html.indexOf("</svg>", html.indexOf('<svg viewBox="0 0 220 274"')) + 6);
}

function results(patch: Partial<ComponentProps<typeof RaceResults>>) {
  const props = {
    copy: {}, trialProfile: null, judgeDebrief: null, boatsRef: { current: [] as Boat[] }, nativeRace: false, nativeSave: "idle",
    retryNativeSave: noop, nativeBestSave: { status: "idle", id: "", requestId: "", retryable: false }, sceneRaceId: "race_1", requestNativeBest: noop,
    results: [{ name: "You", time: 101.5, color: "#c9f", isPlayer: true }], isNewRecord: false, bestRecord: null, missionResult: null,
    coachingSource: "local", coaching: null, coachingLoading: false, coachingError: null, saveState: "idle", setSaveState: noop, saveError: null,
    saveResult: noop, nicknameInput: "", setNicknameInput: noop, replayCode: null, nickname: null, difficulty: "medium", windStrength: "medium",
    selectedMission: null, replayDisabled: false, onMenu: noop, onReplay: noop, onAgain: noop, ...patch,
  } as unknown as ComponentProps<typeof RaceResults>;
  return renderToStaticMarkup(<RaceResults {...props} />);
}

/** The markup of one element and its subtree, found by its test id. */
function block(html: string, testId: string, tag = "div") {
  const start = html.lastIndexOf(`<${tag}`, html.indexOf(`data-testid="${testId}"`));
  let depth = 0;
  for (const match of html.slice(start).matchAll(new RegExp(`<(/?)${tag}\\b`, "g"))) {
    depth += match[1] ? -1 : 1;
    if (depth === 0) return html.slice(start, start + match.index! + tag.length + 3);
  }
  throw new Error(`unclosed ${testId}`);
}
/** Only the actions inside a block may be cyan. */
const withoutActions = (html: string) => html.replace(/<(button|a)\b[\s\S]*?<\/\1>/g, "");

describe("cyan only on actions in the race screens (M1-7 leftovers)", () => {
  it("draws the briefing chart's wind, upwind route, start boat and legend in neutral inks, not cyan", () => {
    const chart = briefingChart();
    expect(chart).toContain("<polyline");
    expect(chart).not.toMatch(CYAN);
    expect(chart).toContain(`stroke="${COURSE_PREVIEW_INK.wind}"`);
    expect(chart).toContain(`stroke="${COURSE_PREVIEW_INK.upwind}"`);
    expect(chart).toMatch(new RegExp(`fill="${COURSE_PREVIEW_INK.upwind}">-- upwind \\(tacks\\)`));
    // Wind and upwind route stay two different inks, and the run home keeps its green.
    expect(COURSE_PREVIEW_INK.wind).not.toBe(COURSE_PREVIEW_INK.upwind);
    expect(chart).toContain('fill="#44ff88">-- downwind to finish');
  });

  it("keeps the nickname prompt a neutral panel with a plain heading; Save stays the cyan action", () => {
    const prompt = block(results({ saveState: "prompting" }), "race-results-nickname-prompt");
    expect(prompt).toContain("Save your result to the leaderboard?");
    expect(withoutActions(prompt)).not.toMatch(CYAN);
    expect(prompt).toMatch(/style="background:var\(--bg-secondary\);border:1px solid var\(--border-subtle\)"/);
    expect(prompt).toMatch(/<button[^>]*style="background:var\(--accent-cyan\)[^"]*"[^>]*>Save</);
  });

  it("keeps the replay share card neutral; Share and Open stay actions", () => {
    const card = block(results({ saveState: "saved", replayCode: "AB12CD" }), "race-results-share-card");
    expect(card).toContain("AB12CD");
    expect(withoutActions(card)).not.toMatch(CYAN);
    expect(card).toMatch(/style="background:var\(--bg-secondary\);border:1px solid var\(--border-subtle\)"/);
    expect(card).toMatch(/data-testid="race-results-share-button"/);
    expect(card).toMatch(/<a[^>]*style="border-color:var\(--border-subtle\);color:var\(--accent-cyan\)"[^>]*href="\/r\/AB12CD"/);
    // Readable and tappable: no 10-12 px text, both actions at least 44 px tall.
    expect(card).not.toMatch(/text-\[10px\]|text-xs/);
    expect(card).toMatch(/<button[^>]*class="[^"]*min-h-11[^"]*"[^>]*data-testid="race-results-share-button"/);
    expect(card).toMatch(/<a[^>]*class="[^"]*min-h-11[^"]*"[^>]*href="\/r\/AB12CD"/);
  });

  it("keeps the briefing's words plain: only the start action and a selected course are cyan", () => {
    const html = renderToStaticMarkup(<RaceBriefing onBack={noop} bestRecord={null} difficulty="medium" windStrength="medium" mode="simple"
      trialProfile={null} onChooseTrialCourse={noop} onStart={noop} />);
    expect(withoutActions(html)).not.toMatch(CYAN);
  });
});
