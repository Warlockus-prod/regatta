import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import * as THREE from "three/webgpu";
import { VENUE_LOOKS, raceLight, sceneColors, sunDirection, sunIntensity, type VenueLook } from "@/data/venues/look";
import { VENUES } from "@/data/venues/venues";
import { NEAR_CALM, NEAR_RIPPLE, NEAR_SWELL, TRAINER_COLORS, rippleStrength, swellShading, wakeMaterial, waterMaterial, waterUniforms } from "./materials";
import { QUALITY_PROFILES, type SceneQuality } from "./quality";

// M3-6 contract: the race scene draws the light of the selected venue (sun,
// sky, fog, water, exposure) and the trainers keep their own; the glow on
// glints and foam is built only on "medium" and "high"; the fine ripples are
// calmer within about 30 m of the camera than far away.
// The environment is called as a function with the hooks as plain calls (no WebGL).
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useMemo: (make: () => unknown) => make(),
  useCallback: (fn: unknown) => fn,
  useRef: (initial: unknown) => ({ current: initial }),
  useEffect: (effect: () => unknown) => { effect(); },
}));
const renderer = vi.hoisted(() => ({ toneMappingExposure: 1 }));
vi.mock("@react-three/fiber", () => ({
  useFrame: () => {},
  useThree: (select?: (state: unknown) => unknown) => (select ? select({ gl: renderer }) : {}),
}));
import { SailingEnvironment, applyExposure, environmentLight } from "./SailingEnvironment";

type El = ReactElement<Record<string, unknown>>;
const typeName = (el: El) => typeof el.type === "string" ? el.type : (el.type as { name?: string }).name ?? "";

function draw(look?: VenueLook, quality?: SceneQuality, soft?: boolean) {
  const tree = SailingEnvironment({ look, ...(quality ? { quality } : {}), ...(soft === undefined ? {} : { soft }), readState: () => null, originRef: { current: { x: 0, z: 0 } } }) as El;
  const children = (tree.props.children as ReactNode[]).filter(Boolean) as El[];
  const one = (name: string) => {
    const found = children.filter((c) => typeName(c) === name);
    expect(found, name).toHaveLength(1);
    return found[0].props;
  };
  const sky = () => {
    const found = children.filter((c) => typeName(c) === "mesh" && c.props.renderOrder === -100);
    expect(found).toHaveLength(1);
    return found[0].props.material as THREE.MeshBasicNodeMaterial;
  };
  /** Runs a child component the way React would (its hooks are plain calls here). */
  const run = (name: string) => {
    const el = children.find((c) => typeName(c) === name)!;
    return (el.type as (props: unknown) => unknown)(el.props);
  };
  return { one, sky, run };
}

/** The #rrggbb colours a material's colour graph holds as constants. */
function colours(root: unknown): Set<string> {
  const out = new Set<string>();
  (root as { traverse(cb: (n: unknown) => void): void }).traverse((n) => {
    const value = (n as { value?: unknown }).value;
    if (value instanceof THREE.Color) out.add(`#${value.getHexString()}`);
  });
  return out;
}

