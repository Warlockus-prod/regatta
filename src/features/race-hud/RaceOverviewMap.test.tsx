import * as React from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeStandardCourse } from "@/lib/race-physics";
import { RaceOverviewMap, type RaceOverviewLabels } from "./RaceOverviewMap";
import { createRaceNavigationSnapshot, type RaceNavigationInput } from "./navigation-model";
import { PLAYER_COLOR } from "./boat-colors";

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const labels: RaceOverviewLabels = {
  title: "Karte des Rennens", north: "Nord", start: "Start", finish: "Ziel", marks: "Bahnmarken",
  you: "Du", fleet: "Flotte", windFrom: "Wind aus", empty: "Karte nicht verfügbar",
};
const input = (extra: Partial<RaceNavigationInput> = {}): RaceNavigationInput => ({
  course: makeStandardCourse(), windFrom: 0,
  boats: [{ id: "private-player-id", pos: { x: 400, y: 1100 }, heading: 0, isPlayer: true },
    { id: "private-rival-id", pos: { x: 500, y: 1000 }, heading: 450, color: "#f00" }], ...extra,
});
const render = (extra: Partial<RaceNavigationInput> = {}, width?: number, height?: number) =>
  renderToStaticMarkup(<RaceOverviewMap snapshot={createRaceNavigationSnapshot(input(extra))} labels={labels} width={width} height={height} />);

