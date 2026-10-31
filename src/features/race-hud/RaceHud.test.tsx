import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SpeedCard } from "./RaceHud";

// Contract (M1-7): the speed card writes the language's own knot sign, never
// a hard-coded "kn" in Russian, Polish or French.

const locale = vi.hoisted(() => ({ value: "en" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ tl: (copy: Record<string, string>) => copy[locale.value] }) }));
beforeEach(() => { vi.stubGlobal("React", React); locale.value = "en"; });
afterEach(() => vi.unstubAllGlobals());

it("writes the speed with the language's own knot sign", () => {
  for (const [lang, unit] of [["ru", "уз"], ["pl", "w."], ["fr", "nd"], ["en", "kn"]] as const) {
    locale.value = lang;
    const html = renderToStaticMarkup(<SpeedCard speed={5.24} target={6} pointName="x" pointColor="#ffffff" />);
    expect(html, lang).toMatch(new RegExp(`>5\\.2</span><span class="[^"]*">${unit.replace(".", "\\.")}</span>`));
  }
});
