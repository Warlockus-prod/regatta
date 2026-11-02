import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Package 13 (ADR-0022) contract of the on-screen helm:
// - Simple arrows move the course (their names say so), Pro arrows are the
//   rudder (R-6); Pro keeps the sheets beside them;
// - the turn button says tack or gybe by the angle sailed now and, while the
//   boat turns, the course it ends on; BEST VMG and a running turn are pressed;
// - the VMG line colours by the polar's best (never cyan), shows VMC on a
//   reach in Pro, plain words in Simple, and a trend.
const lang = vi.hoisted(() => ({ value: "en" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: lang.value, tl: (text: Record<string, string>) => text[lang.value] }) }));
import { RaceHelmArrows, RaceHelmAssistRow, RaceVmgLine } from "./RaceHelmAssist";
import { NO_HELM_VIEW, type HelmView } from "@/lib/helm-assist";

beforeEach(() => { lang.value = "en"; vi.stubGlobal("React", React); });
afterEach(() => { vi.unstubAllGlobals(); });

const base = { view: NO_HELM_VIEW, twa: 45, heading: 45, disabled: false, onArrow: vi.fn(), onTurn: vi.fn(), onBestVmg: vi.fn() };
const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe("on-screen arrows by level", () => {
  it("Simple: big arrows that move the course, the two assists and the course line", () => {
    const out = html(<RaceHelmArrows {...base} pro={false} view={{ ...NO_HELM_VIEW, course: 52 }} />);
    expect(out).toContain('data-layout="simple-arrows"');
    expect(out).toContain('aria-label="Course to port"');
    expect(out).toContain('aria-label="Course to starboard"');
    expect(out).toContain(">Tack<");
    expect(out).toContain(">Best angle<");
    expect(out).toContain("Course 52°");
    expect(out).toContain("Angle to wind 45°");
  });
  it("Pro: the arrows are the rudder, BEST VMG by its name, the sheets beside", () => {
    const out = html(<RaceHelmArrows {...base} pro sheets={<input aria-label="Mainsheet" />} />);
    expect(out).toContain('data-layout="pro-arrows"');
    expect(out).toContain('aria-label="Rudder to port"');
    expect(out).toContain(">BEST VMG<");
    expect(out).toContain('aria-label="Mainsheet"');
    expect(out).not.toContain("Course 45°");
  });
  it("Polish names the tack and the gybe as sailors do", () => {
    lang.value = "pl";
    expect(html(<RaceHelmAssistRow {...base} pro={false} twa={40} />)).toContain(">Przez sztag<");
    expect(html(<RaceHelmAssistRow {...base} pro={false} twa={-150} />)).toContain(">Przez rufę<");
  });
});

describe("the turn button and BEST VMG", () => {
  it("says gybe from 90 degrees off the wind", () => {
    expect(html(<RaceHelmAssistRow {...base} pro={false} twa={89} />)).toContain('data-kind="tack"');
    expect(html(<RaceHelmAssistRow {...base} pro={false} twa={-120} />)).toContain('data-kind="gybe"');
  });
  it("shows the new course while the boat turns, pressed", () => {
    const view: HelmView = { ...NO_HELM_VIEW, turning: { kind: "tack", heading: 314.6 } };
    const out = html(<RaceHelmAssistRow {...base} pro={false} view={view} />);
    expect(out).toContain('aria-label="Tack: new course 315°"');
    expect(out).toContain(">315°<");
    expect(out).toMatch(/aria-pressed="true"[^>]*data-testid="race-helm-turn"/);
  });
  it("BEST VMG is pressed while it holds", () => {
    expect(html(<RaceHelmAssistRow {...base} pro view={{ ...NO_HELM_VIEW, hold: "vmg" }} />)).toMatch(/aria-pressed="true"[^>]*data-testid="race-helm-best-vmg"/);
    expect(html(<RaceHelmAssistRow {...base} pro />)).toMatch(/aria-pressed="false"[^>]*data-testid="race-helm-best-vmg"/);
  });
});

describe("the VMG line", () => {
  const line = (kn: number, targetKn: number, leg: "upwind" | "downwind" | "reach", pro: boolean, trend: -1 | 0 | 1 = 0) =>
    html(<RaceVmgLine pro={pro} vmg={{ kn, targetKn, leg, trend }} />);
  it("on target, near and below the polar's best, three winds' worth of numbers", () => {
    expect(line(2.05, 2.09, "upwind", true)).toContain('data-target="on"');
    expect(line(3.5, 4.0, "upwind", true)).toContain('data-target="near"');
    expect(line(4.0, 5.95, "upwind", true)).toContain('data-target="below"');
    expect(line(3, 0, "reach", true)).toContain('data-target="none"');
  });
  it("Pro reads VMG and VMC, Simple says against what", () => {
    expect(line(4, 4, "upwind", true)).toContain(">VMG<");
    expect(line(4, 4, "reach", true)).toContain(">VMC<");
    expect(line(4, 4, "upwind", false)).toContain(">Upwind<");
    expect(line(4, 4, "downwind", false)).toContain(">Downwind<");
    expect(line(4, 4, "reach", false)).toContain(">To the mark<");
  });
  it("names the trend and formats with the language's decimal mark", () => {
    expect(line(4.24, 4.7, "upwind", true, 1)).toContain("rising");
    expect(line(4.24, 4.7, "upwind", true, -1)).toContain('data-trend="-1"');
    lang.value = "ru";
    expect(line(4.24, 4.7, "upwind", false)).toContain(">4,2<");
  });
  it("is never cyan", async () => {
    const css = (await import("node:fs")).readFileSync(new URL("./RaceCockpit.module.css", import.meta.url), "utf8");
    const rules = css.split("}").filter(rule => /\.vmg(Line|Label|Trend)/.test(rule));
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) expect(rule).not.toContain("accent-cyan");
  });
});
