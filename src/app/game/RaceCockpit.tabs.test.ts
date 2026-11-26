import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Browser report 2026-10-30: at 844x390 the 290 px dock with five equal tab
// columns and overflow-wrap:anywhere split "Держать курс" as "Держат / ь курс".
// Contract: a dock tab label wraps only between words in all seven languages,
// and every tab keeps a 44 px target. Node has no layout engine, so this pins
// the CSS that makes it so; the browser check is listed for the e2e suite.
const css = readFileSync(new URL("./RaceCockpit.module.css", import.meta.url), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");
/** Declarations of every rule whose selector list contains exactly `selector`. */
const declarations = (selector: string) => css.split("}")
  .filter(block => block.includes("{") && block.split("{")[0].split(",").some(part => part.trim().split(/\s+/).join(" ") === selector))
  .map(block => block.split("{")[1]);

describe("race dock tabs keep whole words", () => {
  it("never lets a tab label break inside a word", () => {
    const button = declarations(".tabs button").join(";");
    expect(button).not.toMatch(/overflow-wrap:\s*anywhere|word-break:\s*break-(all|word)|hyphens:\s*auto/);
    expect(button).toMatch(/overflow-wrap:\s*normal/);
    expect(button).toMatch(/word-break:\s*normal/);
  });

  it("sizes a tab by its longest word instead of an equal share that can be narrower", () => {
    const row = declarations(".tabs").join(";");
    expect(row).toMatch(/display:\s*flex/);
    expect(row).not.toMatch(/grid-template-columns/);
    expect(row).toMatch(/flex-wrap:\s*wrap/);
    const button = declarations(".tabs button").join(";");
    // The automatic flex minimum is the min-content width, i.e. the longest word.
    expect(button).toMatch(/flex:\s*1 1 0/);
    expect(button).toMatch(/min-width:\s*auto/);
    expect(button).not.toMatch(/min-width:\s*0[;\s]/);
  });

  it("keeps 44 px targets for text tabs and for the icon-only Settings tab", () => {
    expect(css).toMatch(/\.cockpit button \{[^}]*min-height:44px/);
    // Text tab: a 36 px label box plus 4 px padding on each side.
    expect(declarations(".tabs button:not(:has(svg))>span").join(";")).toMatch(/min-width:\s*36px/);
    expect(declarations(".tabs button").join(";")).toMatch(/padding:\s*4px/);
    // Icon tab: a 16 px gear plus 14 px on each side.
    expect(declarations(".tabs button:has(svg)").join(";")).toMatch(/padding-inline:\s*14px/);
  });

  it("the multiplayer cockpit no longer forces equal grid columns on the shared tab row", () => {
    const local = readFileSync(new URL("../multiplayer/MultiplayerCockpit.module.css", import.meta.url), "utf8");
    expect(local).not.toMatch(/\.tabs\s*\{[^}]*grid-template-columns/);
  });
});
