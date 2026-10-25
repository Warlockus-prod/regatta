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
  for (const language of ["ru", "en", "pl", "es", "fr", "de", "it"]) {
    locale.value = language;
    for (const display of ["off", "compass", "arrows", "both"] as const) {
      const html = renderToStaticMarkup(<RaceWindInstrument reading={reading} display={display} compact />);
      expect(html).toContain('data-testid="race-true-wind-direction">359°');
      expect(html.includes('data-testid="race-wind-compass"')).toBe(display === "compass" || display === "both");
      const options = renderToStaticMarkup(<RaceWindSettings display={display} onChange={() => {}} />);
      expect(options.match(/role="radio"/g)).toHaveLength(4);
      expect(options.match(/aria-checked="true"/g)).toHaveLength(1);
      expect(options).not.toContain("undefined");
      expect(options).not.toContain("[object Object]");
    }
  }
});
