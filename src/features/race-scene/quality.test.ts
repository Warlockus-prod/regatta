import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GOOD_FPS, HELD_AFTER_MS, IDLE_FPS, VIEW_SIGNATURE_LENGTH, createSceneDraw, LOW_FPS, PROBE_UP_WINDOWS, QUALITY_LADDER, QUALITY_PROFILES, QUALITY_STORAGE_KEY, QUALITY_WINDOW_S,
  createFleetHeldWatch, createQualityGovernor, createRenderGate, createViewWatch, hullScreenPx, loadQualityStep, parseQualityStep,
  qualityAt, rivalIsFar, saveQualityStep, serializeQualityStep, settle, stepDown, stepUp,
} from "./quality";

// M2-5 contract: a slow device steps down the one quality ladder (pixel ratio
// first, then the scene profile), never up within a race, remembers the step
// on the device, and a held race is drawn a few times a second.

/** Feed `seconds` of frames at `fps` into a governor; returns the clock and the steps it took. */
function run(governor: ReturnType<typeof createQualityGovernor>, start: number, seconds: number, fps: number, counted = true) {
  const steps: number[] = [];
  let t = start;
  for (let i = 0; i < Math.round(seconds * fps); i++) {
    t += 1 / fps;
    const step = governor.frame(t, counted);
    if (step !== null) steps.push(step);
  }
  return { t, steps };
}

describe("quality ladder", () => {
  it("starts at today's picture and ends at the cheapest", () => {
    expect(qualityAt(0, 2)).toEqual({ profile: QUALITY_PROFILES.high, dpr: 2 });
    expect(qualityAt(QUALITY_LADDER.length - 1, 2)).toEqual({ profile: QUALITY_PROFILES.low, dpr: 1 });
    // "high" is the scene as it was before profiles: the water grid, its noise, clouds and every tree.
    expect(QUALITY_PROFILES.high).toMatchObject({ waterSegments: 200, waterDetail: true, clouds: true, treeShare: 1 });
  });

  it("has no bow spray and no camera shake on the low profile (M3-5)", () => {
    expect(QUALITY_PROFILES.low).toMatchObject({ spray: 0, cameraShake: false });
    expect(QUALITY_PROFILES.medium.cameraShake).toBe(true);
    expect(QUALITY_PROFILES.high.cameraShake).toBe(true);
  });

  it("glows only on medium and high, and no profile adds a render pass (M3-6)", () => {
    expect(QUALITY_PROFILES.low.glow).toBe(0);
    expect(QUALITY_PROFILES.medium.glow).toBeGreaterThan(0);
    expect(QUALITY_PROFILES.high.glow).toBeGreaterThanOrEqual(QUALITY_PROFILES.medium.glow);
    // The glow is emissive in the water and wake shaders (venue-look.test.tsx), never a
    // post-processing pass: the scene draws once per frame on every profile.
    for (const file of ["RaceScene.tsx", "SailingEnvironment.tsx", "materials.ts"]) {
      const text = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
      expect(text, file).not.toMatch(/PostProcessing|EffectComposer|bloom\(|pass\(|RenderTarget/);
    }
    const scene = readFileSync(new URL("./RaceScene.tsx", import.meta.url), "utf8");
    expect(scene.match(/\.render\(/g)).toHaveLength(1);
  });

  it("gets cheaper at every step and never trades a lever back", () => {
    for (let i = 1; i < QUALITY_LADDER.length; i++) {
      const a = qualityAt(i - 1, 2), b = qualityAt(i, 2);
      expect(b.dpr).toBeLessThanOrEqual(a.dpr);
      expect(b.profile.waterSegments).toBeLessThanOrEqual(a.profile.waterSegments);
      expect(b.profile.treeShare).toBeLessThanOrEqual(a.profile.treeShare);
      expect(b.profile.rivalFarPx).toBeGreaterThanOrEqual(a.profile.rivalFarPx);
      expect(b.profile.glow).toBeLessThanOrEqual(a.profile.glow);
      expect(b.dpr < a.dpr || b.profile !== a.profile).toBe(true);
    }
  });

  it("skips steps a device cannot see: on a 1x screen every step changes the profile", () => {
    // Device pixel ratio 1: the pixel ratio steps are all the same picture.
    expect(stepDown(0, 1)).toBe(3);
    expect(qualityAt(stepDown(0, 1), 1).profile.id).toBe("medium");
    expect(stepDown(3, 1)).toBe(5);
    expect(stepDown(5, 1)).toBe(5);
    expect(stepUp(5, 1)).toBe(4);
    expect(qualityAt(stepUp(5, 1), 1).profile.id).toBe("medium");
    // A 2x screen walks every step.
    expect(stepDown(0, 2)).toBe(1);
    expect(stepUp(1, 2)).toBe(0);
    // A remembered 2x step lands on the same picture on a 1x screen.
    expect(settle(2, 1)).toBe(0);
    expect(settle(4, 1)).toBe(3);
  });
});

describe("device memory", () => {
  it("round-trips a step and rejects anything else", () => {
    for (let i = 0; i < QUALITY_LADDER.length; i++) expect(parseQualityStep(serializeQualityStep(i))).toBe(i);
    for (const bad of [null, "", "{", "[]", '{"quality":"ultra","dpr":2}', '{"quality":"low","dpr":3}', "x".repeat(300)]) expect(parseQualityStep(bad)).toBeNull();
  });

  it("reads and writes the race key, and survives blocked storage", () => {
    const rows = new Map<string, string>();
    const store = { getItem: (k: string) => rows.get(k) ?? null, setItem: (k: string, v: string) => { rows.set(k, v); } };
    expect(loadQualityStep(store)).toBe(0);
    saveQualityStep(4, store);
    expect(JSON.parse(rows.get(QUALITY_STORAGE_KEY)!)).toEqual({ quality: "medium", dpr: 1.25 });
    expect(loadQualityStep(store)).toBe(4);
    const blocked = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); } };
    expect(loadQualityStep(blocked)).toBe(0);
    expect(() => saveQualityStep(2, blocked)).not.toThrow();
    expect(loadQualityStep(null)).toBe(0);
  });

  it("is a key the iOS app is asked to carry", () => {
    expect(QUALITY_STORAGE_KEY).toBe("regatta.race.quality.v1");
    // The app copies only listed rows between the WebView and native storage.
    const file = readFileSync(join(process.cwd(), "mobile/src/persistence/race-web-storage.ts"), "utf8");
    expect(file).toContain(`"${QUALITY_STORAGE_KEY}"`);
  });
});

