import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MultiplayerSoundscapeState } from "./useMultiplayerSoundscape";
import type { MultiplayerFrame } from "./presentation";
import type { RaceWindReading } from "@/features/race-hud/navigation-model";

// Contract (M3-2 tail): the actual multiplayer page hands the soundscape the
// same phase, reconnect state, HUD frame and wind reading the cockpit shows,
// and the race sound switch; it does so in every phase, so leaving the race
// for the menu switches the beds off.
// A static render runs no effect and no render loop, so the HUD frame and the
// wind reading are seeded as sentinels: without them both sides would be null.
const capture = vi.hoisted(() => ({ phase: "racing", soundOn: true, reconnecting: false, falses: 0, sinceMenu: -1,
  frame: { boats: [], windDir: 0, windKnots: 12, time: 1, guidance: null } as MultiplayerFrame,
  reading: { apparentKnots: 14 } as unknown as RaceWindReading,
  scape: [] as MultiplayerSoundscapeState[], cockpit: null as null | Record<string, unknown> }));
// The page's `frame` and `windReading` states are the 14th and 15th after `phase`.
const FRAME_SLOT = 13, READING_SLOT = 14;
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  // The first boolean false state of the page is `reconnecting`, the null
  // states at FRAME_SLOT and READING_SLOT are `frame` and `windReading` (all
  // checked through the cockpit props below, so a reorder fails instead of passing).
  const seed = (initial: unknown) => {
    if (initial === "menu") { capture.sinceMenu = 0; return capture.phase; }
    const slot = capture.sinceMenu >= 0 ? ++capture.sinceMenu : -1;
    if (initial === null && slot === FRAME_SLOT) return capture.frame;
    if (initial === null && slot === READING_SLOT) return capture.reading;
    return initial === false && capture.falses++ === 0 ? capture.reconnecting : initial;
  };
  return { ...actual, useState: (initial: unknown) => actual.useState(seed(initial)),
    // The client snapshot, so the race sound setting is read as on the device.
    useSyncExternalStore: <T,>(_subscribe: unknown, get: () => T) => get() };
});
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("@/lib/diagnostics-bridge", () => ({ initializeDiagnosticBridge: vi.fn() }));
vi.mock("@/features/venues/useVenue", () => ({ useVenue: () => ({ venue: null }) }));
vi.mock("../game/race-prefs", () => ({ useRacePrefs: () => ({ prefs: { windDisplay: "compass", miniMap: true }, update: vi.fn() }) }));
vi.mock("./MultiplayerLobby", () => ({ MultiplayerMenu: () => null, MultiplayerRoom: () => null }));
vi.mock("./MultiplayerCockpit", () => ({ MultiplayerCockpit: (props: Record<string, unknown>) => { capture.cockpit = props; return null; } }));
vi.mock("@/lib/sounds", async original => ({ ...(await original<typeof import("@/lib/sounds")>()), readRaceSound: () => capture.soundOn }));
vi.mock("./useMultiplayerSoundscape", () => ({ useMultiplayerSoundscape: (state: MultiplayerSoundscapeState) => { capture.scape.push(state); } }));
import MultiplayerClient from "./MultiplayerClient";

beforeEach(() => { capture.phase = "racing"; capture.soundOn = true; capture.reconnecting = false; capture.scape = []; capture.cockpit = null; vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); });

function render(phase: string) {
  capture.phase = phase; capture.falses = 0; capture.sinceMenu = -1;
  renderToStaticMarkup(<MultiplayerClient />);
  expect(capture.scape).toHaveLength(1);
  return capture.scape[0];
}

describe("multiplayer page soundscape wiring", () => {
  it("passes what the cockpit shows: phase, reconnecting, frame and wind reading", () => {
    for (const phase of ["countdown", "racing", "finished"]) {
      capture.scape = [];
      const state = render(phase);
      const cockpit = capture.cockpit!;
      expect(state.phase, phase).toBe(phase);
      expect(cockpit.phase).toBe(phase);
      expect(state.reconnecting).toBe(cockpit.reconnecting);
      expect(cockpit.frame).toBe(capture.frame);
      expect(cockpit.windReading).toBe(capture.reading);
      expect(state.frame).toBe(capture.frame);
      expect(state.windReading).toBe(capture.reading);
      expect(state.soundOn).toBe(true);
    }
  });

  it("passes a dropped socket that is reconnecting", () => {
    capture.reconnecting = true;
    const state = render("racing");
    expect(capture.cockpit!.reconnecting).toBe(true);
    expect(state.reconnecting).toBe(true);
  });

  it("passes the race sound switch", () => {
    capture.soundOn = false;
    expect(render("racing").soundOn).toBe(false);
  });

  it("still runs on the menu and in the lobby, so leaving the race silences it", () => {
    expect(render("menu").phase).toBe("menu");
    capture.scape = [];
    expect(render("lobby").phase).toBe("lobby");
  });
});
