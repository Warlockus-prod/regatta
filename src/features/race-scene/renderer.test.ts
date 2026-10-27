import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSailingRenderer } from "./renderer";

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
