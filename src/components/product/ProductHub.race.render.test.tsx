import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Package 9 (audit B10): the website's Race hub has one Play with the last
// used settings named above it, the choices behind Change, a frame of the real
// race scene, and no separate solo race row (Play is the solo race).

vi.mock("next/link", () => ({
  default: ({ href, prefetch: _p, children, ...rest }: { href: string; prefetch?: boolean; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: "ru" }) }));
import ProductHub from "./ProductHub";
import { SCENE_STILL_WEB } from "@/lib/product/home-entry";

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());

describe("website Race hub", () => {
  it("plays the first race with one primary action and opens the lobby to change it", () => {
    const html = renderToStaticMarkup(<ProductHub section="race" />);
    const primaries = [...html.matchAll(/<a [^>]*data-action="primary"[^>]*>/g)];
    expect(primaries).toHaveLength(1);
    expect(primaries[0][0]).toContain('href="/game?difficulty=easy&amp;wind=medium&amp;play=1"');
    expect(html).toContain(">Играть<");
    expect(html).toMatch(/<a href="\/game\?difficulty=easy&amp;wind=medium"[^>]*>Изменить<\/a>/);
    expect(html).toContain("Лёгкий · средний ветер · Обычный");
    expect(html).toContain(`src="${SCENE_STILL_WEB}"`);
    expect(html).not.toContain('href="/game"');
    expect(html).toContain('href="/multiplayer"');
    expect(html).toContain('href="/leaderboard"');
  });

  it("keeps the other hubs as lists without a Play", () => {
    const html = renderToStaticMarkup(<ProductHub section="practice" />);
    expect(html).not.toContain('data-action="primary"');
    expect(html).not.toContain(SCENE_STILL_WEB);
  });
});
