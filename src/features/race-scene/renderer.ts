'use client';

import type { GLProps } from "@react-three/fiber";
import * as THREE from "three/webgpu";

/** One renderer policy for racing, replay and both 3D trainers. TSL materials
 * run on WebGPU when available, with the same WebGL2 fallback on older devices. */
async function createRenderer(props: { canvas: HTMLCanvasElement | OffscreenCanvas } & Record<string, unknown>) {
  const forceWebGL = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("gl") === "webgl2";
  const renderer = new THREE.WebGPURenderer({ canvas: props.canvas as HTMLCanvasElement, antialias: true, powerPreference: "high-performance", forceWebGL });
  await renderer.init();
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

export const createSailingRenderer = createRenderer as unknown as GLProps;
