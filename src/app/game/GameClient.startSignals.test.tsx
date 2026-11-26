import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { RaceCockpit } from "./RaceCockpit";
import type { RaceLoopInput } from "./useRaceLoop";

// Contract (M3-3): the actual solo race feeds its countdown to the shared
// start signals (nothing before the scene's first frame, zero once racing,
// keyed by the race), and the race loop's recall plays the shared recall
// signal through the same playStartSignal; clearing it plays nothing.
const capture = vi.hoisted(() => ({ phase: "racing", cockpit: null as ComponentProps<typeof RaceCockpit> | null, loop: [] as RaceLoopInput[], signals: [] as [number | null, string | number][],
  // Seeded page state for one static render: the race id and the scene's
  // first frame (sceneRaceId is GameClient's only useState(""), sceneReady the
  // state right after it), the countdown second (the only useState(3)) and the
  // recall state right after it, and the Rules preference.
  raceId: "", sceneReady: false, countdown: 3, recall: false, rules: true, previous: undefined as unknown }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => {
    const previous = capture.previous; capture.previous = initial;
    const seeded = initial === "menu" ? capture.phase : initial === "" ? capture.raceId : initial === 3 ? capture.countdown
      : initial === false && previous === "" ? capture.sceneReady : initial === false && previous === 3 ? capture.recall : initial;
    return actual.useState(seeded);
  } };
});
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./RaceCockpit", () => ({ RaceCockpit: (props: ComponentProps<typeof RaceCockpit>) => { capture.cockpit = props; return null; }, RaceModePicker: () => null }));
vi.mock("./RaceResults", () => ({ RaceResults: () => null }));
vi.mock("./RaceReplay", () => ({ RaceReplay: () => null }));
vi.mock("./GameMenu", () => ({ GameMenu: () => null }));
vi.mock("./RaceBriefing", () => ({ RaceBriefing: () => null }));
vi.mock("./race-prefs", () => ({ useRacePrefs: () => ({ prefs: { mode: "simple", guidance: true, trimHints: true, rules: capture.rules, penalties: false }, update: vi.fn() }) }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("./useRaceLoop", () => ({ useRaceLoop: (input: RaceLoopInput) => { capture.loop.push(input); } }));
vi.mock("@/features/race-hud/useStartSignals", () => ({ useStartSignals: (second: number | null, key: string | number) => { capture.signals.push([second, key]); } }));
vi.mock("@/lib/sounds", async original => ({ ...(await original<typeof import("@/lib/sounds")>()), playStartSignal: vi.fn() }));
import GameClient from "./GameClient";
import { playStartSignal } from "@/lib/sounds";
beforeEach(() => {
  vi.mocked(playStartSignal).mockClear(); capture.cockpit = null; capture.loop = []; capture.signals = []; capture.phase = "racing";
  Object.assign(capture, { raceId: "", sceneReady: false, countdown: 3, recall: false, rules: true, previous: undefined });
  vi.stubGlobal("React", React);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("solo race start signals", () => {
  it("sounds nothing for a countdown the scene has not drawn yet", () => {
    capture.phase = "countdown";
    renderToStaticMarkup(<GameClient />);
    expect(capture.signals.at(-1)).toEqual([null, ""]);
    expect(capture.cockpit!.countdown).toBeUndefined();
  });

  it("passes zero once racing, keyed by the race scene", () => {
    capture.raceId = "race_a";
    renderToStaticMarkup(<GameClient />);
    expect(capture.signals.at(-1)).toEqual([0, "race_a"]);
  });

  it("passes each second of a countdown the scene has drawn, then zero, keyed by this race", () => {
    capture.raceId = "race_a"; capture.sceneReady = true;
    const seen: [number | null, string | number][] = [];
    for (const second of [3, 2, 1]) {
      capture.phase = "countdown"; capture.countdown = second;
      renderToStaticMarkup(<GameClient />);
      seen.push(capture.signals.at(-1)!);
      expect(capture.cockpit!.countdown).toBe(second);
    }
    capture.phase = "racing";
    renderToStaticMarkup(<GameClient />);
    seen.push(capture.signals.at(-1)!);
    expect(seen).toEqual([[3, "race_a"], [2, "race_a"], [1, "race_a"], [0, "race_a"]]);
  });

  it("keys a restarted race's countdown by the new race id, so it begins with the horn again", () => {
    capture.phase = "countdown"; capture.sceneReady = true;
    capture.raceId = "race_a"; renderToStaticMarkup(<GameClient />);
    const first = capture.signals.at(-1)!;
    capture.raceId = "race_b"; renderToStaticMarkup(<GameClient />);
    const restarted = capture.signals.at(-1)!;
    expect(first).toEqual([3, "race_a"]);
    expect(restarted).toEqual([3, "race_b"]);
  });

  it("shows flag X only while the player is recalled and Rules are on", () => {
    capture.recall = true;
    renderToStaticMarkup(<GameClient />);
    expect(capture.cockpit!.recall).toBe(true);
    // Recalled, then Rules switched off mid-race: the race emits no start-clear any more, so X must not stay up.
    capture.rules = false;
    renderToStaticMarkup(<GameClient />);
    expect(capture.cockpit!.recall).toBe(false);
  });

  it.each([["menu"], ["finished"], ["replay"]])("passes no second in %s", phase => {
    capture.phase = phase;
    renderToStaticMarkup(<GameClient />);
    expect(capture.signals.at(-1)?.[0]).toBeNull();
  });

  it("plays the recall through the shared start signal when the race detects the player's early start", () => {
    renderToStaticMarkup(<GameClient />);
    const loop = capture.loop.at(-1)!;
    expect(capture.cockpit!.recall).toBe(false);
    loop.onStartRecall!(true);
    expect(playStartSignal).toHaveBeenCalledWith("recall");
    vi.mocked(playStartSignal).mockClear();
    loop.onStartRecall!(false);
    expect(playStartSignal).not.toHaveBeenCalled();
  });
});