describe("frame-time governor", () => {
  it("ignores the first window (shader compiles), then steps down once per slow window", () => {
    const g = createQualityGovernor(0, 2);
    let r = run(g, 0, QUALITY_WINDOW_S + 0.1, 20);
    expect(r.steps).toEqual([]);
    r = run(g, r.t, QUALITY_WINDOW_S * 2 + 0.1, 20);
    expect(r.steps).toEqual([1, 2]);
    expect(g.index).toBe(2);
    expect(g.fps).toBeLessThan(LOW_FPS);
  });

  it("holds the step at a smooth frame rate and never steps up within a race", () => {
    const g = createQualityGovernor(3, 2);
    const r = run(g, 0, 60, 60);
    expect(r.steps).toEqual([]);
    expect(g.index).toBe(3);
  });

  it("does not measure held, hidden or warm-up frames", () => {
    const g = createQualityGovernor(0, 2);
    let r = run(g, 0, 10, 60);
    r = run(g, r.t, 30, 5, false);
    expect(r.steps).toEqual([]);
    // A slow loop while held, then one smooth window: no step.
    run(g, r.t, QUALITY_WINDOW_S + 0.1, 60);
    expect(g.index).toBe(0);
  });

  it("lets the next race try one step up only after a whole smooth race", () => {
    const smooth = createQualityGovernor(4, 2);
    run(smooth, 0, QUALITY_WINDOW_S * (PROBE_UP_WINDOWS + 2), GOOD_FPS + 3);
    expect(smooth.remembered()).toBe(3);
    const short = createQualityGovernor(4, 2);
    run(short, 0, QUALITY_WINDOW_S * 5, GOOD_FPS + 3);
    expect(short.remembered()).toBe(4);
    const stuttered = createQualityGovernor(4, 2);
    const r = run(stuttered, 0, QUALITY_WINDOW_S * (PROBE_UP_WINDOWS + 2), GOOD_FPS + 3);
    // The first slow window may still hold smooth frames; the second is all slow.
    run(stuttered, r.t, QUALITY_WINDOW_S * 2 + 0.1, 30);
    expect(stuttered.index).toBe(5);
    expect(stuttered.remembered()).toBe(5);
  });
});

