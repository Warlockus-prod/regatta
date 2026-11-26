import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WARMUP_MAX_MS, createSailingRenderer, warmUpShaders } from "./renderer";

const { init, construct, report } = vi.hoisted(() => ({ init: vi.fn(), construct: vi.fn(), report: vi.fn() }));
vi.mock("three/webgpu", () => ({ WebGPURenderer: class { init = init; constructor(options: unknown) { construct(options); } }, AgXToneMapping: "AgX", SRGBColorSpace: "sRGB" }));
vi.mock("@/features/simulator-3d/scene-diagnostics", () => ({ recordSceneLifecycle: report }));
beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal("window", { location: { search: "" } }); });
afterEach(() => vi.unstubAllGlobals());
const create = createSailingRenderer as unknown as (props: { canvas: HTMLCanvasElement | OffscreenCanvas }) => Promise<Record<string, unknown>>;

describe("actual shared renderer initialization", () => {
  it("does not claim ready while initialization is unresolved, then preserves the renderer policy", async () => {
    let resolve!: () => void;
    init.mockReturnValue(new Promise<void>(done => { resolve = done; }));
    const canvas = { clientWidth: 390, clientHeight: 330 } as HTMLCanvasElement;
    const pending = create({ canvas });
    expect(report.mock.calls).toEqual([["renderer", "begin", "sized"]]);
    resolve(); const renderer = await pending;
    expect(report.mock.calls).toEqual([["renderer", "begin", "sized"], ["renderer", "ready", "sized"]]);
    expect(construct).toHaveBeenCalledWith({ canvas, antialias: true, powerPreference: "high-performance", forceWebGL: false });
    expect(renderer).toMatchObject({ toneMapping: "AgX", toneMappingExposure: 1.05, outputColorSpace: "sRGB" });
  });

  it.each(["constructor", "init"])("rethrows the actual %s failure after recording its stage", async stage => {
    const error = new Error("private renderer detail");
    (stage === "constructor" ? construct : init).mockImplementation(() => { throw error; });
    await expect(create({ canvas: { clientWidth: 0, clientHeight: 330 } as HTMLCanvasElement })).rejects.toBe(error);
    expect(report.mock.calls).toEqual([["renderer", "begin", "empty"], ["renderer", "error", "empty"]]);
    expect(JSON.stringify(report.mock.calls)).not.toContain("private renderer detail");
  });

  it("preserves explicit WebGL2 without inventing DOM dimensions for an offscreen canvas", async () => {
    vi.stubGlobal("window", { location: { search: "?gl=webgl2" } });
    await create({ canvas: {} as OffscreenCanvas });
    expect(construct.mock.calls[0][0].forceWebGL).toBe(true);
    expect(report.mock.calls).toEqual([["renderer", "begin", undefined], ["renderer", "ready", undefined]]);
  });
});

describe("shader warm-up behind the loading screen (M2-7)", () => {
  const timers = () => {
    const pending: (() => void)[] = [];
    return { pending, set: ((fn: () => void) => { pending.push(fn); return pending.length; }) as unknown as typeof setTimeout, clear: vi.fn() as unknown as typeof clearTimeout };
  };

  it("compiles the actual scene with the actual camera and reports success", async () => {
    const compileAsync = vi.fn().mockResolvedValue(undefined);
    const scene = {}, camera = {};
    const t = timers();
    await expect(warmUpShaders({ compileAsync }, scene, camera, 4000, t)).resolves.toBe(true);
    expect(compileAsync).toHaveBeenCalledWith(scene, camera);
    expect(t.clear).toHaveBeenCalled();
  });

  it("never rejects: a missing method, a throw or a rejection all let the first frame through", async () => {
    await expect(warmUpShaders({}, {}, {})).resolves.toBe(false);
    await expect(warmUpShaders({ compileAsync: () => { throw new Error("x"); } }, {}, {}, 4000, timers())).resolves.toBe(false);
    await expect(warmUpShaders({ compileAsync: () => Promise.reject(new Error("x")) }, {}, {}, 4000, timers())).resolves.toBe(false);
  });

  it("default timers call setTimeout with the global receiver, as a browser requires", async () => {
    // A browser's setTimeout throws "Illegal invocation" when called as a
    // method of another object; Node does not, so the check is emulated here.
    const real = globalThis.setTimeout;
    const strict = function (this: unknown, fn: () => void, ms?: number) {
      if (this !== undefined && this !== globalThis) throw new TypeError("Illegal invocation");
      return real(fn, ms);
    };
    vi.stubGlobal("setTimeout", strict);
    try {
      await expect(warmUpShaders({ compileAsync: () => Promise.resolve() }, {}, {})).resolves.toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("gives up after the time limit so a stuck compile cannot hold the loading screen", async () => {
    const t = timers();
    const result = warmUpShaders({ compileAsync: () => new Promise(() => {}) }, {}, {}, WARMUP_MAX_MS, t);
    expect(t.pending).toHaveLength(1);
    t.pending[0]();
    await expect(result).resolves.toBe(false);
  });
});
