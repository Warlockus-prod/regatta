import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RaceStartFlags } from "./RaceStartFlags";

// Contract (M3-3): the start flags are small inline SVG images with an
// accessible name in all seven languages; nothing renders without a flag;
// no external asset, no cyan, no animation.

const locale = vi.hoisted(() => ({ value: "en" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ tl: (copy: Record<string, string>) => copy[locale.value] }) }));
beforeEach(() => { vi.stubGlobal("React", React); locale.value = "en"; });
afterEach(() => vi.unstubAllGlobals());

const LANGS = ["ru", "en", "pl", "es", "fr", "de", "it"] as const;
const label = (html: string, flag: string) => html.match(new RegExp(`aria-label="([^"]+)"[^>]*data-flag="${flag}"`))?.[1];

describe("race start flags", () => {
  it("names the class flag, P and X in every language, each differently", () => {
    const seen = new Map<string, Set<string>>();
    for (const lang of LANGS) {
      locale.value = lang;
      const html = renderToStaticMarkup(<RaceStartFlags flags={["class", "preparatory", "recall"]} />);
      expect(html, lang).toMatch(/^<ul [^>]*aria-label="[^"]+"/);
      for (const flag of ["class", "preparatory", "recall"]) {
        const name = label(html, flag);
        expect(name, `${lang} ${flag}`).toBeTruthy();
        // One name source: an SVG <title> next to aria-label would be read again as the description.
        expect(html.split(name!).length - 1, `${lang} ${flag} named once`).toBe(1);
        (seen.get(flag) ?? seen.set(flag, new Set()).get(flag)!).add(name!);
      }
      expect(html, lang).not.toMatch(/[\u2013\u2014\u2026\u201c\u201d]/);
      expect(html, `${lang} no svg title`).not.toContain("<title>");
    }
    for (const [flag, names] of seen) expect(names.size, flag).toBe(LANGS.length);
    locale.value = "pl";
    expect(label(renderToStaticMarkup(<RaceStartFlags flags={["recall"]} />), "recall")).toBe("Flaga X: odwołanie indywidualne, wróć za linię");
  });

  it("renders nothing when no flag is up", () => {
    expect(renderToStaticMarkup(<RaceStartFlags flags={[]} />)).toBe("");
  });

  it("is local SVG with signal colours, never cyan, and does not animate", () => {
    const html = renderToStaticMarkup(<RaceStartFlags flags={["class", "preparatory", "recall"]} />);
    expect(html).not.toMatch(/href=|src=|url\(/);
    expect(html).not.toContain("accent-cyan");
    const css = readFileSync(join(process.cwd(), "src/features/race-hud/RaceFeedbackLayer.module.css"), "utf8");
    const rules = css.split("\n").filter(line => /\.startFlags?\b/.test(line)).join("\n");
    expect(rules).toContain("pointer-events:none");
    expect(rules).not.toMatch(/animation|transition|accent-cyan/);
  });
});
