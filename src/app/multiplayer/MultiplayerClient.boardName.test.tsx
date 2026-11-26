import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { destinations, type Language } from "@/lib/product/catalog";

// The real multiplayer page on its results screen: the link to the board carries
// the name the menu gives it. Finishing a room takes a whole race, so the browser
// checks do not reach this screen.
const capture = vi.hoisted(() => ({ panel: null as ReactNode, lang: "ru" }));
vi.mock("react", async original => {
  const actual = await original<typeof import("react")>();
  return { ...actual, useState: (initial: unknown) => actual.useState(initial === "menu" ? "finished" : initial) };
});
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: capture.lang,
  tl: (text: Record<string, string>) => text[capture.lang],
  tp: (ru: string, en: string, pl: string, rest: Record<string, string>) => ({ ru, en, pl, ...rest })[capture.lang] }) }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("@/lib/diagnostics-bridge", () => ({ initializeDiagnosticBridge: vi.fn() }));
vi.mock("@/features/venues/useVenue", () => ({ useVenue: () => ({ venue: null }) }));
vi.mock("../game/race-prefs", () => ({ useRacePrefs: () => ({ prefs: { windDisplay: "compass", miniMap: true }, update: vi.fn() }) }));
vi.mock("./MultiplayerLobby", () => ({ MultiplayerMenu: () => null, MultiplayerRoom: () => null }));
vi.mock("./MultiplayerCockpit", () => ({ MultiplayerCockpit: (props: Record<string, ReactNode>) => { capture.panel = props.results; return null; } }));
import MultiplayerClient from "./MultiplayerClient";

const board = destinations.find(destination => destination.id === "leaderboard")!;
const LANGUAGES: Language[] = ["ru", "en", "pl", "es", "fr", "de", "it"];

beforeEach(() => { capture.panel = null; vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); capture.lang = "ru"; });

describe("the multiplayer results screen names the board as the menu does", () => {
  it.each(LANGUAGES)("%s", lang => {
    capture.lang = lang;
    renderToStaticMarkup(<MultiplayerClient />);
    expect(renderToStaticMarkup(<>{capture.panel}</>)).toMatch(new RegExp(`<a[^>]*href="/leaderboard"[^>]*>${board.title[lang]}</a>`));
  });
});