describe("render rate while the race is held", () => {
  it("draws every frame while racing and IDLE_FPS frames a second while held", () => {
    const gate = createRenderGate();
    let drawn = 0;
    for (let i = 0; i < 60; i++) if (gate.shouldRender(i * 1000 / 60, false, false)) drawn++;
    expect(drawn).toBe(60);
    drawn = 0;
    for (let i = 60; i < 120; i++) if (gate.shouldRender(i * 1000 / 60, true, false)) drawn++;
    expect(drawn).toBeGreaterThanOrEqual(IDLE_FPS - 1);
    expect(drawn).toBeLessThanOrEqual(IDLE_FPS + 1);
  });

  it("draws at once when the view changes, and nothing while shaders warm up", () => {
    const gate = createRenderGate();
    expect(gate.shouldRender(0, true, false)).toBe(true);
    expect(gate.shouldRender(16, true, false)).toBe(false);
    expect(gate.shouldRender(32, true, true)).toBe(true);
    gate.warming = true;
    expect(gate.shouldRender(500, false, true)).toBe(false);
    gate.warming = false;
    expect(gate.shouldRender(516, false, false)).toBe(true);
  });

  it("calls a fleet held only after every boat has been still for a while", () => {
    const held = createFleetHeldWatch();
    const fleet = [{ pos: { x: 1, y: 2 }, heading: 10 }, { pos: { x: 5, y: 6 }, heading: 20 }];
    expect(held(0, fleet)).toBe(false);
    expect(held(HELD_AFTER_MS - 1, fleet)).toBe(false);
    expect(held(HELD_AFTER_MS, fleet)).toBe(true);
    fleet[1] = { pos: { x: 5, y: 6 }, heading: 21 };
    expect(held(HELD_AFTER_MS + 10, fleet)).toBe(false);
    expect(held(HELD_AFTER_MS * 2 + 10, fleet)).toBe(true);
    expect(held(HELD_AFTER_MS * 2 + 20, fleet.slice(0, 1))).toBe(false);
  });

  it("holds a paused race once its first frame is shown and the fleet is still, and only then", () => {
    const fleet = [{ pos: { x: 1, y: 2 }, heading: 10 }];
    const view = new Float64Array(VIEW_SIGNATURE_LENGTH).fill(1);
    /** Frames drawn over one second at 60 Hz, starting at `from` ms. */
    const second = (draw: ReturnType<typeof createSceneDraw>, gate: ReturnType<typeof createRenderGate>, from: number, racing: boolean, shown: boolean, moving = false) => {
      let drawn = 0;
      for (let i = 0; i < 60; i++) {
        if (moving) fleet[0] = { ...fleet[0], pos: { x: fleet[0].pos.x + 0.1, y: 2 } };
        if (draw.frame(gate, from + i * 1000 / 60, racing, shown, fleet, view)) drawn++;
      }
      return drawn;
    };
    // Racing: every frame, never held.
    let draw = createSceneDraw(), gate = createRenderGate();
    expect(second(draw, gate, 0, true, true)).toBe(60);
    expect(second(draw, gate, 1000, true, true)).toBe(60);
    expect(draw.held).toBe(false);
    // Paused with a still fleet: full rate for HELD_AFTER_MS, then the idle rate.
    draw = createSceneDraw(); gate = createRenderGate();
    second(draw, gate, 0, false, true);
    expect(draw.held).toBe(true);
    const idle = second(draw, gate, 1000, false, true);
    expect(idle).toBeGreaterThanOrEqual(IDLE_FPS - 1);
    expect(idle).toBeLessThanOrEqual(IDLE_FPS + 1);
    // A moving fleet (countdown) or a scene not shown yet is never held.
    draw = createSceneDraw(); gate = createRenderGate();
    expect(second(draw, gate, 0, false, true, true) + second(draw, gate, 1000, false, true, true)).toBe(120);
    draw = createSceneDraw(); gate = createRenderGate();
    expect(second(draw, gate, 0, false, false) + second(draw, gate, 1000, false, false)).toBe(120);
    expect(draw.held).toBe(false);
  });

  it("notices a moved camera, a resized canvas or a new pixel ratio", () => {
    const changed = createViewWatch(3);
    expect(changed([1, 2, 3])).toBe(true);
    expect(changed([1, 2, 3])).toBe(false);
    expect(changed([1, 2, 3.01])).toBe(true);
    expect(changed([1, 2, 3.01])).toBe(false);
  });
});

