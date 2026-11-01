import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import type { RaceBriefing } from "./RaceBriefing";

// Contract (M4-4): the actual GameClient looks up your ghost of this class
// when the countdown starts, in the iOS app as well as on the web: the app's
// race bridge has put the native ghost row into this page's localStorage.
const capture = vi.hoisted(() => ({ briefing: null as ComponentProps<typeof RaceBriefing> | null, read: vi.fn() }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => actual.useState(initial === "menu" ? "briefing" : initial) };
});
vi.mock("@/lib/race-ghost", async original => {
  const actual = await original<typeof import("@/lib/race-ghost")>();
  return { ...actual, readGhostStore: (storage: Parameters<typeof actual.readGhostStore>[0]) => { capture.read(storage); return actual.readGhostStore(storage); } };
});
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./RaceBriefing", () => ({ RaceBriefing: (props: ComponentProps<typeof RaceBriefing>) => { capture.briefing = props; return null; }, PhysicalTrialNote: () => null }));
vi.mock("./RaceCockpit", () => ({ RaceCockpit: () => null, RaceModePicker: () => null }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("@/lib/funnel", () => ({ trackRaceCountdown: vi.fn(), trackRaceEnd: vi.fn(), trackRaceMark: vi.fn(), trackRaceTack: vi.fn() }));
vi.mock("./useRaceLoop", () => ({ useRaceLoop: () => {} }));
import GameClient from "./GameClient";

const storage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
beforeEach(() => { capture.briefing = null; capture.read.mockReset(); vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("ghost lookup at the countdown", () => {
  for (const native of [false, true]) it(native ? "in the iOS app" : "on the web", () => {
    renderToStaticMarkup(<GameClient />);
    expect(capture.briefing).not.toBeNull();
    vi.stubGlobal("window", { __REGATTA_RACE_NATIVE__: native, localStorage: storage, location: { search: "" } });
    try { capture.briefing!.onStart(); } catch { /* state setters of a static render may throw after the lookup */ }
    expect(capture.read).toHaveBeenCalledWith(storage);
  });
});