describe("race overview SVG", () => {
  it("keeps actual course/fleet geometry and private IDs out of the compact button map", () => {
    const snapshot = createRaceNavigationSnapshot(input());
    const html = renderToStaticMarkup(<RaceOverviewMap snapshot={snapshot} labels={labels} compact width={128} height={128} />);
    expect(html).toContain('<span class="m-0" data-testid="race-mini-map" data-map-mode="radar">');
    expect(html).toContain('viewBox="0 0 128 128"');
    expect(html.match(/data-map-mark=/g)).toHaveLength(3);
    expect(html.match(/data-map-boat=/g)).toHaveLength(2);
    expect(html).not.toMatch(/figcaption|<figure|private-player-id|private-rival-id/);
    expect(html).toContain('role="img" aria-label="Karte des Rennens"');
  });
  it("renders the actual marks, shared start/finish, fleet and supplied accessible labels", () => {
    const errors = vi.spyOn(console, "error");
    const html = render();
    expect(html).toContain('role="img" aria-label="Karte des Rennens"');
    expect(html.match(/data-map-mark=/g)).toHaveLength(3);
    expect(html.match(/data-map-line=/g)).toHaveLength(1);
    expect(html).toContain('data-map-line="start-finish"');
    expect(html).toContain('<title>Start / Ziel</title>');
    expect(html).toContain('<title>Du</title>');
    expect(html).toContain('<title>Flotte</title>');
    expect(html).toContain("Flotte: 1");
    expect(html).toContain("Wind aus: 0°");
    expect(html).not.toContain("private-player-id");
    expect(html).not.toContain("private-rival-id");
    expect(errors).not.toHaveBeenCalled();
  });

  it("renders a changed saved course and separate finish instead of a static standard preview", () => {
    const course = {
      marks: [{ pos: { x: 0, y: 0 }, type: "windward" as const }, { pos: { x: 1000, y: 1400 }, type: "finish" as const }],
      startLine: { a: { x: 0, y: 1400 }, b: { x: 1000, y: 1400 } },
      finishLine: { a: { x: 1000, y: 0 }, b: { x: 1000, y: 1400 } },
    };
    const first = render({ course, boats: [] });
    expect(first.match(/data-map-line=/g)).toHaveLength(2);
    expect(first).toContain('data-map-line="finish"');
    expect(first.match(/data-map-mark=/g)).toHaveLength(2);
    const updated = render({ course: { ...course, marks: [{ pos: { x: 500, y: 700 }, type: "windward" }] }, boats: [] });
    expect(updated.match(/data-map-mark=/g)).toHaveLength(1);
    expect(updated).toContain('transform="translate(160 110)"');
    expect(updated).not.toBe(first);
  });

  it("draws a reversed shared line once and keeps normalized heading arrows for each rival", () => {
    const course = makeStandardCourse();
    course.finishLine = { a: course.startLine.b, b: course.startLine.a };
    const html = render({ course, windFrom: -90 });
    expect(html.match(/data-map-line=/g)).toHaveLength(1);
    expect(html).toMatch(/data-map-boat="rival" transform="translate\([\d.]+ [\d.]+\) rotate\(90\)"/);
    expect(html).toContain('transform="rotate(270)"');
    expect(html).toContain("Wind aus: 270°");
  });

  it("numbers only the rounding marks and names start/finish pins by their actual role", () => {
    const course = makeStandardCourse();
    course.marks = [course.marks[1], { ...course.marks[2], type: "finish" }, course.marks[0], { ...course.marks[0], pos: { x: 500, y: 200 } }];
    const html = render({ course });
    expect(html).toContain('<title>Bahnmarken 1</title>');
    expect(html).toContain('<title>Bahnmarken 2</title>');
    expect(html).not.toContain("Bahnmarken 3");
    expect(html).toContain('<title>Start</title>');
    expect(html).toContain('<title>Ziel</title>');
    expect(html.match(/data-map-mark=/g)).toHaveLength(4);
  });

  it.each([0, 90, 180, 270])("keeps wind-from %s on the compass while the arrow represents incoming air", windFrom => {
    const html = render({ windFrom });
    expect(html).toContain(`transform="rotate(${windFrom})"`);
    expect(html).toContain(`Wind aus: ${windFrom}°`);
    // The unrotated shaft comes from the northern edge toward the map.
    expect(html).toContain('d="M0-12 V5 M-4 0 L0 5 L4 0"');
  });

  it("uses bounded, clipped local terrain and cannot render an external color URL or identifier", () => {
    const html = render({
      terrain: [[{ x: -50, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 200 }]],
      boats: [{ id: "https://example.invalid/secret", pos: { x: 400, y: 600 }, heading: 0, color: "url(https://example.invalid/image)" }],
    });
    expect(html).toContain('data-map-terrain=""');
    expect(html).toMatch(/clip-path="url\(#race-map-[^"]+\)"/);
    expect(html).not.toMatch(/https?:|<image|href=|NaN|Infinity/);
    expect(html).not.toContain("secret");
  });

  it("preserves the chosen intrinsic aspect and leaves unknown wind unknown", () => {
    const html = render({ windFrom: null }, 844, 390);
    expect(html).toContain('viewBox="0 0 844 390"');
    expect(html).toContain('width="844" height="390"');
    expect(html).toContain("width:100%;height:var(--race-map-height, auto)");
    expect(html).not.toContain("data-map-wind");
    expect(html).not.toContain("Wind aus");
  });

  it("shows the caller's honest empty state for unavailable data or an invalid viewport", () => {
    const empty = renderToStaticMarkup(<RaceOverviewMap snapshot={null} labels={labels} />);
    expect(empty).toContain('role="status"');
    expect(empty).toContain("Karte nicht verfügbar");
    expect(empty).not.toContain("<svg");
    expect(render({}, 0, 0)).toContain("Karte nicht verfügbar");
  });

  it("draws the player in its race colour and keeps cyan for actions only (M1-7)", () => {
    const html = render();
    expect(html).toMatch(new RegExp(`data-map-boat="player"[^>]*><title>Du</title><path d="[^"]+" fill="${PLAYER_COLOR}"`));
    expect(html).toMatch(/data-map-boat="rival"[^>]*><title>Flotte<\/title><path d="[^"]+" fill="#f00"/);
    expect(html).toContain(`<span class="inline-flex items-center gap-1" data-map-legend="player">`);
    expect(html).toContain(`fill="${PLAYER_COLOR}"></path></svg>Du</span>`);
    expect(html).not.toMatch(/accent-cyan|00d4ff|\u25b2/i);
    const compact = renderToStaticMarkup(<RaceOverviewMap snapshot={createRaceNavigationSnapshot(input())} labels={labels} compact width={128} height={128} />);
    expect(compact).not.toMatch(/accent-cyan|00d4ff/i);
  });

  // M2-4: the compact map is a radar around the boat, the full map keeps the course.
  it("zooms the compact radar to the player, its next mark and the nearest rival, on dark glass", () => {
    const boats = [{ id: "p", pos: { x: 400, y: 600 }, heading: 0, isPlayer: true },
      { id: "near", pos: { x: 440, y: 560 }, heading: 0, color: "#0f0" }, { id: "far", pos: { x: 100, y: 1150 }, heading: 0, color: "#00f" }];
    const snapshot = createRaceNavigationSnapshot(input({ boats }))!;
    const focus = { x: 400, y: 450 };
    const html = renderToStaticMarkup(<RaceOverviewMap snapshot={snapshot} labels={labels} compact width={128} height={128} focus={focus} />);
    expect(html).toContain('data-map-mode="radar"');
    expect(html).toContain('fill="rgba(4, 14, 22, 0.58)"');
    expect(html).not.toContain("var(--bg-card");
    // The glass is dark in both themes, so the radar's ink is fixed light, never a theme text token.
    expect(html).not.toMatch(/var\(--text-(secondary|primary)/);
    // The player sits in the middle of the radar, north up.
    expect(html).toMatch(/data-map-boat="player" transform="translate\(64 64\) rotate\(0\)"/);
    const translate = (attr: string) => [...html.matchAll(new RegExp(`${attr} transform="translate\\(([\\d.-]+) ([\\d.-]+)\\)`, "g"))].map(m => ({ x: Number(m[1]), y: Number(m[2]) }));
    const inside = (p: { x: number; y: number }) => p.x >= 8 && p.x <= 120 && p.y >= 8 && p.y <= 120;
    const rivals = translate('data-map-boat="rival"');
    expect(rivals).toHaveLength(2);
    expect(inside(rivals[0])).toBe(true);
    expect(inside(rivals[1])).toBe(false);
    const full = renderToStaticMarkup(<RaceOverviewMap snapshot={snapshot} labels={labels} width={128} height={128} focus={focus} />);
    expect(full).toContain('data-map-mode="course"');
    expect(full).toContain("var(--bg-card");
    expect(full).not.toContain("data-map-range");
  });

  it("puts the corner radar on a transparent button, so only its own glass covers the scene", () => {
    // An opaque card under the radar glass turned it mid-grey in the light theme.
    const css = readFileSync(join(process.cwd(), "src/features/race-hud/RaceCornerInstruments.module.css"), "utf8");
    // The cascade's last background for the button wins (a shared rule gives it the card colour first).
    const backgrounds = [...css.matchAll(/(?:^|[},])\s*[^{}]*\.instruments \.map\s*\{([^}]*)\}/g)]
      .map(rule => rule[1].match(/background:\s*([^;]+)/)?.[1].trim()).filter(Boolean);
    expect(backgrounds.length).toBeGreaterThan(1);
    expect(backgrounds.at(-1)).toBe("transparent");
  });

  it("draws mark numbers after the boats so a glyph never covers them", () => {
    const html = render();
    expect(html.indexOf("data-map-ordinal")).toBeGreaterThan(html.lastIndexOf("data-map-boat="));
  });
});
