import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AI_COLORS, AI_NAMES, PLAYER_COLOR as MODEL_PLAYER_COLOR } from "@/app/game/race-model";
import { FLEET_COLORS, PLAYER_COLOR } from "./boat-colors";

// Contract (M1-7): the player's boat and the fleet are never the action cyan
// (or the light theme's accent), every boat colour reads at 3:1 or more on the
// dark and light backgrounds, and the player stays distinct from every rival
// for normal vision and simulated protan, deutan and tritan colour blindness.

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const tokens = (name: string) => [...css.matchAll(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})\\b`, "gi"))].map(m => m[1].toLowerCase());
const backgrounds = [...new Set([...tokens("bg-primary"), ...tokens("bg-card")])];
const accents = [...new Set(tokens("accent-cyan"))];

const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex: string) => { const [r, g, b] = rgb(hex).map(linear); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a: string, b: string) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// Machado, Oliveira and Fernandes (2009), severity 1.0, on linear RGB.
const CVD = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
} as const;
type Vision = keyof typeof CVD | "normal";
const lab = (hex: string, vision: Vision) => {
  const c = rgb(hex).map(linear);
  const [r, g, b] = vision === "normal" ? c : CVD[vision].map(row => Math.min(1, Math.max(0, row[0] * c[0] + row[1] * c[1] + row[2] * c[2])));
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const x = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047), y = f(0.2126 * r + 0.7152 * g + 0.0722 * b), z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};
/** CIE76 colour difference; about 2.3 is just noticeable, 20 and more is plainly different. */
const deltaE = (a: string, b: string, vision: Vision = "normal") => { const p = lab(a, vision), q = lab(b, vision); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
const all = [PLAYER_COLOR, ...FLEET_COLORS];

describe("race boat colours", () => {
  it("reads the real theme tokens", () => {
    expect(backgrounds).toEqual(expect.arrayContaining(["#0a1628", "#152540", "#f7f5f0", "#ffffff"]));
    expect(accents).toEqual(expect.arrayContaining(["#00d4ff", "#006ea6"]));
  });

  it("is the colour set the solo race actually uses", () => {
    expect(MODEL_PLAYER_COLOR).toBe(PLAYER_COLOR);
    expect(AI_COLORS).toEqual([...FLEET_COLORS]);
    expect(AI_COLORS).toHaveLength(AI_NAMES.length);
    expect(new Set(all.map(c => c.toLowerCase())).size).toBe(all.length);
  });

  it("keeps no boat cyan or accent blue", () => {
    for (const color of all) for (const accent of accents) expect(deltaE(color, accent), `${color} vs ${accent}`).toBeGreaterThanOrEqual(30);
  });

  it("keeps 3:1 against every page and card background of both themes", () => {
    for (const color of all) for (const bg of backgrounds) expect(contrast(color, bg), `${color} on ${bg}`).toBeGreaterThanOrEqual(3);
  });

  it("keeps the player distinct from every rival for normal and colour-blind vision", () => {
    for (const vision of ["normal", "protan", "deutan", "tritan"] as const)
      for (const rival of FLEET_COLORS) expect(deltaE(PLAYER_COLOR, rival, vision), `${vision}: ${rival}`).toBeGreaterThanOrEqual(20);
  });

  it("keeps the rivals apart from each other for normal vision", () => {
    FLEET_COLORS.forEach((a, i) => FLEET_COLORS.slice(i + 1).forEach(b => expect(deltaE(a, b), `${a} vs ${b}`).toBeGreaterThanOrEqual(25)));
  });
});
