import { beforeEach, describe, expect, it, vi } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import type { OrbitControls } from "three-stdlib";

// Retain real rig effects/ref slots across renders while exercising the actual
// Three controls and camera. Only the React/R3F host is replaced, not the rig.
const hooks = vi.hoisted(() => ({
  cursor: 0, slots: [] as unknown[], effects: [] as (() => void)[], frames: [] as (() => void)[],
  host: null as unknown,
}));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useRef: (initial: unknown) => {
    const slot = hooks.cursor++;
    if (!(slot in hooks.slots)) hooks.slots[slot] = { current: initial };
    return hooks.slots[slot];
  },
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => {
    const slot = hooks.cursor++;
    const previous = hooks.slots[slot] as { deps: unknown[]; cleanup?: () => void } | undefined;
    if (previous && deps.every((value, i) => Object.is(value, previous.deps[i]))) return;
    hooks.effects.push(() => {
      previous?.cleanup?.();
      hooks.slots[slot] = { deps, cleanup: effect() };
    });
  },
}));
vi.mock("@react-three/fiber", () => ({
  useThree: () => hooks.host,
  useFrame: (frame: () => void) => hooks.frames.push(frame),
}));
import { SailingCameraRig } from "./SailingCameraRig";

class TestCanvas extends EventTarget {
  ownerDocument = new EventTarget();
  style = { touchAction: "", cursor: "" };
  clientWidth = 600;
  clientHeight = 400;
  releasePointerCapture() {}
  setPointerCapture() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; }
}
const pointer = (type: string, x: number, y: number) => Object.assign(new Event(type, { cancelable: true }), {
  pointerType: "touch", pointerId: 1, pageX: x, pageY: y, clientX: x, clientY: y, button: 0,
});
function fixture() {
  const canvas = new TestCanvas();
  const camera = new PerspectiveCamera(58, 1.5, .5, 4200);
  const state: { controls?: OrbitControls } = {};
  const host = {
    camera, gl: { domElement: canvas }, size: { width: 600, height: 400 },
    get: () => state, set: (next: typeof state) => Object.assign(state, next), invalidate: vi.fn(),
  };
  hooks.host = host;
  const pose = vi.fn(() => ({ position: new Vector3(30, 20, 35), target: new Vector3(0, 10, 0), fov: 42 }));
  const render = (revision = 0, selected = pose) => {
    hooks.cursor = 0; hooks.effects = []; hooks.frames = [];
    SailingCameraRig({ poseForAspect: selected, revision });
    hooks.effects.forEach(run => run());
  };
  const frames = () => { for (let frame = 0; frame < 600; frame++) hooks.frames.forEach(run => run()); };
  const cleanup = () => {
    for (const slot of hooks.slots) (slot as { cleanup?: () => void } | undefined)?.cleanup?.();
  };
  return { canvas, camera, state, host, pose, render, frames, cleanup };
}
beforeEach(() => { hooks.cursor = 0; hooks.slots = []; hooks.effects = []; hooks.frames = []; });

describe("shared camera rig lifecycle", () => {
  it("keeps an actual dragged camera through physics frames, HUD rerenders and dock resize", () => {
    const f = fixture(); f.render();
    expect(f.pose).toHaveBeenCalledExactlyOnceWith(1.5);
    f.canvas.dispatchEvent(pointer("pointerdown", 150, 100));
    f.canvas.ownerDocument.dispatchEvent(pointer("pointermove", 300, 140));
    f.canvas.ownerDocument.dispatchEvent(pointer("pointerup", 300, 140));
    f.frames();
    const adjusted = f.camera.position.clone();
    expect(adjusted.distanceTo(f.pose.mock.results[0].value.position)).toBeGreaterThan(10);
    f.render(); f.frames();
    f.host.size = { width: 390, height: 700 };
    f.render(); f.frames();
    expect(f.pose).toHaveBeenCalledTimes(1);
    expect(f.camera.position.distanceTo(adjusted)).toBeLessThan(1e-9);
    expect(f.camera.fov).toBe(42);
    f.cleanup();
  });

  it("refits only on explicit reset or preset change and disposes the registered controls", () => {
    const f = fixture(); f.render();
    const controls = f.state.controls;
    f.canvas.dispatchEvent(pointer("pointerdown", 150, 100));
    f.canvas.ownerDocument.dispatchEvent(pointer("pointermove", 300, 140));
    f.canvas.ownerDocument.dispatchEvent(pointer("pointerup", 300, 140));
    f.render(1); f.frames();
    expect(f.pose).toHaveBeenCalledTimes(2);
    expect(f.camera.position.distanceTo(f.pose.mock.results[1].value.position)).toBeLessThan(1e-9);
    const preset = vi.fn(() => ({ position: new Vector3(-20, 25, 40), target: new Vector3(0, 8, 0), fov: 42 }));
    f.render(1, preset); f.frames();
    expect(preset).toHaveBeenCalledExactlyOnceWith(1.5);
    expect(f.camera.position.distanceTo(preset.mock.results[0].value.position)).toBeLessThan(1e-9);
    expect(f.state.controls).toBe(controls);
    f.cleanup();
    expect(f.state.controls).toBeUndefined();
    const disposed = f.camera.position.clone();
    f.canvas.dispatchEvent(pointer("pointerdown", 150, 100));
    f.canvas.ownerDocument.dispatchEvent(pointer("pointermove", 300, 140));
    expect(f.camera.position.toArray()).toEqual(disposed.toArray());
  });
});
