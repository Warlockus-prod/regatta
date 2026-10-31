import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Static render reads the live store (as a hydrated client does), so the
// header's hidden state follows the game layer the race claims.
vi.mock("react", async original => ({ ...await original<typeof import("react")>(),
  useSyncExternalStore: (_subscribe: unknown, get: () => unknown) => get() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/game" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "en", tl: (value: Record<string, string>) => value.en }) }));
vi.mock("./LanguageToggle", () => ({ default: () => null }));
vi.mock("./ThemeToggle", () => ({ default: () => null }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
import { claimGameLayer, gameLayerActive, GAME_LAYER_ATTRIBUTE, subscribeGameLayer } from "./game-layer";
import Navigation from "./Navigation";

let releases: (() => void)[] = [];
beforeEach(() => { vi.stubGlobal("React", React); });
afterEach(() => { for (const release of releases) release(); releases = []; vi.unstubAllGlobals(); });

describe("game layer: the race claims the viewport and the site header steps aside", () => {
  it("is held while any claim lasts, releases once per claim and mirrors itself on <body>", () => {
    const attributes = new Set<string>();
    vi.stubGlobal("document", { body: { setAttribute: (name: string) => attributes.add(name), removeAttribute: (name: string) => attributes.delete(name) } });
    const seen: boolean[] = [];
    const unsubscribe = subscribeGameLayer(() => seen.push(gameLayerActive()));
    expect(gameLayerActive()).toBe(false);
    const first = claimGameLayer(); releases.push(first);
    const second = claimGameLayer(); releases.push(second);
    expect(attributes.has(GAME_LAYER_ATTRIBUTE)).toBe(true);
    first(); first();
    expect(gameLayerActive()).toBe(true);
    second();
    expect(gameLayerActive()).toBe(false);
    expect(attributes.has(GAME_LAYER_ATTRIBUTE)).toBe(false);
    expect(seen).toEqual([true, true, true, false]);
    unsubscribe();
  });

  it("hides the site header with its Menu link only while the layer is claimed", () => {
    const shown = renderToStaticMarkup(<Navigation />);
    expect(shown).toMatch(/<nav[^>]*data-product-navigation/);
    expect(shown).not.toMatch(/<nav[^>]*hidden/);
    releases.push(claimGameLayer());
    const hidden = renderToStaticMarkup(<Navigation />);
    expect(hidden).toMatch(/<nav[^>]*hidden=""/);
    for (const release of releases) release(); releases = [];
    expect(renderToStaticMarkup(<Navigation />)).not.toMatch(/<nav[^>]*hidden/);
  });
});
