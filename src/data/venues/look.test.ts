import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { VENUES } from "./venues";
import {
  REFLECTION_DEPTH, SUN_CLEAR_OF_WIND, VENUE_LOOKS, bearingGap, contrast, luminance, mixHex, parseHex, sceneColors, sunDirection, sunIntensity, venueLook, warmHex,
} from "./look";

// M3-6 contract: every venue has a complete look within the art board's
// ranges and tolerances, the warmth grade keeps the water blue-green, and the
// marks and overlays read on the new water at least as well as on the old.

const HEX = /^#[0-9a-f]{6}$/;
const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("venue looks (art board M3)", () => {
  it("has one complete look for each of the five venues", () => {
    expect(Object.keys(VENUE_LOOKS).sort()).toEqual(VENUES.map((v) => v.id).sort());
    for (const venue of VENUES) {
      const look = VENUE_LOOKS[venue.id];
      for (const hex of [look.sun.color, look.sky.zenith, look.sky.horizon, look.fog, look.water.deep, look.water.shallow]) expect(hex).toMatch(HEX);
      expect(look.exposure).toBeGreaterThanOrEqual(0.9);
      expect(look.exposure).toBeLessThanOrEqual(1.1);
      expect(look.sun.elevation).toBeGreaterThanOrEqual(20);
      expect(look.sun.elevation).toBeLessThanOrEqual(65);
      expect(look.warmth).toBeGreaterThanOrEqual(0);
      expect(look.warmth).toBeLessThanOrEqual(0.2);
    }
  });

  it("matches the board's table within its tolerances", () => {
    const board = read("docs/design/game-graphics/art-board-m3.md");
    const rows = board.split("\n").filter((line) => /^\| .*\(`[a-z]+`\)/.test(line));
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      const id = /\(`([a-z]+)`\)/.exec(row)![1];
      const look = venueLook(id);
      expect(VENUE_LOOKS).toHaveProperty(id);
      const colours = row.match(/#[0-9a-f]{6}/g)!;
      expect(colours).toHaveLength(6);
      const ours = [look.sun.color, look.sky.zenith, look.sky.horizon, look.fog, look.water.deep, look.water.shallow];
      colours.forEach((hex, i) => parseHex(hex).forEach((v, c) => expect(Math.abs(parseHex(ours[i])[c] - v)).toBeLessThanOrEqual(8)));
      expect(Math.abs(Number(/(\d+) град/.exec(row)![1]) - look.sun.elevation)).toBeLessThanOrEqual(5);
      expect(Math.abs(Number(/\| (\d\.\d+), /.exec(row)![1]) - look.exposure)).toBeLessThanOrEqual(0.05);
      const warmer = /теплее на (\d\.\d+)/.exec(row);
      expect(look.warmth).toBeCloseTo(warmer ? Number(warmer[1]) : 0, 5);
    }
  });

  it("keeps the sun off the first beat: at least 40 degrees from the wind (north)", () => {
    for (const look of Object.values(VENUE_LOOKS)) expect(bearingGap(look.sun.azimuth, 0)).toBeGreaterThanOrEqual(SUN_CLEAR_OF_WIND);
    expect(bearingGap(350, 10)).toBe(20);
    expect(bearingGap(0, 180)).toBe(180);
  });

  it("points the sun from its bearing and elevation (x east, y up, z south)", () => {
    const east = sunDirection({ sun: { elevation: 0, azimuth: 90, color: "#ffffff" } });
    expect(east[0]).toBeCloseTo(1, 6);
    const south = sunDirection({ sun: { elevation: 30, azimuth: 180, color: "#ffffff" } });
    expect(south[1]).toBeCloseTo(0.5, 6);
    expect(south[2]).toBeGreaterThan(0.8);
    for (const look of Object.values(VENUE_LOOKS)) {
      const d = sunDirection(look);
      expect(Math.hypot(...d)).toBeCloseTo(1, 6);
      expect((Math.asin(d[1]) * 180) / Math.PI).toBeCloseTo(look.sun.elevation, 6);
    }
    expect(sunIntensity(VENUE_LOOKS.gocek)).toBeLessThan(sunIntensity(VENUE_LOOKS.open));
  });

  it("falls back to the open sea for an unknown venue", () => {
    expect(venueLook("nowhere")).toBe(VENUE_LOOKS.open);
    expect(venueLook(undefined)).toBe(VENUE_LOOKS.open);
    expect(venueLook("split")).toBe(VENUE_LOOKS.split);
  });
});

describe("warmth grade", () => {
  it("is neutral at zero and warms red up, blue down", () => {
    expect(warmHex("#4f7a72", 0)).toBe("#4f7a72");
    const [r0, , b0] = parseHex("#808080");
    const [r, , b] = parseHex(warmHex("#808080", 0.12));
    expect(r).toBeGreaterThan(r0);
    expect(b).toBeLessThan(b0);
    expect(sceneColors(VENUE_LOOKS.solent).deep).toBe(VENUE_LOOKS.solent.water.deep);
  });

  it("keeps the graded water blue-green, never the action cyan", () => {
    const cyan = parseHex("#00d4ff");
    for (const look of Object.values(VENUE_LOOKS)) {
      const c = sceneColors(look);
      for (const hex of [c.deep, c.shallow, c.streak]) {
        const [r, g, b] = parseHex(hex);
        expect(Math.max(g, b)).toBeGreaterThan(r); // not warm water
        expect(Math.hypot(r - cyan[0], g - cyan[1], b - cyan[2])).toBeGreaterThan(110);
      }
    }
  });
});

