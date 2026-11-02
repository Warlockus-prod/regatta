import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBoatParams } from "@/lib/sailing-physics";
import { createRuntimeState } from "../runtime/create-runtime-state";
import { FREE_TRAINER_UI, type SimulationModel } from "./shared";
import { trainerWindCardMode, trainerWindSnapshot } from "./trainer-wind";
import { TrainerWindInstrument } from "./TrainerWindInstrument";
import { AW_LABEL_PX, MIN_TOP_LABEL_PX, placeAwLabel, SceneTop, unitsPerCssPx } from "./SceneTop";

const locale = vi.hoisted(() => ({ value: "en" }));
vi.mock("@/lib/i18n", () => ({ useI18n: () => ({ lang: locale.value, tl: (copy: Record<string, string>) => copy[locale.value] }) }));
beforeEach(() => { vi.stubGlobal("React", React); locale.value = "en"; });
afterEach(() => vi.unstubAllGlobals());

const testValue = (html: string, id: string) => html.match(new RegExp(`data-testid="${id}"[^>]*>([^<]*)<`))?.[1];
const sideOf = (html: string) => html.match(/data-testid="race-true-wind-side" data-side="([a-z]+)"/)?.[1];

function simFor(ui: Partial<typeof FREE_TRAINER_UI>, boat: Partial<ReturnType<typeof createRuntimeState>["boat"]> = {}) {
  const session = createRuntimeState({ ui: { ...FREE_TRAINER_UI, ...ui }, params: getBoatParams() });
  return { session: { ...session, boat: { ...session.boat, ...boat } } } as unknown as SimulationModel;
}

describe("trainer wind snapshot", () => {
  it("reads the bow-relative side and speeds from the live boat state", () => {
    const starboard = trainerWindSnapshot({ heading: 10, trueWindDir: 70, trueWindSpeed: 14, boatSpeed: 6.2, leeway: 2 });
    expect(starboard.wind?.twaSigned).toBe(60);
    expect(starboard.wind?.trueKnots).toBe(14);
    expect(starboard.boatKnots).toBe(6.2);
    const port = trainerWindSnapshot({ heading: 10, trueWindDir: 310, trueWindSpeed: 9, boatSpeed: 4, leeway: -2 });
    expect(port.wind?.twaSigned).toBe(-60);
    expect(port.wind?.trueKnots).toBe(9);
  });

  it("returns unknown instead of a made-up zero for a broken state", () => {
    expect(trainerWindSnapshot(null)).toEqual({ wind: null, boatKnots: null });
    expect(trainerWindSnapshot({ heading: Number.NaN, trueWindDir: 0, trueWindSpeed: 12, boatSpeed: Number.NaN, leeway: 0 })).toEqual({ wind: null, boatKnots: null });
  });
});

