import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseDiagnosticBatch } from "@/lib/diagnostics";
import { INITIAL_GPU_RECOVERY, afterGpuLoss, afterGpuRetry, recordGpuEvent } from "./gpu-loss";
import { sailingRenderer, rendererBackend } from "./renderer";

const { record, construct, defaultLost } = vi.hoisted(() => ({ record: vi.fn(), construct: vi.fn(), defaultLost: vi.fn() }));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: record }));
vi.mock("@/features/simulator-3d/scene-diagnostics", () => ({ recordSceneLifecycle: vi.fn() }));
vi.mock("three/webgpu", () => ({
  WebGPURenderer: class {
    onDeviceLost = defaultLost;
    backend = { isWebGPUBackend: true };
    init = vi.fn(async () => {});
    constructor(options: unknown) { construct(options); }
  },
  AgXToneMapping: "AgX", SRGBColorSpace: "sRGB",
}));
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("window", { location: { pathname: "/game", search: "" } }); });
afterEach(() => vi.unstubAllGlobals());

type Lost = (info: { api: "WebGPU" | "WebGL"; message: string; reason: string | null; originalEvent: unknown }) => void;
const create = (options: Parameters<typeof sailingRenderer>[0]) =>
  (sailingRenderer(options) as unknown as (props: { canvas: HTMLCanvasElement }) => Promise<{ onDeviceLost: Lost }>)({ canvas: {} as HTMLCanvasElement });

describe("lost GPU device recovery", () => {
  it("retries exactly once on WebGL2, then fails, and never loops on its own", () => {
    const retry = afterGpuLoss(INITIAL_GPU_RECOVERY, 0);
    expect(retry).toEqual({ generation: 1, forceWebGL: true, failed: false });
    const failed = afterGpuLoss(retry, 1);
    expect(failed).toEqual({ generation: 1, forceWebGL: true, failed: true });
    // Further reports, from this or an older canvas, change nothing.
    expect(afterGpuLoss(failed, 1)).toBe(failed);
    expect(afterGpuLoss(retry, 0)).toBe(retry);
    // Only the failure screen's button mounts a new canvas, still on WebGL2.
    const again = afterGpuRetry(failed);
    expect(again).toEqual({ generation: 2, forceWebGL: true, failed: false });
    expect(afterGpuLoss(again, 2).failed).toBe(true);
    expect(afterGpuRetry(retry)).toBe(retry);
  });

  it("records the loss with fixed identifiers only, valid against the journal schema", () => {
    vi.stubGlobal("window", { location: { pathname: "/private/sailing.html" }, __REGATTA_EMBED__: { path: "/game" } });
    recordGpuEvent("lost", "webgpu");
    recordGpuEvent("retry", "webgpu", 1);
    recordGpuEvent("failed", "webgl2", 1);
    const events = record.mock.calls.map(([event]) => event);
    expect(parseDiagnosticBatch({ version: 1, events })?.events).toEqual(events);
    expect(events.map(e => [e.type, e.action, e.backend, e.outcome, e.surface])).toEqual([
      ["scene.gpu", "lost", "webgpu", "failed", "race"], ["scene.gpu", "retry", "webgpu", "accepted", "race"], ["scene.gpu", "failed", "webgl2", "failed", "race"]]);
    expect(JSON.stringify(events)).not.toMatch(/private|sailing/);
  });

  it("keeps three's own stop, journals the loss and reports the backend to the scene", async () => {
    const onLost = vi.fn();
    const renderer = await create({ onLost });
    renderer.onDeviceLost({ api: "WebGPU", message: "driver detail", reason: "unknown", originalEvent: {} });
    expect(defaultLost).toHaveBeenCalledTimes(1);
    expect(onLost).toHaveBeenCalledWith("webgpu");
    renderer.onDeviceLost({ api: "WebGL", message: "driver detail", reason: null, originalEvent: {} });
    expect(onLost).toHaveBeenLastCalledWith("webgl2");
    expect(record.mock.calls.map(([event]) => [event.action, event.backend])).toEqual([["lost", "webgpu"], ["lost", "webgl2"]]);
    expect(JSON.stringify(record.mock.calls)).not.toContain("driver detail");
  });

  it("forces the WebGL2 backend on the retry and survives a throwing recovery", async () => {
    const renderer = await create({ forceWebGL: true, onLost: () => { throw new Error("boom"); } });
    expect(construct.mock.calls[0][0]).toMatchObject({ forceWebGL: true });
    expect(() => renderer.onDeviceLost({ api: "WebGL", message: "", reason: null, originalEvent: {} })).not.toThrow();
    expect(rendererBackend(renderer)).toBe("webgpu");
    expect(rendererBackend({ backend: {} })).toBe("webgl2");
  });
});
