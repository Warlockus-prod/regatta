import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { raceWindReading } from "./navigation-model";
import { RaceWindInstrument, RaceWindSettings } from "./RaceWindInstrument";

const locale = vi.hoisted(() => ({ value: "en" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ tl: (copy: Record<string, string>) => copy[locale.value] }) }));
beforeEach(() => { vi.stubGlobal("React", React); locale.value = "en"; });
afterEach(() => vi.unstubAllGlobals());

it("keeps actual wind numbers when aids are off and preserves unknown historical speed", () => {
  const reading = raceWindReading({ heading: 90, boatSpeedKn: 5, windFrom: 0, windKnots: 12 })!;
  const html = renderToStaticMarkup(<RaceWindInstrument reading={reading} display="off" />);
  expect(html).not.toContain('data-testid="race-wind-compass"');
  expect(html).toContain('data-testid="race-true-wind-angle">90°');
  expect(html).toContain('data-side="port"');
  expect(html).toContain('data-testid="race-true-wind-direction">0°');
  expect(html).toContain('data-testid="race-true-wind-speed">12.0 kn');
  expect(html).toContain("13.0 kn");
  const unknown = raceWindReading({ heading: 90, boatSpeedKn: 5, windFrom: 0 });
  const historical = renderToStaticMarkup(<RaceWindInstrument reading={unknown} display="compass" />);
  expect(historical).toContain('data-testid="race-true-wind-speed">Unavailable');
  expect(historical).not.toContain("12.0 kn");
  expect(historical).not.toContain("13.0 kn");
});

it("retains the compact actual reading and four exclusive localized choices in all seven languages", () => {
  const reading = raceWindReading({ heading: 45, boatSpeedKn: 2, windFrom: 359, windKnots: 6 })!;
  const labels = {
    ru: ["С левого борта", "Прибор ветра", "С правого борта"], en: ["From port", "Wind instrument", "From starboard"],
    pl: ["Z lewej burty", "Wskaźnik wiatru", "Z prawej burty"], es: ["Por babor", "Indicador de viento", "Por estribor"],
    fr: ["De bâbord", "Indicateur de vent", "De tribord"], de: ["Von Backbord", "Windanzeige", "Von Steuerbord"], it: ["Da sinistra", "Indicatore del vento", "Da dritta"],
  };
  for (const language of ["ru", "en", "pl", "es", "fr", "de", "it"]) {
    locale.value = language;
    for (const display of ["off", "compass", "arrows", "both"] as const) {
      const html = renderToStaticMarkup(<RaceWindInstrument reading={reading} display={display} compact />);
      expect(html).toContain('data-testid="race-true-wind-angle">46°');
      expect(html).toContain('data-testid="race-true-wind-direction">359°');
      expect(html).toContain(labels[language as keyof typeof labels][0]);
      expect(html.includes('data-testid="race-wind-compass"')).toBe(display === "compass" || display === "both");
      const options = renderToStaticMarkup(<RaceWindSettings display={display} onChange={() => {}} />);
      expect(options.match(/role="radio"/g)).toHaveLength(4);
      expect(options.match(/aria-checked="true"/g)).toHaveLength(1);
      expect(options).toContain(labels[language as keyof typeof labels][1]);
      expect(options).toContain("TWA");
      expect(options).toContain("TWD");
      expect(options).not.toContain("undefined");
      expect(options).not.toContain("[object Object]");
      if (language !== "ru") {
        expect(html).not.toMatch(/[А-Яа-яЁё]/);
        expect(options).not.toMatch(/[А-Яа-яЁё]/);
      }
    }
    const starboard = raceWindReading({ heading: 315, boatSpeedKn: 2, windFrom: 1, windKnots: 6 });
    const html = renderToStaticMarkup(<RaceWindInstrument reading={starboard} display="compass" compact />);
    expect(html).toContain('data-testid="race-true-wind-angle">46°');
    expect(html).toContain(labels[language as keyof typeof labels][2]);
    expect(html).toContain('data-side="starboard"');
  }
});

