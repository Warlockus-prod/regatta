'use client';

import type { GLProps } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import type { RenderBackend } from "@/lib/diagnostics";
import { recordSceneLifecycle } from "@/features/simulator-3d/scene-diagnostics";
import { recordGpuEvent } from "./gpu-loss";

export interface SailingRendererOptions {
  /** Skip WebGPU, as after a lost device. `?gl=webgl2` forces it too. */
  forceWebGL?: boolean;
  /** The device or context of this renderer was lost; three has already stopped rendering. */
  onLost?: (backend: RenderBackend) => void;
}

/** The backend a renderer actually runs on (WebGPU, or its WebGL2 fallback). */
export function rendererBackend(renderer: unknown): RenderBackend {
  return (renderer as { backend?: { isWebGPUBackend?: boolean } } | null)?.backend?.isWebGPUBackend ? "webgpu" : "webgl2";
}

/** One renderer policy for racing, replay and both 3D trainers. TSL materials
 * run on WebGPU when available, with the same WebGL2 fallback on older devices. */
async function createRenderer(props: { canvas: HTMLCanvasElement | OffscreenCanvas } & Record<string, unknown>, options: SailingRendererOptions) {
  const forceWebGL = options.forceWebGL === true || (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("gl") === "webgl2");
  const viewport = () => "clientWidth" in props.canvas ? props.canvas.clientWidth > 0 && props.canvas.clientHeight > 0 ? "sized" as const : "empty" as const : undefined;
  recordSceneLifecycle("renderer", "begin", viewport());
  let renderer: THREE.WebGPURenderer;
  try {
    renderer = new THREE.WebGPURenderer({ canvas: props.canvas as HTMLCanvasElement, antialias: true, powerPreference: "high-performance", forceWebGL });
    // The backend reads this callback when the loss happens, so it is set before init.
    const stop = renderer.onDeviceLost;
    renderer.onDeviceLost = (info) => {
      if (typeof stop === "function") stop.call(renderer, info);
      const backend: RenderBackend = info?.api === "WebGPU" ? "webgpu" : "webgl2";
      recordGpuEvent("lost", backend);
      try { options.onLost?.(backend); } catch { /* A recovery failure cannot escape a driver callback. */ }
    };
    await renderer.init();
  } catch (error) {
    recordSceneLifecycle("renderer", "error", viewport());
    throw error;
  }
  recordSceneLifecycle("renderer", "ready", viewport());
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

/** A Canvas `gl` factory. Options are fixed per canvas: remount it to change them. */
export function sailingRenderer(options: SailingRendererOptions = {}): GLProps {
  return ((props: { canvas: HTMLCanvasElement | OffscreenCanvas } & Record<string, unknown>) => createRenderer(props, options)) as unknown as GLProps;
}

export const createSailingRenderer = sailingRenderer();

/** Longest the loading screen waits for shader warm-up; the first frame compiles whatever is left. */
export const WARMUP_MAX_MS = 4000;

type Compiler = { compileAsync?: (scene: unknown, camera: unknown) => Promise<unknown> };

/**
 * M2-7: compile every pipeline the first frame will need while the loading
 * screen still covers the scene, so the race does not open on a stalled
 * frame. Resolves true when compiled, false when the renderer cannot, fails
 * or takes longer than `maxMs`; it never rejects, so startup cannot hang on it.
 */
export function warmUpShaders(gl: unknown, scene: unknown, camera: unknown, maxMs = WARMUP_MAX_MS,
  // Wrapped, not `{ set: setTimeout }`: a browser throws "Illegal invocation"
  // when setTimeout is called as a method of another object.
  timers: { set: typeof setTimeout; clear: typeof clearTimeout } = {
    set: ((fn: () => void, ms?: number) => setTimeout(fn, ms)) as typeof setTimeout,
    clear: ((id?: ReturnType<typeof setTimeout>) => clearTimeout(id)) as typeof clearTimeout,
  }): Promise<boolean> {
  const compile = (gl as Compiler | null)?.compileAsync;
  if (typeof compile !== "function") return Promise.resolve(false);
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const done = (ok: boolean) => { if (settled) return; settled = true; timers.clear(timer); resolve(ok); };
    const timer = timers.set(() => done(false), maxMs);
    try {
      Promise.resolve(compile.call(gl, scene, camera)).then(() => done(true), () => done(false));
    } catch {
      done(false);
    }
  });
}