describe("trainer wind card", () => {
  it("shows the live angle, side, wind speed and boat speed, not fixed values", () => {
    const readings = [
      { ui: { twa: 52, tack: "starboard" as const }, boat: { trueWindSpeed: 11.4, boatSpeed: 5.3 }, angle: "52°", side: "starboard", tws: "11.4 kn", bs: "5.3 kn" },
      { ui: { twa: 135, tack: "port" as const }, boat: { trueWindSpeed: 18.2, boatSpeed: 7.9 }, angle: "135°", side: "port", tws: "18.2 kn", bs: "7.9 kn" },
      { ui: { twa: 90, tack: "starboard" as const }, boat: { trueWindSpeed: 6, boatSpeed: 2.05 }, angle: "90°", side: "starboard", tws: "6.0 kn", bs: "2.0 kn" },
    ];
    for (const r of readings) {
      const sim = simFor(r.ui, r.boat);
      const html = renderToStaticMarkup(<TrainerWindInstrument sim={sim} dial />);
      expect(testValue(html, "race-true-wind-angle")).toBe(r.angle);
      expect(sideOf(html)).toBe(r.side);
      expect(testValue(html, "race-true-wind-speed")).toBe(r.tws);
      expect(testValue(html, "trainer-boat-speed")).toBe(r.bs);
      // The bow-up dial draws the arrow on the same side as the word.
      expect(html).toContain(`data-testid="race-relative-wind-arrow" data-angle="${r.side === "port" ? "-" : ""}${r.angle.replace("°", "")}" data-side="${r.side}"`);
    }
  });

  it("follows the boat as it turns, so the side flips with the heading", () => {
    const sim = simFor({ twa: 60, tack: "starboard" });
    const { heading, trueWindDir } = sim.session.boat;
    const turned = simFor({ twa: 60, tack: "starboard" }, { heading: (trueWindDir + 60) % 360 });
    expect(sideOf(renderToStaticMarkup(<TrainerWindInstrument sim={sim} dial={false} />))).toBe("starboard");
    expect(heading).not.toBe(turned.session.boat.heading);
    const html = renderToStaticMarkup(<TrainerWindInstrument sim={turned} dial={false} />);
    expect(sideOf(html)).toBe("port");
    expect(testValue(html, "race-true-wind-angle")).toBe("60°");
  });

  it("keeps the dial for 3D only and localizes the boat line in all seven languages", () => {
    const sim = simFor({ twa: 70, tack: "starboard" }, { boatSpeed: 6.1 });
    expect(renderToStaticMarkup(<TrainerWindInstrument sim={sim} dial />)).toContain('data-testid="race-wind-compass"');
    expect(renderToStaticMarkup(<TrainerWindInstrument sim={sim} dial={false} />)).not.toContain('data-testid="race-wind-compass"');
    const expected = { ru: ["Лодка", "6.1 уз"], en: ["Boat", "6.1 kn"], pl: ["Jacht", "6.1 w."], es: ["Barco", "6.1 kn"], fr: ["Bateau", "6.1 nd"], de: ["Boot", "6.1 kn"], it: ["Barca", "6.1 kn"] };
    for (const [language, [label, speed]] of Object.entries(expected)) {
      locale.value = language;
      const html = renderToStaticMarkup(<TrainerWindInstrument sim={sim} dial={false} />);
      expect(html).toContain(`>${label}</span>`);
      expect(testValue(html, "trainer-boat-speed")).toBe(speed);
    }
  });
});

describe("top view label size", () => {
  it("converts CSS pixels to viewBox units for a 390px phone scene and a desktop scene", () => {
    // 600 viewBox units drawn in 258 CSS px: one CSS px is about 2.33 units.
    expect(unitsPerCssPx({ width: 390, height: 258 }, 760, 600)).toBeCloseTo(600 / 258, 3);
    expect(unitsPerCssPx({ width: 690, height: 620 }, 760, 600)).toBeCloseTo(760 / 690, 3);
    expect(unitsPerCssPx({ width: 0, height: 0 }, 760, 600)).toBe(2);
  });

  it("draws every scene label on a halo at no less than the minimum size, on its own sea", () => {
    const session = createRuntimeState({ ui: FREE_TRAINER_UI, params: getBoatParams() });
    const sim = { session, result: { state: session.boat, diag: session.lastDiag }, signedTwa: 90, ghostAngles: { mainAngle: 0, jibAngle: 0, mainTwistPct: 0, jibTwistPct: 0 } } as unknown as SimulationModel;
    const html = renderToStaticMarkup(<SceneTop ui={{ ...FREE_TRAINER_UI, showOptimal: false }} sim={sim} lang="ru" />);
    expect(html).toContain('data-testid="trainer-top-sea"');
    const ids = ["trainer-top-tw", "trainer-top-aw", "trainer-top-nogo", "trainer-top-drive", "trainer-top-side", "trainer-top-compass-W"];
    for (const id of ids) {
      const tag = html.match(new RegExp(`<text[^>]*data-testid="${id}"[^>]*>`))?.[0] ?? "";
      expect(tag, id).not.toBe("");
      // Before the first measurement the scene assumes a phone: 2 units per CSS px.
      expect(Number(tag.match(/font-size="([\d.]+)"/)?.[1]), id).toBeGreaterThanOrEqual(MIN_TOP_LABEL_PX * 2);
      expect(tag, id).toContain('paint-order="stroke"');
    }
    expect(html).toMatch(/data-testid="trainer-top-tw"[^>]*>TW \d+ уз</);
  });
});

