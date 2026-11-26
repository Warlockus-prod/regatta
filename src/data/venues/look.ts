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

// ---------------------------------------------------------------------------
// F4 "Softer light, clearer marks" (race Settings, TestFlight 74: "maybe turn
// the light down a bit so the mark is better visible"). One switch, off by
// default: the venue look stays as drawn, and with it on the race scene draws
// less sun (exposure, sun light, the glints on the water and their glow) and
// the marks larger and lit a little from within, so an orange or yellow buoy
// stands out of a bright sun path. Scenery only: no physics, no course
// geometry (the mark's place and the rounding rules do not change).
//
// The mark halo is on by default, with or without the softer light: in the
// owner's replay screenshot (build 74, chase camera) the windward mark at
// 540 m was an orange dot a few pixels wide, so the default look did hurt
// mark visibility. The halo is a ring that faces the camera and keeps the
// same size on screen (like the name tags), drawn over the water so the swell
// cannot cut it, and fades in only where the buoy itself gets small. An
// earlier flat ring on the water was dropped: the swell (up to about 0.5 m
// across it) cut it differently every frame and made it shimmer.

/** How much the softer light takes off, as gains on the look (1 = as drawn). */
export const SOFT_LIGHT = {
  exposure: 0.88,
  sun: 0.8,
  /** The sharp sun glints on the water, the main glare in the owner's screenshots. */
  glint: 0.35,
  /** The glow on glints and foam (quality.ts glow), on top of the glint gain. */
  glow: 0.3,
  /** Mark size (the buoy and its flag), so it reads from farther away. */
  markScale: 1.4,
} as const;

/** The dark outline of the mark halo, against the bright water and the sun path. */
export const MARK_RING_COLOR = "#0b1d29";

/** The halo round a course mark that keeps it findable at distance. */
export const MARK_HALO = {
  /** Size on screen (sprite scale with size attenuation off; about 0.05 of the view height). */
  size: 0.04,
  /** Camera distance, metres, over which it fades in: none near, where the buoy is large; full from the far end. */
  fade: [60, 140] as const,
  /** Opacity once faded in. */
  opacity: 0.9,
} as const;

/** The halo's opacity at a camera distance in metres: 0 near the mark, MARK_HALO.opacity far away, smooth between. */
export function markHaloOpacity(distance: number): number {
  if (!Number.isFinite(distance)) return 0;
  const [near, far] = MARK_HALO.fade;
  const t = Math.min(1, Math.max(0, (distance - near) / (far - near)));
  return MARK_HALO.opacity * t * t * (3 - 2 * t);
}

export interface RaceLight {
  /** Tone mapping exposure of the renderer. */
  exposure: number;
  /** Strength of the directional sun light. */
  sunIntensity: number;
  /** Gain on the sun glints on the water. */
  glint: number;
  /** Gain on the glow (multiplies the quality profile's glow). */
  glow: number;
  /** Mark size, whether it is lit from within, and the distance halo (on in both looks). */
  mark: { scale: number; glow: boolean; halo: boolean };
}

/** The race scene's light for a venue look, softer when the player asked for it. */
export function raceLight(look: VenueLook, soft = false): RaceLight {
  const sun = sunIntensity(look);
  if (!soft) return { exposure: look.exposure, sunIntensity: sun, glint: 1, glow: 1, mark: { scale: 1, glow: false, halo: true } };
  return {
    exposure: look.exposure * SOFT_LIGHT.exposure,
    sunIntensity: sun * SOFT_LIGHT.sun,
    glint: SOFT_LIGHT.glint,
    glow: SOFT_LIGHT.glow,
    mark: { scale: SOFT_LIGHT.markScale, glow: true, halo: true },
  };
}
