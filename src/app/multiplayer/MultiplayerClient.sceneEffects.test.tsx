import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// M3-5 wiring: the multiplayer page tells the 3D scene about the start gun
// (started false through the server countdown, true once racing), which the
// scene turns into its one short camera shake on the false-to-true change.
const capture = vi.hoisted(() => ({ children: null as ReactNode, phase: "racing" }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => actual.useState(initial === "menu" ? capture.phase : initial) };
});
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("@/lib/diagnostics-bridge", () => ({ initializeDiagnosticBridge: vi.fn() }));
vi.mock("@/features/venues/useVenue", () => ({ useVenue: () => ({ venue: null }) }));
vi.mock("../game/race-prefs", () => ({ useRacePrefs: () => ({ prefs: { windDisplay: "compass", miniMap: true }, update: vi.fn() }) }));
vi.mock("./MultiplayerLobby", () => ({ MultiplayerMenu: () => null, MultiplayerRoom: () => null }));
vi.mock("./MultiplayerCockpit", () => ({ MultiplayerCockpit: (props: { children?: ReactNode }) => { capture.children = props.children; return null; } }));
import MultiplayerClient from "./MultiplayerClient";

beforeEach(() => { capture.children = null; capture.phase = "racing"; vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); });

function sceneProps(phase: string): Record<string, unknown> {
  capture.phase = phase;
  renderToStaticMarkup(<MultiplayerClient />);
  const children = Children.toArray(capture.children).filter(isValidElement) as ReactElement<Record<string, unknown>>[];
  const scene = children.find(child => "boatsRef" in child.props && "venue" in child.props);
  expect(scene).toBeDefined();
  return scene!.props;
}

describe("multiplayer race scene events (M3-5)", () => {
  it("keeps started false through the server countdown", () => {
    expect(sceneProps("countdown").started).toBe(false);
  });

  it("passes started true once the server says racing", () => {
    expect(sceneProps("racing").started).toBe(true);
  });

  it("does not report a new start on the results screen", () => {
    // finished follows racing; a true-to-false change never shakes (createShakeEvents).
    expect(sceneProps("finished").started).toBe(false);
  });
});
