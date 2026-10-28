import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Scene } from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SceneStartup, watchFirstSceneFrame } from "./SceneStartup";

beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
function fixture(waiting?: () => void) {
  const scene = new Scene(), ready = vi.fn(), before = vi.fn();
  scene.onAfterRender = before;
  const callbacks = new Map<number, FrameRequestCallback>();
  const request = vi.fn((callback: FrameRequestCallback) => { callbacks.set(callbacks.size + 1, callback); return callbacks.size; });
  const cancel = vi.fn();
  const dispose = watchFirstSceneFrame(scene, ready, request, cancel, waiting);
  const render = () => Reflect.apply(scene.onAfterRender, scene, ["renderer", "scene", "camera", null]);
  return { scene, ready, before, callbacks, request, cancel, dispose, render };
}

describe("visible startup until the first submitted scene frame", () => {
  it("observes one prolonged wait without substituting it for a submitted frame", () => {
    vi.useFakeTimers(); const waiting = vi.fn(), f = fixture(waiting);
    vi.advanceTimersByTime(14_999); expect(waiting).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1); expect(waiting).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(60_000); expect(waiting).toHaveBeenCalledOnce();
    expect(f.ready).not.toHaveBeenCalled();
    f.render(); f.callbacks.get(1)!(16); expect(f.ready).toHaveBeenCalledOnce(); f.dispose();
  });

  it.each(["render", "unmount"])("cancels the wait observation after %s", action => {
    vi.useFakeTimers(); const waiting = vi.fn(), f = fixture(waiting);
    if (action === "render") { f.render(); f.callbacks.get(1)!(16); }
    else f.dispose();
    vi.advanceTimersByTime(60_000); expect(waiting).not.toHaveBeenCalled(); f.dispose();
  });

  it("does not report ready at model mount or before a render and following animation frame", () => {
    const f = fixture();
    expect(f.ready).not.toHaveBeenCalled(); expect(f.request).not.toHaveBeenCalled();
    f.render();
    expect(f.before).toHaveBeenCalledWith("renderer", "scene", "camera", null);
    expect(f.ready).not.toHaveBeenCalled();
    expect(f.request).toHaveBeenCalledOnce();
    f.callbacks.get(1)!(16);
    expect(f.ready).toHaveBeenCalledOnce();
    f.dispose();
  });

  it("reports exactly once while preserving every existing scene render callback", () => {
    const f = fixture(); f.render(); f.render();
    expect(f.request).toHaveBeenCalledOnce();
    f.callbacks.get(1)!(16); f.render();
    expect(f.ready).toHaveBeenCalledOnce(); expect(f.before).toHaveBeenCalledTimes(3);
    f.dispose(); expect(f.scene.onAfterRender).toBe(f.before);
  });

  it("cancels a pending ready signal on unmount so a retry starts afresh", () => {
    const f = fixture(); f.render(); f.dispose();
    expect(f.cancel).toHaveBeenCalledWith(1);
    f.callbacks.get(1)!(16);
    expect(f.ready).not.toHaveBeenCalled(); expect(f.scene.onAfterRender).toBe(f.before);
    const retried = vi.fn();
    const dispose = watchFirstSceneFrame(f.scene, retried, f.request, f.cancel);
    f.render(); f.callbacks.get(2)!(32);
    expect(retried).toHaveBeenCalledOnce(); dispose();
  });

  it("shows existing localized DOM feedback before Canvas can initialize without intercepting Back", () => {
    const html = renderToStaticMarkup(<SceneStartup label="Ładowanie jachtu...">{() => <div data-testid="canvas-placeholder" />}</SceneStartup>);
    expect(html).toContain('data-scene-startup="loading"');
    expect(html).toContain('role="status"'); expect(html).toContain("Ładowanie jachtu...");
    expect(html).toContain("pointer-events-none absolute inset-0");
    expect(html).toContain('data-testid="canvas-placeholder"');
  });
});