describe("the race scene reads the venue look", () => {
  it("draws each venue's fog, sky, sun, exposure and water", () => {
    const fogs = new Set<string>();
    for (const venue of VENUES) {
      const look = VENUE_LOOKS[venue.id];
      const colors = sceneColors(look);
      const { one, sky } = draw(look, QUALITY_PROFILES.high);
      expect(one("fog").args).toEqual([colors.fog, 420, 1900]);
      expect(one("color").args).toEqual([colors.horizon]);
      expect(one("hemisphereLight").args).toEqual([colors.hemiSky, colors.hemiGround, 0.9]);
      const sun = one("directionalLight");
      expect(sun.color).toBe(colors.sun);
      const p = new THREE.Vector3(...(sun.position as [number, number, number])).normalize();
      const d = sunDirection(look);
      expect(p.x).toBeCloseTo(d[0], 6); expect(p.y).toBeCloseTo(d[1], 6); expect(p.z).toBeCloseTo(d[2], 6);
      expect(one("Exposure").value).toBe(look.exposure);
      const water = one("Water");
      expect(water.look).toEqual({ colors, glow: true, nearCalm: true });
      const dome = colours(sky().colorNode);
      expect(dome.has(colors.zenith) && dome.has(colors.horizon), `${venue.id} sky`).toBe(true);
      // The glints follow the same sun.
      const glintSun = (water.uniforms as { sunDir: { value: THREE.Vector3 } }).sunDir.value;
      expect(glintSun.x).toBeCloseTo(d[0], 6); expect(glintSun.y).toBeCloseTo(d[1], 6);
      expect(one("Reflections").colors).toEqual(colors);
      fogs.add(colors.fog);
    }
    expect(fogs.size).toBe(VENUES.length);
  });

  it("passes the quality profile's glow to the water and the wakes as a uniform, none on low", () => {
    for (const quality of [QUALITY_PROFILES.high, QUALITY_PROFILES.medium, QUALITY_PROFILES.low]) {
      const { one } = draw(VENUE_LOOKS.gocek, quality);
      const uniforms = one("Water").uniforms as { glow: { value: number } };
      expect(uniforms.glow.value).toBe(quality.glow);
      expect((one("Water").look as { glow: boolean }).glow).toBe(quality.glow > 0);
      expect(one("HullMarks").glow).toBe(quality.glow > 0 ? uniforms.glow : undefined);
    }
  });

  it("builds the same water and wake materials on high and medium: a step between them compiles no shader", () => {
    const high = draw(VENUE_LOOKS.split, QUALITY_PROFILES.high).one;
    const medium = draw(VENUE_LOOKS.split, QUALITY_PROFILES.medium).one;
    expect(medium("Water").look).toEqual(high("Water").look);
    expect(QUALITY_PROFILES.high.waterDetail).toBe(QUALITY_PROFILES.medium.waterDetail);
    expect(typeof medium("HullMarks").glow).toBe("object");
  });

  it("leaves the trainers (no look) on their light, exposure and without glow", () => {
    const { one } = draw();
    expect(one("fog").args).toEqual([TRAINER_COLORS.fog, 420, 1900]);
    expect(one("Exposure").value).toBeUndefined();
    expect(one("Water").look).toEqual({ colors: TRAINER_COLORS, glow: false, nearCalm: false });
    expect(one("HullMarks").glow).toBeUndefined();
    expect(environmentLight().intensity).toBe(2.4);
  });

  it("is wired from the race: RaceScene passes the selected venue's look", () => {
    const source = readFileSync(join(process.cwd(), "src/features/race-scene/RaceScene.tsx"), "utf8");
    expect(source).toMatch(/<SailingEnvironment venue=\{venue\} look=\{venueLook\(venue\.id\)\} [^>]*quality=\{profile\} \/>/);
  });
});

/** Distinct nodes of a material's colour graph. */
function nodes(root: unknown): number {
  const seen = new Set<unknown>();
  (root as { traverse(cb: (n: unknown) => void): void }).traverse((n) => seen.add(n));
  return seen.size;
}

describe("glow and near calm in the materials", () => {
  const shore = { texture: new THREE.DataTexture(new Uint8Array(4), 1, 1), min: { x: 0, z: 0 }, size: { x: 1, z: 1 } };
  const colors = sceneColors(VENUE_LOOKS.split);

  it("builds no glow terms at glow 0 (the low profile) and some on medium and high", () => {
    const u = waterUniforms();
    const plain = nodes(waterMaterial(u, shore, false, { colors, glow: false }).colorNode);
    expect(nodes(waterMaterial(u, shore, false, { colors }).colorNode)).toBe(plain);
    expect(nodes(waterMaterial(u, shore, false, { colors, glow: true }).colorNode)).toBeGreaterThan(plain);
    const wake = nodes(wakeMaterial(u.travel, colors).colorNode);
    expect(nodes(wakeMaterial(u.travel, colors, u.glow).colorNode)).toBeGreaterThan(wake);
    expect(QUALITY_PROFILES.low.glow).toBe(0);
    expect(QUALITY_PROFILES.medium.glow).toBeGreaterThan(0);
  });

  it("calms the ripples and the swell shading within about 30 m of the camera, full beyond", () => {
    expect(rippleStrength(0)).toBeCloseTo(NEAR_RIPPLE, 6);
    expect(rippleStrength(NEAR_CALM[0])).toBeCloseTo(NEAR_RIPPLE, 6);
    expect(rippleStrength(20)).toBeGreaterThan(rippleStrength(10));
    expect(rippleStrength(NEAR_CALM[1])).toBe(1);
    expect(rippleStrength(200)).toBe(1);
    expect(NEAR_CALM[1]).toBeLessThanOrEqual(32);
    expect(NEAR_RIPPLE).toBeLessThan(0.6);
    expect(rippleStrength(0, false)).toBe(1);
    // The swell shades the near water less too; its heights (hulls, wakes) do not change.
    expect(swellShading(0)).toBeCloseTo(NEAR_SWELL, 6);
    expect(NEAR_SWELL).toBeLessThan(1);
    expect(swellShading(NEAR_CALM[1])).toBe(1);
    expect(swellShading(0, false)).toBe(1);
    // The shader builds the near calm only when asked (the race), the same detail otherwise.
    const u = waterUniforms();
    expect(nodes(waterMaterial(u, shore, true, { colors, nearCalm: true }).colorNode))
      .toBeGreaterThan(nodes(waterMaterial(u, shore, true, { colors, nearCalm: false }).colorNode));
  });
});