describe("wind card placement on the page", () => {
  it("shows the dial in 3D, text on the top view and the deck camera, nothing on side and rear", () => {
    expect(trainerWindCardMode("3d", "sails")).toBe("dial");
    expect(trainerWindCardMode("3d", "whole")).toBe("dial");
    expect(trainerWindCardMode("3d", "deck")).toBe("text");
    expect(trainerWindCardMode("top", "deck")).toBe("text");
    expect(trainerWindCardMode("side", "sails")).toBeNull();
    expect(trainerWindCardMode("rear", "sails")).toBeNull();
  });

  it("keeps a visible TWA heading on the text-only card", () => {
    const html = renderToStaticMarkup(<TrainerWindInstrument sim={simFor({ twa: 70, tack: "starboard" })} dial={false} />);
    const heading = html.match(/<span class="[^"]*" data-testid="trainer-wind-heading">(.*?)<\/span><\/span>/)?.[1] ?? "";
    expect(heading).not.toContain("sr-only");
    expect(heading).toContain("Wind");
    expect(heading).toContain("TWA");
  });
});

describe("top view AW label", () => {
  const CX = 380;
  const TW_TOP = 300 - 600 * 0.42 * 1.02;
  function awLabelBox(signedTwa: number, awa: number) {
    const session = createRuntimeState({ ui: FREE_TRAINER_UI, params: getBoatParams() });
    const sim = { session, result: { state: session.boat, diag: { ...session.lastDiag, awa } }, signedTwa, ghostAngles: { mainAngle: 0, jibAngle: 0, mainTwistPct: 0, jibTwistPct: 0 } } as unknown as SimulationModel;
    const html = renderToStaticMarkup(<SceneTop ui={{ ...FREE_TRAINER_UI, showOptimal: false }} sim={sim} lang="ru" />);
    const tag = html.match(/<text([^>]*)data-testid="trainer-top-aw"[^>]*>([^<]*)</);
    expect(tag).not.toBeNull();
    const attr = (name: string) => tag![0].match(new RegExp(`${name}="([^"]+)"`))?.[1] ?? "";
    const x = Number(attr("x"));
    const size = Number(attr("font-size"));
    const width = tag![2].length * 0.62 * size;
    const anchor = attr("text-anchor");
    const left = anchor === "end" ? x - width : x;
    return { left, right: left + width, y: Number(attr("y")), size, text: tag![2] };
  }

  // Review 2026-11-01: on a run (twa 150, AW 138) the label crossed the TW
  // shaft and touched the TW line; close-hauled (twa 40) it ran into N.
  for (const [signedTwa, awa] of [[150, 138], [-150, -138], [40, 27], [-40, -27], [40, 40], [95, 60]]) {
    it(`never straddles the true-wind shaft or shares the TW line: twa ${signedTwa}, awa ${awa}`, () => {
      const box = awLabelBox(signedTwa, awa);
      expect(box.text).toBe(`AW ${Math.abs(awa)}°`);
      expect(box.left > CX || box.right < CX, `${box.left}..${box.right}`).toBe(true);
      // Phone default: 2 viewBox units per CSS px, so 22 CSS px below the TW arrow top.
      expect(box.y).toBeGreaterThanOrEqual(TW_TOP + 22 * 2 - 0.01);
      // Clear of the corner wind card (120 CSS px wide at the top left).
      expect(box.left).toBeGreaterThanOrEqual(120 * 2 - 0.01);
    });
  }

  it("moves across the shaft when the near side has no room, on a narrow phone and on desktop", () => {
    for (const unitsPerPx of [1.22, 1.95, 2.11]) {
      for (const tailX of [200, 300, 332, 379, 381, 450, 560]) {
        const placed = placeAwLabel({ tail: { x: tailX, y: 73 }, cx: CX, width: 760, twTopY: TW_TOP, unitsPerPx, chars: 7 });
        expect(placed.left > CX || placed.right < CX, `${unitsPerPx} ${tailX}`).toBe(true);
        expect(placed.left).toBeGreaterThanOrEqual(120 * unitsPerPx - 0.01);
        expect(placed.right).toBeLessThanOrEqual(760);
        expect(placed.right - placed.left).toBeCloseTo(7 * 0.62 * AW_LABEL_PX * unitsPerPx, 5);
      }
    }
  });
});
