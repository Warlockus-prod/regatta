import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeStandardCourse } from "@/lib/race-physics";
import { RaceOverviewMap, type RaceOverviewLabels } from "./RaceOverviewMap";
import { createRaceNavigationSnapshot, type RaceNavigationInput } from "./navigation-model";

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
    expect(html).toContain("width:100%;height:auto");
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
});
