import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as Icons from "./RaceIcons";

// Contract (M1-7): race icons are local inline SVG in the text colour, hidden
// from assistive tech so the visible label stays the name; the medal carries
// its number and a localized name.

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());

it("draws every line icon locally, in currentColor and hidden from screen readers", () => {
  const icons = Object.entries(Icons).filter(([name]) => name !== "MedalIcon");
  expect(icons.map(([name]) => name).sort()).toEqual(["AlertIcon", "CameraIcon", "CheckIcon", "CloseIcon", "CompassIcon", "ExpandIcon", "FlagIcon", "HintIcon", "MinusIcon", "PlusIcon", "ReplayIcon", "ShareIcon", "TargetIcon", "TrophyIcon"]);
  for (const [name, Icon] of icons) {
    const html = renderToStaticMarkup(React.createElement(Icon as (p: { size?: number }) => React.ReactElement, { size: 20 }));
    expect(html, name).toMatch(/^<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"/);
    expect(html, name).toContain('aria-hidden="true"');
    expect(html, name).not.toMatch(/href|url\(|https?:|<image|<text/);
  }
});

it("names a podium medal and shows its number", () => {
  const html = renderToStaticMarkup(<Icons.MedalIcon place={2} label="Platz 2" />);
  expect(html).toContain('role="img" aria-label="Platz 2" data-medal="2"');
  expect(html).toMatch(/<text[^>]*>2<\/text>/);
});