describe("far boats", () => {
  it("measures a hull on screen and switches with a band so it cannot flicker", () => {
    // 13.9 m at 100 m through a 42 degree lens on an 844 px tall phone: about 152 px.
    expect(hullScreenPx(100, 42, 844)).toBeCloseTo(152.8, 0);
    expect(hullScreenPx(200, 42, 844)).toBeCloseTo(hullScreenPx(100, 42, 844) / 2, 6);
    expect(hullScreenPx(0, 42, 844)).toBe(Infinity);
    const far = QUALITY_PROFILES.high.rivalFarPx;
    expect(rivalIsFar(false, far + 1, far)).toBe(false);
    expect(rivalIsFar(false, far - 1, far)).toBe(true);
    expect(rivalIsFar(true, far + 1, far)).toBe(true);
    expect(rivalIsFar(true, far * 1.25, far)).toBe(false);
  });
});

describe("race scene wiring", () => {
  const source = readFileSync(new URL("./RaceScene.tsx", import.meta.url), "utf8");

  it("gives the Canvas the step's pixel ratio as a number, not a range R3F re-applies on every re-render", () => {
    expect(source).toMatch(/\n\s+dpr=\{dpr\}\n/);
    expect(source).not.toMatch(/dpr=\{\[/);
  });

  it("keeps the reached step when the Canvas is rebuilt after a lost GPU", () => {
    // The Canvas is keyed by the GPU generation; its new governor starts from
    // the step drawn now, not the race's start step (a step up mid-race).
    expect(source).toMatch(/key=\{gpu\.generation\}/);
    expect(source).toMatch(/<Quality key=\{cap\} [^>]*start=\{qualityStep\}/);
    expect(source).toMatch(/const \[governor\] = useState\(\(\) => createQualityGovernor\(start, cap\)\);/);
    // A governor rebuilt from a later step never steps back up to the earlier one.
    const rebuilt = createQualityGovernor(4, 2);
    expect(rebuilt.index).toBe(4);
    run(rebuilt, 0, QUALITY_WINDOW_S * 3 + 0.1, 20);
    expect(rebuilt.index).toBeGreaterThan(4);
  });

  it("draws through the gate (a priority frame callback) and warms shaders before the first frame", () => {
    // The M3-5 shake offset is taken back right after the draw, in the same priority callback.
    expect(source).toMatch(/state\.gl\.render\(state\.scene, state\.camera\);\n\s+\} finally \{\n\s+if \(shaking\) endShakenFrame\(camera\.position, offset\);\n\s+\}\n\s+\}, 1\);/);
    // The decision is createSceneDraw (tested above) fed the live race clock and first-frame state.
    expect(source).toMatch(/draw\.frame\(gateRef\.current, now, racingRef\.current, firstFrameRef\.current !== null, boatsRef\.current, view\);\n\s+heldRef\.current = draw\.held;\n\s+if \(render\) state\.gl\.render/);
    expect(source).toMatch(/<WarmShaders gateRef=\{gateRef\}><FirstSceneFrame onReady=\{ready\} \/><\/WarmShaders>/);
    expect(source.match(/farPxRef=\{farPxRef\}/g)).toHaveLength(2);
  });

  it("feeds contact and start gun into the shake that the live profile and reduced motion gate (M3-5)", () => {
    // The gate and the event conversion are createSceneShake (effects.test.ts); here only that the scene uses them.
    expect(source).toMatch(/const \[shakeControl\] = useState\(\(\) => createSceneShake\(profileRef, reducedMotion\)\);/);
    expect(source).toMatch(/useEffect\(\(\) => \{ profileRef\.current = profile; \}, \[profile\]\);/);
    expect(source).toMatch(/const reducedMotion = useReducedMotionRef\(\);/);
    expect(source).toMatch(/useEffect\(\(\) => \{ shakeControl\.feed\(contactId, started\); \}, \[contactId, started, shakeControl\]\);/);
    expect(source).toMatch(/const shakeRef = useRef<ShakeControl>\(shakeControl\);/);
    expect(source).toMatch(/<GatedRender [^>]*shakeRef=\{shakeRef\} \/>/);
  });
});
