import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { HintLogEntry } from "./hint-log";

// F4 contract: the hint log panel is a named dialog with a 44 px Close, lists
// the lines newest first with race time and kind at 16/24 (meta 14/20), says
// what will appear when the race has said nothing yet, and only says "the
// race keeps going" when it is not opened from the pause sheet. Tones are a
// border colour, never cyan; no animation.
const i18n = vi.hoisted(() => ({ lang: "en" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: i18n.lang, tl: (v: Record<string, string>) => v[i18n.lang] }) }));
import { RaceHintLogList, RaceHintLogPanel } from "./RaceHintLog";

const LOG: HintLogEntry[] = [
  { id: 2, kind: "route", text: "Prepare to tack", tone: "info", at: 65 },
  { id: 1, kind: "rule", text: "Keep clear.", tone: "danger", at: 12 },
];

describe("race hint log panel (F4)", () => {
  it("lists the lines newest first with time and kind", () => {
    const html = renderToStaticMarkup(<RaceHintLogPanel entries={LOG} onClose={() => {}} />);
    expect(html).toContain('role="dialog"');
    expect(html).toMatch(/aria-labelledby="race-hint-log-[^"]+"/);
    expect(html).toContain("Race hints");
    expect(html).toContain('aria-label="Close hints"');
    expect(html.indexOf("Prepare to tack")).toBeLessThan(html.indexOf("Keep clear."));
    expect(html).toContain("1:05</time> <span>Route</span>");
    expect(html).toContain("0:12</time> <span>Rules</span>");
    expect(html).toContain('data-tone="danger"');
    expect(html).toContain("The race keeps going");
    expect(renderToStaticMarkup(<RaceHintLogPanel paused entries={LOG} onClose={() => {}} />)).not.toContain("The race keeps going");
  });

  it("says what will appear in an empty race, in Russian too", () => {
    expect(renderToStaticMarkup(<RaceHintLogList entries={[]} />)).toContain("No hints yet.");
    i18n.lang = "ru";
    expect(renderToStaticMarkup(<RaceHintLogList entries={[]} />)).toContain("Пока подсказок не было.");
    expect(renderToStaticMarkup(<RaceHintLogList entries={LOG} />)).toContain("<span>Маршрут</span>");
    i18n.lang = "en";
  });

  it("reads at 16/24 with 14/20 meta, a 44 px Close, tones that are never cyan and no animation", () => {
    const css = readFileSync(new URL("./RaceHintLog.module.css", import.meta.url), "utf8");
    expect(css).toMatch(/\.text \{[^}]*font-size:16px; line-height:24px;/);
    expect(css).toMatch(/\.empty \{[^}]*font-size:16px; line-height:24px;/);
    expect(css).toMatch(/\.meta \{[^}]*font-size:14px; line-height:20px;/);
    expect(css).toMatch(/\.overlay \.close \{[^}]*min-width:44px; min-height:44px;/);
    for (const rule of css.match(/\.entry[^{]*\{[^}]*\}/g)!) expect(rule).not.toMatch(/accent-cyan/);
    expect(css).not.toMatch(/(animation|transition):/);
    expect(css).not.toMatch(/font-size:1[0-3]px/);
  });

  // Effects do not run in this renderer: the focus rule is read from the source.
  it("gives focus back to the opener only when the panel took it away, never from the pause sheet", () => {
    const source = readFileSync(new URL("./RaceHintLog.tsx", import.meta.url), "utf8");
    expect(source).toMatch(/const now = document\.activeElement;\s*if \(opener\?\.isConnected && \(!now \|\| now === document\.body\)\) opener\.focus\(\);/);
  });
});