describe("the water reflects the toned horizon", () => {
  it("draws the reflection colour, not the sky's pale horizon, in the water (trainers: the same horizon)", () => {
    const shore = { texture: new THREE.DataTexture(new Uint8Array(4), 1, 1), min: { x: 0, z: 0 }, size: { x: 1, z: 1 } };
    for (const look of Object.values(VENUE_LOOKS)) {
      const c = sceneColors(look);
      const water = colours(waterMaterial(waterUniforms(), shore, true, { colors: c }).colorNode);
      expect(water.has(c.reflection)).toBe(true);
      expect(water.has(c.horizon)).toBe(false);
    }
    expect(TRAINER_COLORS.reflection).toBe(TRAINER_COLORS.horizon);
  });
});

describe("tone mapping exposure of the venue look", () => {
  it("sets the value and gives the previous one back; no value leaves the renderer alone", () => {
    const gl = { toneMappingExposure: 1.05 };
    const restore = applyExposure(gl, 0.95);
    expect(gl.toneMappingExposure).toBe(0.95);
    restore!();
    expect(gl.toneMappingExposure).toBe(1.05);
    expect(applyExposure(gl, undefined)).toBeUndefined();
    expect(gl.toneMappingExposure).toBe(1.05);
  });

  it("is what the scene's Exposure puts on the shared renderer", () => {
    renderer.toneMappingExposure = 1;
    draw(VENUE_LOOKS.mazury, QUALITY_PROFILES.high).run("Exposure");
    expect(renderer.toneMappingExposure).toBe(VENUE_LOOKS.mazury.exposure);
    renderer.toneMappingExposure = 1.05;
    draw(undefined).run("Exposure");
    expect(renderer.toneMappingExposure).toBe(1.05);
  });
});

// F4 contract: the softer light reaches the drawn scene as gains (exposure,
// sun light, glint and glow uniforms) with the same colours and the same
// water look, so switching it builds no shader; off, the scene is as before.
describe("softer race light in the scene (F4)", () => {
  it("lowers exposure, sun, glints and glow and keeps the colours and the water look", () => {
    for (const look of Object.values(VENUE_LOOKS)) {
      const plain = draw(look, QUALITY_PROFILES.high, false).one, soft = draw(look, QUALITY_PROFILES.high, true).one;
      const light = raceLight(look, true);
      expect(soft("Exposure").value).toBe(light.exposure);
      expect(soft("Exposure").value).toBeLessThan(plain("Exposure").value as number);
      expect(soft("directionalLight").intensity).toBe(light.sunIntensity);
      expect(plain("directionalLight").intensity).toBe(sunIntensity(look));
      const u = (one: typeof plain) => one("Water").uniforms as { glint: { value: number }; glow: { value: number } };
      expect(u(plain).glint.value).toBe(1);
      expect(u(soft).glint.value).toBe(light.glint);
      expect(u(plain).glow.value).toBe(QUALITY_PROFILES.high.glow);
      expect(u(soft).glow.value).toBeCloseTo(QUALITY_PROFILES.high.glow * light.glow, 9);
      expect(soft("Water").look).toEqual(plain("Water").look);
      expect(soft("fog").args).toEqual(plain("fog").args);
      expect(soft("hemisphereLight").args).toEqual(plain("hemisphereLight").args);
    }
  });

  it("is off unless asked, and the trainers keep their light", () => {
    const look = VENUE_LOOKS.split;
    expect(draw(look, QUALITY_PROFILES.high).one("Exposure").value).toBe(look.exposure);
    expect(draw(undefined, undefined, true).one("Exposure").value).toBeUndefined();
    expect(waterUniforms().glint.value).toBe(1);
  });

  it("is wired from the race: RaceScene passes the player's choice to the light and the marks", () => {
    const source = readFileSync(join(process.cwd(), "src/features/race-scene/RaceScene.tsx"), "utf8");
    expect(source).toMatch(/<SailingEnvironment [^>]*soft=\{softLight\}[^>]*\/>/);
    expect(source).toMatch(/<World [^>]*marks=\{markLook\}[^>]*\/>/);
    expect(source).toMatch(/raceLight\(venueLook\(venue\.id\), softLight\)\.mark/);
    for (const host of ["src/app/game/GameClient.tsx", "src/app/game/RaceReplay.tsx", "src/app/multiplayer/MultiplayerClient.tsx"]) {
      expect(readFileSync(join(process.cwd(), host), "utf8"), host).toMatch(/<RaceScene [^>]*softLight=\{/);
    }
  });
});

