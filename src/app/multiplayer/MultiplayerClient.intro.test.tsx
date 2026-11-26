import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MultiplayerMenu } from "./MultiplayerLobby";
import type { RaceIntroProps } from "@/features/race-hud/RaceIntro";

// Contract (F5): multiplayer never opens the race intro by itself, not even on
// a device that has never seen it; its menu offers "How to race", which opens
// the intro on request (Close and Got it, never Start race), and closing it
// goes back to the menu.
const capture = vi.hoisted(() => ({ intro: "closed", menu: null as ComponentProps<typeof MultiplayerMenu> | null,
  introProps: null as RaceIntroProps | null, introSet: [] as unknown[] }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => {
    if (initial !== "closed") return actual.useState(initial);
    const [value, set] = actual.useState(capture.intro);
    return [value, (next: unknown) => { capture.introSet.push(next); set(next as string); }];
  } };
});
vi.mock("next/dynamic", () => ({ default: () => (props: Record<string, unknown>) => {
  if (typeof props.onEnd === "function") capture.introProps = props as unknown as RaceIntroProps;
  return null;
} }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (text: Record<string, string>) => text.en, tp: (_ru: string, en: string) => en }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("@/lib/diagnostics-bridge", () => ({ initializeDiagnosticBridge: vi.fn() }));
vi.mock("@/features/venues/useVenue", () => ({ useVenue: () => ({ venue: null }) }));
vi.mock("../game/race-prefs", () => ({ useRacePrefs: () => ({ prefs: { windDisplay: "compass", miniMap: true }, update: vi.fn() }) }));
vi.mock("./MultiplayerLobby", () => ({ MultiplayerMenu: (props: ComponentProps<typeof MultiplayerMenu>) => { capture.menu = props; return null; }, MultiplayerRoom: () => null }));
vi.mock("./MultiplayerCockpit", () => ({ MultiplayerCockpit: () => null }));
import MultiplayerClient from "./MultiplayerClient";

const values = new Map<string, string>();
beforeEach(() => {
  values.clear(); capture.intro = "closed"; capture.menu = null; capture.introProps = null; capture.introSet = [];
  vi.stubGlobal("React", React);
  vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("the race intro in multiplayer", () => {
  it("never opens by itself on a device that has not seen it", () => {
    renderToStaticMarkup(<MultiplayerClient />);
    expect(capture.menu).not.toBeNull();
    expect(capture.introProps).toBeNull();
    expect(capture.introSet).toEqual([]);
  });

  it("opens from How to race in the menu and closes back to it", () => {
    renderToStaticMarkup(<MultiplayerClient />);
    capture.menu!.onShowIntro!();
    expect(capture.introSet).toEqual(["multiplayer"]);
    capture.intro = "multiplayer";
    renderToStaticMarkup(<MultiplayerClient />);
    expect(capture.introProps).toMatchObject({ open: "multiplayer", pro: false });
    capture.introProps!.onEnd("close");
    expect(capture.introSet).toEqual(["multiplayer", "closed"]);
    expect(values.size).toBe(0);
  });
});
