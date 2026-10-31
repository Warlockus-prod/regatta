// Light and colour of the race by venue (M3-6, art reference board
// docs/design/game-graphics/art-board-m3.md). Data, not shaders: the race
// scene reads one look per venue and draws it with the same procedural sky,
// water and light (SailingEnvironment.tsx, materials.ts). Scenery only, the
// look never changes the physics.
//
// Conventions: the race chart has the wind from the north (venues.ts), so the
// player looks north on the first beat. The sun azimuth is a compass bearing
// (0 = north, upwind) and is kept at least SUN_CLEAR_OF_WIND degrees off the
// wind, so the glints do not blind the hardest leg. The warmth is one colour
// grade per venue, applied to the colours of the look on the CPU (no extra
// render pass): 0 is neutral, 0.12 is 12% warmer.
// Numbers follow the board within its tolerances (colour +-8 per channel).
// The Göcek and Split shallows sit 8 darker than the board, so the red no-go
// wedge keeps at least its old contrast to the water (look.test.ts).

import type { VenueId } from "./venues";

export interface VenueLook {
  sun: {
    /** Degrees above the horizon. */
    elevation: number;
    /** Compass bearing the light comes from, 0 = north (upwind). */
    azimuth: number;
    color: string;
  };
  sky: { zenith: string; horizon: string };
  fog: string;
  water: { deep: string; shallow: string };
  /** Tone mapping exposure of the renderer. */
  exposure: number;
  /** Colour grade towards warm light, 0 neutral. */
  warmth: number;
}

/** The sun stays at least this far (degrees) from the wind, i.e. from the view up the first beat. */
export const SUN_CLEAR_OF_WIND = 40;

export const VENUE_LOOKS: Readonly<Record<VenueId, VenueLook>> = {
  // Warm late day, pine hills: the sun low in the west-south-west.
  gocek: {
    sun: { elevation: 28, azimuth: 250, color: "#ffd9a8" },
    sky: { zenith: "#5f8fc4", horizon: "#f2d6b3" },
    fog: "#e6d2b8",
    water: { deep: "#1f4f63", shallow: "#37827e" },
    exposure: 1.0,
    warmth: 0.12,
  },
  // Bright midday, white limestone, light haze: high sun over Brač.
  split: {
    sun: { elevation: 52, azimuth: 165, color: "#fff1d6" },
    sky: { zenith: "#4f86c6", horizon: "#dfe6ea" },
    fog: "#d9dfe2",
    water: { deep: "#1b4d6b", shallow: "#358298" },
    exposure: 1.05,
    warmth: 0.05,
  },
  // Soft light over the lake, green, no salt.
  mazury: {
    sun: { elevation: 34, azimuth: 215, color: "#ffe6c2" },
    sky: { zenith: "#6f97bf", horizon: "#e3e4d6" },
    fog: "#cfd5c8",
    water: { deep: "#1f3f3c", shallow: "#3d6b58" },
    exposure: 0.95,
    warmth: 0.06,
  },
  // Light overcast, grey-green water: the sun over the Isle of Wight.
  solent: {
    sun: { elevation: 40, azimuth: 195, color: "#f4efe4" },
    sky: { zenith: "#7f9bb5", horizon: "#e1e3e1" },
    fog: "#c9cfd1",
    water: { deep: "#2a4a52", shallow: "#4f7a72" },
    exposure: 0.98,
    warmth: 0,
  },
  // High sun, deep blue.
  open: {
    sun: { elevation: 58, azimuth: 135, color: "#fff4e0" },
    sky: { zenith: "#3f78c0", horizon: "#d6e3ee" },
    fog: "#d2dde6",
    water: { deep: "#123f66", shallow: "#2f6f94" },
    exposure: 1.02,
    warmth: 0.04,
  },
};

/** The look of a venue; an unknown id gets the open sea. */
export function venueLook(id: string | null | undefined): VenueLook {
  return (id && Object.prototype.hasOwnProperty.call(VENUE_LOOKS, id) ? VENUE_LOOKS[id as VenueId] : VENUE_LOOKS.open);
}

/** Unit vector towards the sun in the scene frame (x east, y up, z south). */
export function sunDirection(look: Pick<VenueLook, "sun">): [number, number, number] {
  const el = (look.sun.elevation * Math.PI) / 180;
  const az = (look.sun.azimuth * Math.PI) / 180;
  return [Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az)];
}

/** Strength of the sun light: a low sun a little softer, about 2.2 at 28 degrees and 2.5 at 58 (the trainers keep 2.4). */
export function sunIntensity(look: Pick<VenueLook, "sun">): number {
  const s = Math.sin((look.sun.elevation * Math.PI) / 180) / Math.sin(Math.PI / 4);
  return 2.4 * (0.8 + 0.2 * s);
}

/** Smallest angle in degrees between two compass bearings. */
export function bearingGap(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return Math.min(d, 360 - d);
}

type RGB = [number, number, number];

export function parseHex(hex: string): RGB {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`not a #rrggbb colour: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (c: RGB): string => `#${c.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;

/** Mix two #rrggbb colours, t 0 gives `a`. */
export function mixHex(a: string, b: string, t: number): string {
  const x = parseHex(a), y = parseHex(b);
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t) as RGB);
}

/** Scale a #rrggbb colour (darker below 1). */
export function scaleHex(hex: string, k: number): string {
  return toHex(parseHex(hex).map((v) => v * k) as RGB);
}

/** The warmth grade: red up and blue down by half the warmth, green barely. */
export function warmHex(hex: string, warmth: number): string {
  const [r, g, b] = parseHex(hex);
  return toHex([r * (1 + warmth * 0.5), g * (1 + warmth * 0.1), b * (1 - warmth * 0.5)]);
}

/** WCAG relative luminance of a #rrggbb colour, 0..1. */
export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio of two colours, 1..21. */
export function contrast(a: string, b: string): number {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Every colour the scene draws from a look, graded once. */
export interface SceneColors {
  sun: string;
  zenith: string;
  horizon: string;
  /** The horizon as the water reflects it: toned towards the deep water (REFLECTION_DEPTH). */
  reflection: string;
  fog: string;
  deep: string;
  shallow: string;
  /** Wind streaks on the water, a darker deep. */
  streak: string;
  foam: string;
  cloud: string;
  /** Hemisphere light: sky and ground. */
  hemiSky: string;
  hemiGround: string;
}

/** How far the horizon the water reflects is toned towards the deep water (0 none, 1 all).
 * The board's horizons are pale; reflected as they are, they wash the water out at grazing
 * angles (the stern camera), and the white zone ring and the yellow pin lose contrast there
 * (look.test.ts, "on the stern camera"). The sky dome keeps the board's horizon. */
export const REFLECTION_DEPTH = 0.35;

/** The scene colours of a look, with its warmth applied. */
export function sceneColors(look: VenueLook): SceneColors {
  const w = (hex: string) => warmHex(hex, look.warmth);
  return {
    sun: w(look.sun.color),
    zenith: w(look.sky.zenith),
    horizon: w(look.sky.horizon),
    reflection: w(mixHex(look.sky.horizon, look.water.deep, REFLECTION_DEPTH)),
    fog: w(look.fog),
    deep: w(look.water.deep),
    shallow: w(look.water.shallow),
    streak: w(scaleHex(look.water.deep, 0.72)),
    foam: w("#f4fbfd"),
    cloud: w("#f5f7fa"),
    hemiSky: w(mixHex("#d6ecff", look.sky.horizon, 0.35)),
    hemiGround: w(mixHex("#3a5560", look.water.deep, 0.4)),
  };
}