it.each([
  [90, 0, -90, "port", "From port"], [270, 0, 90, "starboard", "From starboard"],
  [350, 10, 20, "starboard", "From starboard"], [10, 350, -20, "port", "From port"],
] as const)("shows true wind from the bow at heading %s with absolute wind %s", (heading, windFrom, twa, side, label) => {
  const reading = raceWindReading({ heading, windFrom, boatSpeedKn: 5, windKnots: 12 })!;
  const before = structuredClone(reading);
  const html = renderToStaticMarkup(<RaceWindInstrument reading={reading} display="compass" compact />);
  expect(html).toContain(`data-testid="race-relative-wind-arrow" data-angle="${twa}"`);
  expect(html).toContain(`data-testid="race-true-wind-angle">${Math.abs(twa)}°`);
  expect(html).toContain(`data-testid="race-true-wind-direction">${windFrom}°`);
  expect(html).toContain(`data-side="${side}" title="${label}"`);
  const bow = html.match(/<path data-testid="race-wind-bow"[^>]*>/)?.[0];
  expect(bow).toBeDefined();
  expect(bow).not.toContain("transform");
  expect(html).not.toContain(">N</text>");
  expect(reading).toEqual(before);
});

it.each([[0, "ahead", "From ahead"], [180, "astern", "From astern"], [.4, "ahead", "From ahead"], [179.6, "astern", "From astern"]] as const)(
  "does not assign a port or starboard side to displayed endpoint %s", (windFrom, side, label) => {
    const reading = raceWindReading({ heading: 0, windFrom, boatSpeedKn: 2, windKnots: 12 })!;
    const html = renderToStaticMarkup(<RaceWindInstrument reading={reading} display="both" compact />);
    expect(html).toContain(`data-side="${side}" title="${label}"`);
    expect(html).not.toContain('data-side="port"');
    expect(html).not.toContain('data-side="starboard"');
  },
);

it("keeps true TWA distinct from apparent air and never replaces unknown data with a zero", () => {
  const reading = raceWindReading({ heading: 90, windFrom: 0, boatSpeedKn: 5, windKnots: 12 })!;
  expect(reading.awaSigned).toBeCloseTo(-67.38013505195958, 10);
  const html = renderToStaticMarkup(<RaceWindInstrument reading={reading} display="both" />);
  expect(html).toContain('data-testid="race-relative-wind-arrow" data-angle="-90"');
  expect(html).toContain('data-testid="race-relative-wind-shaft" x1="10" y1="50"');
  expect(html).toContain('data-testid="race-true-wind-angle">90°');
  expect(html).toContain('data-testid="race-true-wind-direction">0°');
  expect(html).toContain("13.0 kn");
  const absent = renderToStaticMarkup(<RaceWindInstrument reading={null} display="compass" compact />);
  expect(absent).toContain('data-testid="race-true-wind-angle">Unavailable');
  expect(absent).toContain('data-testid="race-true-wind-direction">Unavailable');
  expect(absent).not.toContain('data-testid="race-true-wind-side"');
  expect(absent).not.toContain('data-testid="race-wind-compass"');
  const calm = raceWindReading({ heading: 90, windFrom: 0, boatSpeedKn: 5, windKnots: 0 })!;
  expect(renderToStaticMarkup(<RaceWindInstrument reading={calm} display="off" compact />)).toContain('data-testid="race-true-wind-speed">0.0 kn');
});

it("draws the wind arrow as a reading, not in the action cyan (M1-7)", () => {
  const reading = raceWindReading({ heading: 90, boatSpeedKn: 5, windFrom: 0, windKnots: 12 })!;
  const html = renderToStaticMarkup(<RaceWindInstrument reading={reading} display="compass" />);
  expect(html).toContain('data-testid="race-relative-wind-arrow"');
  expect(html).toMatch(/data-testid="race-relative-wind-arrow"[^>]*stroke="var\(--text-primary\)"/);
  expect(html).not.toContain("accent-cyan");
});

it("writes the wind speed with the language's own knot sign", () => {
  const reading = raceWindReading({ heading: 90, boatSpeedKn: 5, windFrom: 0, windKnots: 12 })!;
  for (const [lang, unit] of [["ru", "уз"], ["pl", "w."], ["fr", "nd"], ["de", "kn"]] as const) {
    locale.value = lang;
    expect(renderToStaticMarkup(<RaceWindInstrument reading={reading} display="off" />)).toContain(`data-testid="race-true-wind-speed">12.0 ${unit}`);
  }
});

