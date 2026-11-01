import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { RaceCockpit } from "./RaceCockpit";
import type { RaceLoopInput } from "./useRaceLoop";
import { recordWebDiagnostic } from "@/lib/diagnostics-web";

// Contract (owner test journal): the actual racing page writes the M1 actions
// a tester takes from the pause sheet into race.lifecycle (pause with its
// source, the exit question and its answer, Restart with its setup source,
// Exit with its phase), and hands the race loop the setup the summary reports.
const capture = vi.hoisted(() => ({ cockpit: null as ComponentProps<typeof RaceCockpit> | null, loop: [] as RaceLoopInput[] }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => actual.useState(initial === "menu" ? "racing" : initial) };
});
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./RaceCockpit", () => ({ RaceCockpit: (props: ComponentProps<typeof RaceCockpit>) => { capture.cockpit = props; return null; }, RaceModePicker: () => null }));
vi.mock("./race-prefs", () => ({ useRacePrefs: () => ({ prefs: { mode: "pro", guidance: true, trimHints: true, rules: true, penalties: false }, update: vi.fn() }) }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("./useRaceLoop", () => ({ useRaceLoop: (input: RaceLoopInput) => { capture.loop.push(input); } }));
import GameClient from "./GameClient";

type Lifecycle = { type: string; action?: string; [key: string]: unknown };
const lifecycle = () => vi.mocked(recordWebDiagnostic).mock.calls.map(([event]) => event as Lifecycle).filter(event => event.type === "race.lifecycle");
beforeEach(() => {
  capture.cockpit = null; capture.loop = []; vi.mocked(recordWebDiagnostic).mockReset();
  vi.stubGlobal("React", React);
  vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("race lifecycle diagnostics from the actual cockpit commands", () => {
  it("logs the Menu pause and Continue as pointer input with the phase", () => {
    renderToStaticMarkup(<GameClient />);
    const cockpit = capture.cockpit!;
    (cockpit.onPause as (event: unknown) => void)({ type: "click" });
    cockpit.onPause();
    expect(lifecycle()).toEqual([
      { type: "race.lifecycle", surface: "race", outcome: "accepted", action: "pause", source: "pointer", phase: "racing" },
      { type: "race.lifecycle", surface: "race", outcome: "accepted", action: "resume", source: "pointer", phase: "racing" },
    ]);
  });

  it("logs the exit question, Stay and the confirmed Exit", () => {
    renderToStaticMarkup(<GameClient />);
    const cockpit = capture.cockpit!;
    cockpit.onExitPrompt!("ask");
    cockpit.onExitPrompt!("stay");
    cockpit.onExit();
    expect(lifecycle().map(({ action, outcome, phase }) => ({ action, outcome, phase }))).toEqual([
      { action: "exit-ask", outcome: "accepted", phase: "racing" },
      { action: "exit-stay", outcome: "noop", phase: "racing" },
      { action: "exit", outcome: "accepted", phase: "racing" },
    ]);
  });

  it("logs Restart with its setup source and gives the loop the restarted setup", () => {
    renderToStaticMarkup(<GameClient />);
    capture.cockpit!.onRestart();
    const events = lifecycle();
    expect(events.map(event => event.action)).toEqual(["restart", "init", "countdown"]);
    expect(events[0]).toMatchObject({ action: "restart", setupSource: "restart", phase: "racing", mode: "pro" });
    expect(capture.loop[0].refs.raceSetupRef.current).toEqual({ source: "restart", briefingShown: false, race: "free" });
    expect(capture.loop[0].refs.raceTallyRef.current).toEqual({ missedMarkNotices: 0, contacts: 0 });
  });
});
