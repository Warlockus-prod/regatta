import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import type { ComponentProps, ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// M4-3 contract: on the finish screen every judge item and every coach
// mistake that is one moment has "Watch the moment", and the main mistake
// "Watch the mistake"; a tap opens the replay at that race moment (the replay
// itself starts 5 s before it). A whole-race note gets no button, and nothing
// is offered when the race has no replay.

vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./RaceCockpit", () => ({ RaceModePicker: () => null }));
vi.mock("next/link", () => ({
  default: ({ href, prefetch: _p, children, ...rest }: { href: string; prefetch?: boolean; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-controls", () => ({ recordControlChange: () => {}, recordDiagnostic: () => {} }));
import { RaceResults } from "./RaceResults";
import { RaceJudgeReview } from "./RaceJudgeReview";
import { WatchMomentButton } from "./WatchMomentButton";
import { buildRaceJudgeDebrief } from "@/lib/race-judge";
import type { RaceRuleEvent } from "@/lib/race-rules";
import type { Boat, Coaching } from "./race-model";

const noop = () => {};
function results(patch: Partial<ComponentProps<typeof RaceResults>>) {
  const props = {
    copy: { debrief: "Race debrief" }, trialProfile: null, judgeDebrief: null, boatsRef: { current: [] as Boat[] }, nativeRace: false, nativeSave: "idle",
    retryNativeSave: noop, nativeBestSave: { status: "idle", id: "", requestId: "", retryable: false }, sceneRaceId: "race_1", requestNativeBest: noop,
    results: [{ name: "You", time: 101.5, color: "#c9f", isPlayer: true }], isNewRecord: false, bestRecord: null, missionResult: null,
    coachingSource: "local", coaching: null, coachingLoading: false, coachingError: null, saveState: "idle", setSaveState: noop, saveError: null,
    saveResult: noop, nicknameInput: "", setNicknameInput: noop, replayCode: null, nickname: null, difficulty: "medium", windStrength: "light",
    selectedMission: null, replayDisabled: false, onMenu: noop, onReplay: noop, onWatch: noop, onAgain: noop, ...patch,
  } as unknown as ComponentProps<typeof RaceResults>;
  return renderToStaticMarkup(<RaceResults {...props} />);
}
const mistake = (timeStart: number, timeEnd: number, title: string) => ({ timeStart, timeEnd, severity: "major" as const, titleRu: title, explanationRu: "why", fixRu: "fix", title });
const coaching = (...mistakes: ReturnType<typeof mistake>[]) => ({ overall: "ok", score: 60, strengths: [], nextGoalRu: "goal", mistakes }) as unknown as Coaching;
const at = (html: string, testId: string) => [...html.matchAll(new RegExp(`data-testid="${testId}" data-at="([^"]*)"`, "g"))].map(m => Number(m[1]));

beforeEach(() => { vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("watch the moment from the debrief (M4-3)", () => {
  it("the main mistake that is one moment gets 'Watch the mistake' next to the replay button", () => {
    const html = results({ coaching: coaching(mistake(42, 46, "Wide rounding"), mistake(0, 95, "No-go entries")) });
    expect(at(html, "race-watch-mistake")).toEqual([42]);
    expect(html).toContain("Watch the mistake");
    // Coach mistakes: the moment has a button, the whole-race note has none.
    expect(at(html, "race-watch-moment")).toEqual([42]);
    // Not cyan: a secondary action like the replay button; "Again" stays the one primary action.
    const button = html.slice(html.indexOf('data-testid="race-watch-mistake"') - 400, html.indexOf("Watch the mistake"));
    expect(button).not.toContain("color:var(--accent-cyan)");
    expect(html.match(/data-action="primary"/g)).toHaveLength(1);
  });

  it("offers no watch button for a whole-race main mistake, without a replay or without a handler", () => {
    expect(results({ coaching: coaching(mistake(0, 95, "Slow pace")) })).not.toContain("race-watch");
    const moment = coaching(mistake(42, 46, "Wide rounding"));
    expect(results({ coaching: moment, replayDisabled: true })).not.toContain("race-watch");
    expect(results({ coaching: moment, onWatch: undefined })).not.toContain("race-watch");
  });

  it("every judge item, the start crowd included, opens its moment", () => {
    const events: RaceRuleEvent[] = [
      { id: "e0", kind: "avoid-contact", rule: "14", boatId: "player", otherBoatId: "bot-2", time: 3, penaltySeconds: 0 },
      { id: "e1", kind: "give-way", rule: "10", boatId: "player", otherBoatId: "bot-1", time: 33, penaltySeconds: 0 },
      { id: "e2", kind: "mark-touch", rule: "31", boatId: "player", time: 61, penaltySeconds: 3 },
    ];
    const debrief = buildRaceJudgeDebrief(events, { startedAt: 2, markRoundedAt: 60 });
    const html = renderToStaticMarkup(<RaceJudgeReview debrief={debrief} onWatch={noop} />);
    expect(at(html, "race-watch-moment")).toEqual(debrief.items.map(i => i.time));
    expect(debrief.items.some(i => i.jostle)).toBe(true);
    expect(debrief.items.some(i => !i.jostle)).toBe(true);
    expect(renderToStaticMarkup(<RaceJudgeReview debrief={debrief} />)).not.toContain("race-watch");
  });

  it("a tap hands the moment to the page", () => {
    const onWatch = vi.fn();
    const button = WatchMomentButton({ at: 42, onWatch }) as ReactElement<{ onClick: () => void }>;
    button.props.onClick();
    expect(onWatch).toHaveBeenCalledWith(42);
  });
});
