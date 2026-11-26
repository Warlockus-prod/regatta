import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { RaceCockpit } from "./RaceCockpit";
import type { RaceLoopInput } from "./useRaceLoop";
import { createFeedbackState } from "@/features/race-hud/feedback";
import type { HintLogEntry } from "@/features/race-hud/hint-log";

// F4 wiring: in the actual racing GameClient every message given to the
// feedback bus (race events, rule and missed-mark notices, first race hints)
// is also added to the race's hint log with the race time, the cockpit gets
// that log, and a restart clears it.
const capture = vi.hoisted(() => ({ cockpit: null as ComponentProps<typeof RaceCockpit> | null, loop: [] as RaceLoopInput[],
  post: vi.fn(), add: vi.fn(), clearLog: vi.fn(), entries: [] as HintLogEntry[] }));
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
vi.mock("@/features/race-hud/useRaceFeedback", () => ({ useRaceFeedback: () => ({ feedback: createFeedbackState(), post: capture.post, contact: vi.fn(), clear: vi.fn() }) }));
vi.mock("@/features/race-hud/RaceHintLog", () => ({ useRaceHintLog: () => ({ entries: capture.entries, add: capture.add, clear: capture.clearLog }) }));
import GameClient from "./GameClient";

beforeEach(() => {
  capture.cockpit = null; capture.loop = [];
  capture.post.mockReset(); capture.add.mockReset(); capture.clearLog.mockReset();
  capture.entries = [{ id: 1, kind: "rule", text: "Keep clear.", tone: "danger", at: 12 }];
  vi.stubGlobal("React", React);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("solo race hint log wiring (F4)", () => {
  it("logs every bus message with the race time, kind and tone, and hands the log to the cockpit", () => {
    renderToStaticMarkup(<GameClient />);
    const [loop] = capture.loop;
    loop.refs.raceClockRef.current = 42.5;
    loop.showEvent({ kind: "tack", lossKn: 1.24 }, "info");
    loop.showNotice("Port tack gives way.", "rule", "danger");
    loop.showNotice("Finish not counted.", "missed-mark", "danger");
    loop.showHint!({ id: "first-tack" } as Parameters<NonNullable<RaceLoopInput["showHint"]>>[0]);
    expect(capture.post).toHaveBeenCalledTimes(4);
    expect(capture.add.mock.calls.slice(0, 3)).toEqual([
      ["race", "Tack: -1.2 kn", "info", 42.5],
      ["rule", "Port tack gives way.", "danger", 42.5],
      ["rule", "Finish not counted.", "danger", 42.5],
    ]);
    const [kind, text, tone, at] = capture.add.mock.calls[3];
    expect([kind, tone, at]).toEqual(["hint", "info", 42.5]);
    expect(text).toBe(capture.post.mock.calls[3][0].text);
    expect(capture.cockpit!.hintLog).toBe(capture.entries);
  });

  it("clears the log when the race starts again", () => {
    renderToStaticMarkup(<GameClient />);
    capture.clearLog.mockReset();
    capture.cockpit!.onRestart();
    expect(capture.clearLog).toHaveBeenCalled();
  });

  // Effects do not run in this node renderer, so the feed of the route and
  // trim lines is read from the source; what they select is tested in
  // hint-log.test.ts (loggedRouteAction, loggedTrimKey).
  it("feeds the selected route and trim lines into the log with the race time", () => {
    const source = readFileSync(join(process.cwd(), "src/app/game/GameClient.tsx"), "utf8");
    expect(source).toMatch(/const loggedRoute = loggedRouteAction\(gameState === "racing", racePrefs\.guidance, routeGuidance\?\.action\);/);
    expect(source).toMatch(/useEffect\(\(\) => \{ if \(loggedRoute\) addHint\("route", copyRef\.current\.actions\[loggedRoute\], "info", raceClockRef\.current\); \}, \[loggedRoute, addHint\]\);/);
    expect(source).toMatch(/const loggedTrim = loggedTrimKey\(gameState === "racing", playingPrefs, trimCoach\);/);
    expect(source).toMatch(/useEffect\(\(\) => \{ if \(loggedTrim\) addHint\("trim", trimLabelsRef\.current\[loggedTrim\], "info", raceClockRef\.current\); \}, \[loggedTrim, addHint\]\);/);
  });
});
