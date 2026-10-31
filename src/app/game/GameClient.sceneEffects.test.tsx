import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { Children, isValidElement, type ComponentProps, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RaceCockpit } from "./RaceCockpit";
import { createFeedbackState, postContact } from "@/features/race-hud/feedback";

// M3-5 wiring: the racing GameClient tells the 3D scene about the start gun
// (started) and each contact (the feedback bus's contact id), which the scene
// turns into its short camera shake.
const capture = vi.hoisted(() => ({ cockpit: null as ComponentProps<typeof RaceCockpit> | null, state: null as unknown, gameState: "racing" }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => actual.useState(initial === "menu" ? capture.gameState : initial) };
});
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./RaceCockpit", () => ({ RaceCockpit: (props: ComponentProps<typeof RaceCockpit>) => { capture.cockpit = props; return null; }, RaceModePicker: () => null }));
vi.mock("./race-prefs", () => ({ useRacePrefs: () => ({ prefs: { mode: "pro", guidance: true, trimHints: true, rules: true, penalties: false }, update: vi.fn() }) }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("./useRaceLoop", () => ({ useRaceLoop: () => undefined }));
vi.mock("@/features/race-hud/useRaceFeedback", () => ({ useRaceFeedback: () => ({ feedback: capture.state, post: vi.fn(), contact: vi.fn(), clear: vi.fn() }) }));
import GameClient from "./GameClient";

beforeEach(() => { capture.cockpit = null; capture.gameState = "racing"; vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); });

function sceneProps(): Record<string, unknown> {
  const children = Children.toArray(capture.cockpit!.children as React.ReactNode).filter(isValidElement) as ReactElement<Record<string, unknown>>[];
  const scene = children.find(child => "boatsRef" in child.props && "venue" in child.props);
  expect(scene).toBeDefined();
  return scene!.props;
}

describe("solo race scene events (M3-5)", () => {
  it("passes the start gun and the current contact id to the scene", () => {
    capture.state = postContact(createFeedbackState(), 0.1, false);
    renderToStaticMarkup(<GameClient />);
    const props = sceneProps();
    const contact = (capture.state as ReturnType<typeof createFeedbackState>).contact;
    expect(contact).not.toBeNull();
    expect(props.contactId).toBe(contact!.id);
    expect(props.started).toBe(true);
  });

  it("keeps started false through the countdown, so the gun is the false-to-true change", () => {
    capture.state = createFeedbackState();
    capture.gameState = "countdown";
    renderToStaticMarkup(<GameClient />);
    expect(sceneProps().started).toBe(false);
  });

  it("passes no contact id while no contact frame is shown", () => {
    capture.state = createFeedbackState();
    renderToStaticMarkup(<GameClient />);
    expect(sceneProps().contactId).toBeUndefined();
  });
});