// F2 (owner, builds 66 and 74): the wind sign must show where the wind comes
// from relative to the bow, readable at a glance. The bow-up dial draws the
// arrow from the side the wind blows from (starboard on the right) and the
// side is a word under the angle, not a one-letter mark. The render is read
// back from the markup, so a mirrored or flipped arrow fails here.
const shaft = (html: string) => {
  const match = html.match(/data-testid="race-relative-wind-shaft" x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="([-\d.]+)"/);
  expect(match, "arrow shaft").not.toBeNull();
  const [x1, y1, x2, y2] = match!.slice(1).map(Number);
  return { tail: { x: x1, y: y1 }, head: { x: x2, y: y2 } };
};
it.each([
  ["starboard bow", 315, 0, "starboard", (x: number, y: number) => x > 50 && y < 50, { ru: "правый борт", en: "starboard", de: "Steuerbord", fr: "tribord" }],
  ["port bow", 45, 0, "port", (x: number, y: number) => x < 50 && y < 50, { ru: "левый борт", en: "port", de: "Backbord", fr: "bâbord" }],
  ["port quarter", 0, 225, "port", (x: number, y: number) => x < 50 && y > 50, { ru: "левый борт", en: "port", de: "Backbord", fr: "bâbord" }],
  ["starboard quarter", 0, 135, "starboard", (x: number, y: number) => x > 50 && y > 50, { ru: "правый борт", en: "starboard", de: "Steuerbord", fr: "tribord" }],
] as const)("draws wind from the %s on its own side of the bow-up dial with a readable side word", (_name, heading, windFrom, side, inQuadrant, words) => {
  const reading = raceWindReading({ heading, windFrom, boatSpeedKn: 5, windKnots: 12 })!;
  for (const [lang, word] of Object.entries(words)) {
    locale.value = lang;
    const html = renderToStaticMarkup(<RaceWindInstrument reading={reading} display="compass" compact />);
    const { tail, head } = shaft(html);
    // Tail on the rim where the wind comes from, head toward the boat in the centre.
    expect(inQuadrant(tail.x, tail.y), `tail ${tail.x},${tail.y}`).toBe(true);
    expect(Math.hypot(head.x - 50, head.y - 50)).toBeLessThan(Math.hypot(tail.x - 50, tail.y - 50));
    expect(html).toContain(`data-side="${side}"`);
    expect(html).not.toContain("transform=\"rotate(");
    expect(html).toMatch(new RegExp(`data-testid="race-true-wind-side" data-side="${side}"[^>]*><span aria-hidden="true">${word}</span>`));
    expect(html).not.toMatch(/aria-hidden="true">(Л|П|P|S|L|B|E|T|Bb|Stb|D)<\/span>/);
  }
});

it("draws a head wind at the top and a following wind at the bottom of the dial", () => {
  const ahead = shaft(renderToStaticMarkup(<RaceWindInstrument reading={raceWindReading({ heading: 0, windFrom: 0, boatSpeedKn: 5, windKnots: 12 })!} display="compass" compact />));
  expect(ahead.tail).toEqual({ x: 50, y: 10 });
  const astern = shaft(renderToStaticMarkup(<RaceWindInstrument reading={raceWindReading({ heading: 0, windFrom: 180, boatSpeedKn: 5, windKnots: 12 })!} display="compass" compact />));
  expect(astern.tail.x).toBeCloseTo(50, 0);
  expect(astern.tail.y).toBeGreaterThan(80);
});

it("names a head or following wind with the same phrase it shows, in every language", () => {
  for (const windFrom of [0, 180]) {
    const reading = raceWindReading({ heading: 0, windFrom, boatSpeedKn: 5, windKnots: 12 })!;
    for (const lang of ["ru", "en", "pl", "es", "fr", "de", "it"]) {
      locale.value = lang;
      const html = renderToStaticMarkup(<RaceWindInstrument reading={reading} display="compass" compact />);
      const found = html.match(/data-testid="race-true-wind-side"[^>]*title="([^"]+)"[^>]*><span aria-hidden="true">([^<]+)<\/span>/);
      expect(found, lang).not.toBeNull();
      const decode = (text: string) => text.replace(/&#x27;/g, "'").toLowerCase();
      // "From ahead" ends with "ahead"; "De l'avant" with "de l'avant".
      expect(decode(found![1]).endsWith(decode(found![2])), `${lang} ${windFrom}: ${found![1]} / ${found![2]}`).toBe(true);
    }
  }
});
