import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

// M4-4 contract: the finish screen lists the splits against your best race
// under the skill bars: each mark you rounded and the finish, your time and
// the difference, green with "-" and "ahead", red with "+" and "behind". No
// ghost, no section. The HUD toast at the mark carries the same words.

vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./RaceCockpit", () => ({ RaceModePicker: () => null }));
vi.mock("next/link", () => ({
  default: ({ href, prefetch: _p, children, ...rest }: { href: string; prefetch?: boolean; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-controls", () => ({ recordControlChange: () => {}, recordDiagnostic: () => {} }));
import { RaceResults } from "./RaceResults";
import { eventText } from "@/features/race-hud/events";
import { raceEventSource } from "@/features/race-hud/feedback";
import type { GhostSplit } from "@/lib/race-ghost-splits";
import type { Boat } from "./race-model";

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
const splits: GhostSplit[] = [
  { at: "mark", index: 0, timeSec: 62.3, ghostSec: 64.7, deltaSec: -2.4, verdict: "ahead" },
  { at: "finish", index: 0, timeSec: 101.5, ghostSec: 100.4, deltaSec: 1.1, verdict: "behind" },
];
const row = (html: string, at: string) => html.match(new RegExp(`<li[^>]*data-testid="race-split-${at}"[^>]*>(.*?)</li>`))?.[0] ?? "";

describe("splits against your best on the finish screen", () => {
  it("shows the mark green and ahead, the finish red and behind, with signs and words", () => {
    const html = results({ ghostSplits: splits });
    expect(html).toContain("Splits against your best");
    const mark = row(html, "mark"), finish = row(html, "finish");
    expect(mark).toContain('data-verdict="ahead"');
    expect(mark).toContain("Windward mark");
    expect(mark).toContain("1:02.3");
    expect(mark).toMatch(/color:var\(--success\)[^>]*>-2\.4 s, ahead</);
    expect(finish).toMatch(/color:var\(--danger\)[^>]*>\+1\.1 s, behind</);
    expect(html).not.toMatch(/race-split[^"]*"[^>]*accent-cyan/);
  });

  it("shows nothing without a ghost", () => {
    expect(results({ ghostSplits: [] })).not.toContain("race-results-splits");
    expect(results({})).not.toContain("race-results-splits");
  });

  it("gives the HUD toast its own source with the same words", () => {
    expect(raceEventSource("split")).toBe("split");
    expect(eventText("en", { kind: "split", deltaSec: -2.4, verdict: "ahead" })).toBe("Against your best: -2.4 s, ahead");
    expect(eventText("pl", { kind: "split", deltaSec: 0.8, verdict: "behind" })).toBe("Względem najlepszego wyniku: +0.8 s, z tyłu");
  });
});
