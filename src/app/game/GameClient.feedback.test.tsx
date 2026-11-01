import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { RaceCockpit } from "./RaceCockpit";
import type { RaceLoopInput } from "./useRaceLoop";
import { createFeedbackState, postContact, postFeedback } from "@/features/race-hud/feedback";

// M1-3 wiring: the actual racing GameClient sends every race event, rule
// notice, missed-mark notice and contact from the loop into the one feedback
// bus, and the cockpit draws what the bus shows; no notice goes into the dock
// text slot any more, where it used to hide the events.
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

describe("solo race feedback wiring (M1-3)", () => {
  it("routes loop events, notices and contacts into the bus and the bus into the cockpit", () => {
    renderToStaticMarkup(<GameClient />);
    const [loop] = capture.loop;
    expect("setRuleNotice" in loop.set).toBe(false);
    loop.showEvent({ kind: "tack", lossKn: 1.24 }, "info");
    loop.showEvent({ kind: "gained", place: 2 }, "success");
    loop.showEvent({ kind: "mark", place: 3, gapSec: 4.26 }, "info");
    loop.showNotice("Port tack gives way.", "rule", "danger");
    loop.showNotice("Finish not counted.", "missed-mark", "danger");
    expect(capture.post.mock.calls.map(([post]) => post)).toEqual([
      { source: "manoeuvre", text: "Tack: -1.2 kn", tone: "info" },
      { source: "place", text: "Overtake! You're 2nd", tone: "success" },
      { source: "mark", text: "Mark: 3rd, +4.3 s", tone: "info" },
      { source: "rule", text: "Port tack gives way.", tone: "danger" },
      { source: "missed-mark", text: "Finish not counted.", tone: "danger" },
    ]);
    loop.showContact();
    expect(capture.contact).toHaveBeenCalledTimes(1);
    const state = capture.state as ReturnType<typeof createFeedbackState>;
    expect(capture.cockpit!.feedback).toEqual({ toasts: state.visible, contact: state.contact });
    expect(capture.cockpit!.message).toBeUndefined();
    // The polar target is solved for the race wind; at the initial TWA 0 it is the no-go zone.
    expect(capture.cockpit!.targetSpeed).toBe(0);
  });
});
