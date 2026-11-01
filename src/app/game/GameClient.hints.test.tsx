import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { RaceCockpit } from "./RaceCockpit";
import type { RaceLoopInput } from "./useRaceLoop";
import { createFeedbackState, postContact, postFeedback } from "@/features/race-hud/feedback";

// M4-7 wiring: the actual racing GameClient hands the loop the first race
// hints record and a showHint that posts the hint text to the one feedback
// bus (source "hint", tagged with its id), and gives the cockpit Settings its
// "Show hints again", which empties the record the loop reads.
const capture = vi.hoisted(() => ({ cockpit: null as ComponentProps<typeof RaceCockpit> | null, loop: [] as RaceLoopInput[],
  post: vi.fn(), contact: vi.fn(), clear: vi.fn(), state: null as unknown }));
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
vi.mock("@/features/race-hud/useRaceFeedback", () => ({ useRaceFeedback: () => ({ feedback: capture.state, post: capture.post, contact: capture.contact, clear: capture.clear }) }));
import GameClient from "./GameClient";

beforeEach(() => {
  capture.cockpit = null; capture.loop = [];
  capture.post.mockReset(); capture.contact.mockReset(); capture.clear.mockReset();
  capture.state = postContact(postFeedback(createFeedbackState(), { source: "rule", text: "Keep clear.", tone: "danger" }, 0), .1, false);
  vi.stubGlobal("React", React);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("first race hints wiring (M4-7)", () => {
  it("routes a due hint into the bus and Show hints again into the loop's record", () => {
    renderToStaticMarkup(<GameClient />);
    const [loop] = capture.loop;
    expect(loop.refs.firstHintsRef).toBeDefined();
    loop.showHint!({ id: "crossing", giveWay: true });
    expect(capture.post.mock.calls.map(([post]) => post)).toEqual([
      { source: "hint", text: "A boat on the other tack. You're on port tack: keep clear and pass astern of it.", tone: "info", tag: "crossing" },
    ]);
    const before = loop.refs.firstHintsRef!.current.revision;
    capture.cockpit!.onShowHintsAgain!();
    expect(loop.refs.firstHintsRef!.current).toEqual({ seen: new Set(), revision: before + 1 });
  });
});
