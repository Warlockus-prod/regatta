import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { RaceResults } from "./RaceResults";
import type { RaceReplay } from "./RaceReplay";
// M4-3: the actual GameClient opens the replay from the results playing from
// the start, and from a debrief item playing at that moment; the replay gets
// the race log's events and the judge's items for its ribbon. Without a
// replay (a log of under five samples) the results offer no "watch".
//
// A static render runs no effects and drops state updates, so the two states
// this needs are replaced in the react mock: the page phase (initial "menu")
// and the replay opening (the {at, autoplay} object) report their setters to
// `capture`; the n-th empty-array ref can be seeded with a recorded log.
const capture = vi.hoisted(() => ({
  phase: "finished", replayOpen: null as unknown, setPhase: [] as unknown[], setReplayOpen: [] as unknown[],
  results: null as ComponentProps<typeof RaceResults> | null, replay: null as ComponentProps<typeof RaceReplay> | null,
  logNth: -1, seen: 0, log: [] as unknown[],
}));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  const isReplayOpen = (v: unknown) => !!v && typeof v === "object" && "autoplay" in v && "at" in v;
  return { ...actual,
    useState: (initial: unknown) => {
      if (initial === "menu") return [capture.phase, (v: unknown) => capture.setPhase.push(v)];
      if (isReplayOpen(initial)) return [capture.replayOpen ?? initial, (v: unknown) => capture.setReplayOpen.push(v)];
      return actual.useState(initial);
    },
    useRef: (initial?: unknown) => actual.useRef(Array.isArray(initial) && initial.length === 0 && capture.seen++ === capture.logNth ? capture.log : initial),
  };
});
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./RaceResults", () => ({ RaceResults: (props: ComponentProps<typeof RaceResults>) => { capture.results = props; return null; } }));
vi.mock("./RaceReplay", () => ({ RaceReplay: (props: ComponentProps<typeof RaceReplay>) => { capture.replay = props; return null; } }));
vi.mock("./RaceCockpit", () => ({ RaceCockpit: () => null, RaceModePicker: () => null }));
vi.mock("./GameMenu", () => ({ GameMenu: () => null }));
vi.mock("./RaceBriefing", () => ({ RaceBriefing: () => null }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("./useRaceLoop", () => ({ useRaceLoop: () => {} }));
import GameClient from "./GameClient";

const log = Array.from({ length: 8 }, (_, i) => ({ t: i * 0.5, x: 500, y: 1200, heading: 0, twa: 45, speed: 5, lap: 0 }));
function render() {
  capture.results = null; capture.replay = null; capture.seen = 0;
  renderToStaticMarkup(<GameClient />);
}
/** Render with a recorded log in the n-th empty-array ref that turns the replay on. */
function withLog() {
  capture.log = log;
  for (let nth = 0; nth < 40; nth++) {
    capture.logNth = nth;
    try { render(); } catch { continue; }
    if (capture.results && !capture.results.replayDisabled) return;
  }
  throw new Error("the recorded log never reached the replay");
}

beforeEach(() => {
  Object.assign(capture, { phase: "finished", replayOpen: null, setPhase: [], setReplayOpen: [], logNth: -1, log: [] });
  vi.stubGlobal("React", React);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("solo race replay opening (M4-3)", () => {
  it("opens from the results playing from the start, and from a debrief item at its moment", () => {
    withLog();
    capture.results!.onReplay();
    expect(capture.setReplayOpen.at(-1)).toEqual({ at: null, autoplay: true });
    expect(capture.setPhase.at(-1)).toBe("replay");
    capture.results!.onWatch!(31);
    expect(capture.setReplayOpen.at(-1)).toEqual({ at: 31, autoplay: true });
    expect(capture.setPhase.at(-1)).toBe("replay");
  });

  it("offers no watch without a replay", () => {
    render();
    expect(capture.results?.replayDisabled).toBe(true);
    expect(capture.results?.onWatch).toBeUndefined();
  });

  it("hands the opening, the log's events and the judge items to the replay", () => {
    capture.phase = "replay";
    capture.replayOpen = { at: 31, autoplay: true };
    render();
    expect(capture.replay).toMatchObject({ autoplay: true, startAt: 31 });
    expect(Array.isArray(capture.replay?.events)).toBe(true);
    // No judge debrief yet in this render: the ribbon simply has no judge items.
    expect(capture.replay?.judgeItems).toBeUndefined();
  });

  it("the native history replay opens paused at the start", () => {
    capture.phase = "replay";
    render();
    expect(capture.replay).toMatchObject({ autoplay: false, startAt: null });
  });
});