describe("marks and overlays on the new water (art board rule 1)", () => {
  // The colours are read from the scene sources, so a changed mark colour is checked too.
  const pick = (path: string, names: string[]) => names.map((name) => {
    const m = new RegExp(`const ${name} = "(#[0-9a-fA-F]{6})"`).exec(read(path));
    expect(m, `${name} in ${path}`).not.toBeNull();
    return m![1].toLowerCase();
  });
  const [mark, pin, line, guidance] = pick("src/features/race-3d/Race3DView.tsx", ["MARK_COLOR", "PIN_COLOR", "LINE_COLOR", "GUIDANCE_COLOR"]);
  const [wedge, zone, boundary] = pick("src/features/race-scene/TacticalOverlay.tsx", ["WEDGE_COLOR", "ZONE_COLOR", "BOUNDARY_COLOR"]);
  const ghostMatch = /<Rival id="ghost" color="(#[0-9a-fA-F]{6})"/.exec(read("src/features/race-scene/RaceScene.tsx"));
  expect(ghostMatch, "the ghost colour in RaceScene.tsx").not.toBeNull();
  const ghost = ghostMatch![1].toLowerCase();
  const overlays = [mark, pin, line, guidance, wedge, zone, boundary, ghost];
  // The water and sky every venue had before M3-6 (materials.ts PALETTE then; the water reflected the horizon as it was).
  const BEFORE = { deep: "#0d5873", shallow: "#36b8b4", reflection: "#a9cfdc", zenith: "#2a628c" };

  it("gives every mark, the start line, the laylines, the no-go wedge, the zone, the boundary and the ghost at least the old contrast", () => {
    expect(overlays).toHaveLength(8);
    for (const look of Object.values(VENUE_LOOKS)) {
      const c = sceneColors(look);
      for (const mark of overlays) {
        expect(contrast(mark, c.deep)).toBeGreaterThanOrEqual(contrast(mark, BEFORE.deep));
        expect(contrast(mark, c.shallow)).toBeGreaterThanOrEqual(contrast(mark, BEFORE.shallow));
      }
    }
  });
});

describe("marks on the stern camera's water (art board rule 1)", () => {
  // Seen low over the water the shader mixes the water with the reflected sky
  // (materials.ts: col = mix(col, sky, fresnel), sky = mix(reflection, zenith, up)).
  // A grid over that mix stands in for the water round a mark 20-300 m ahead.
  const FRESNEL = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];
  const UP = [0, 0.2, 0.4];
  const water = (c: { deep: string; reflection: string; zenith: string }) =>
    FRESNEL.flatMap((f) => UP.map((t) => mixHex(c.deep, mixHex(c.reflection, c.zenith, t), f)));
  const BEFORE = water({ deep: "#0d5873", reflection: "#a9cfdc", zenith: "#2a628c" });
  const pick = (path: string, name: string) => new RegExp(`const ${name} = "(#[0-9a-fA-F]{6})"`).exec(read(path))![1].toLowerCase();
  // White, yellow and amber are read by brightness: the zone ring, the pin end, the start line, the laylines.
  const light = [
    pick("src/features/race-scene/TacticalOverlay.tsx", "ZONE_COLOR"),
    pick("src/features/race-3d/Race3DView.tsx", "PIN_COLOR"),
    pick("src/features/race-3d/Race3DView.tsx", "LINE_COLOR"),
    pick("src/features/race-3d/Race3DView.tsx", "GUIDANCE_COLOR"),
  ];
  // Orange and red are read by hue: their brightness sits inside this water's range before and after.
  const hued = [
    pick("src/features/race-3d/Race3DView.tsx", "MARK_COLOR"),
    pick("src/features/race-scene/TacticalOverlay.tsx", "WEDGE_COLOR"),
    pick("src/features/race-scene/TacticalOverlay.tsx", "BOUNDARY_COLOR"),
  ];
  const worst = (overlay: string, samples: string[]) => Math.min(...samples.map((w) => contrast(overlay, w)));
  const rgb = (a: string, b: string) => { const x = parseHex(a), y = parseHex(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };

  it("keeps the zone ring, the pin, the line and the laylines at least as bright against the water as before", () => {
    for (const [id, look] of Object.entries(VENUE_LOOKS)) {
      const now = water(sceneColors(look));
      for (const overlay of light) expect(worst(overlay, now), `${overlay} at ${id}`).toBeGreaterThanOrEqual(worst(overlay, BEFORE));
    }
  });

  it("keeps the orange and red marks far in colour from the water", () => {
    const lums = BEFORE.map(luminance);
    for (const overlay of hued) {
      // Why brightness does not measure them: it lay inside the old water's range already.
      expect(luminance(overlay)).toBeGreaterThan(Math.min(...lums));
      expect(luminance(overlay)).toBeLessThan(Math.max(...lums));
      for (const [id, look] of Object.entries(VENUE_LOOKS)) {
        expect(Math.min(...water(sceneColors(look)).map((w) => rgb(overlay, w))), `${overlay} at ${id}`).toBeGreaterThanOrEqual(110);
      }
    }
  });

  it("tones the reflected horizon towards the deep water, the sky dome keeps the board's horizon", () => {
    expect(REFLECTION_DEPTH).toBeGreaterThan(0);
    expect(REFLECTION_DEPTH).toBeLessThan(0.5);
    for (const look of Object.values(VENUE_LOOKS)) {
      const c = sceneColors(look);
      expect(c.horizon).toBe(warmHex(look.sky.horizon, look.warmth));
      expect(luminance(c.reflection)).toBeLessThan(luminance(c.horizon));
      expect(luminance(c.reflection)).toBeGreaterThan(luminance(c.deep));
    }
  });
});
