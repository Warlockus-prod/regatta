import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameMenu } from "./GameMenu";
import { raceSetupWindMultiplier } from "@/lib/race-setup";
import { LEGACY_RACE_BOAT } from "@/lib/race-physics";

// Contract (pro-start-trim): every new race on the actual race page starts
// the player's sheets from raceStartTrim for the race's wind and the player's
// start heading, the trim race-spawn.test.ts proves the coach calls good. A
// revert of initRace to the old at-rest solve (or any other starting trim)
// turns this red; the trim itself is covered in src/lib/race-spawn.test.ts.

const capture = vi.hoisted(() => ({ menu: null as ComponentProps<typeof GameMenu> | null }));
const startTrim = vi.hoisted(() => ({ calls: [] as unknown[][] }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("./GameMenu", () => ({ GameMenu: (props: ComponentProps<typeof GameMenu>) => { capture.menu = props; return null; } }));
vi.mock("./RaceResults", () => ({ RaceResults: () => null }));
vi.mock("./RaceBriefing", () => ({ RaceBriefing: () => null }));
vi.mock("./RaceCockpit", () => ({ RaceCockpit: () => null, RaceModePicker: () => null }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("./race-start-trim", async original => {
  const actual = await original<typeof import("./race-start-trim")>();
  return { ...actual, raceStartTrim: (...args: Parameters<typeof actual.raceStartTrim>) => { startTrim.calls.push(args); return actual.raceStartTrim(...args); } };
});

const values = new Map<string, string>();
beforeEach(() => {
  values.clear(); capture.menu = null; startTrim.calls = [];
  vi.stubGlobal("React", React);
  vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("starting sheets on the actual race page", () => {
  it("a new race takes the player's sheets from raceStartTrim for the race wind and the start heading", async () => {
    vi.resetModules();
    const { default: GameClient } = await import("./GameClient");
    renderToStaticMarkup(<GameClient />);
    expect(startTrim.calls).toEqual([]);
    capture.menu!.onStart();
    // The legacy race starts on its own boat, the classic profile (ADR-0021).
    expect(startTrim.calls).toEqual([[raceSetupWindMultiplier("medium"), 45, LEGACY_RACE_BOAT]]);
  });
});
