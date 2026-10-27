'use client';

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import type { Scene } from "three";
import { reportScene } from "./SceneBoundary";
import { recordSceneLifecycle } from "./scene-diagnostics";

/** A frame callback runs before rendering. Wait for actual scene submission,
 * then defer the DOM transition to the next animation frame. */
export function watchFirstSceneFrame(scene: Pick<Scene, "onAfterRender">, ready: () => void,
  requestFrame: typeof requestAnimationFrame = requestAnimationFrame,
  cancelFrame: typeof cancelAnimationFrame = cancelAnimationFrame,
  onWaiting?: () => void) {
  const previous = scene.onAfterRender;
  let pending: number | null = null, disposed = false, completed = false;
  const waiting = onWaiting ? setTimeout(onWaiting, 15_000) : null;
  const rendered: Scene["onAfterRender"] = function (this: Scene, ...args) {
    previous.apply(this, args);
    if (disposed || completed || pending !== null) return;
    pending = requestFrame(() => {
      pending = null;
      if (disposed || completed) return;
      if (waiting !== null) clearTimeout(waiting);
      completed = true; ready();
    });
  };
  scene.onAfterRender = rendered;
  return () => {
    disposed = true;
    if (waiting !== null) clearTimeout(waiting);
    if (pending !== null) cancelFrame(pending);
    if (scene.onAfterRender === rendered) scene.onAfterRender = previous;
  };
}

/** Mount beside the yacht inside Suspense, after its model has loaded. */
export function FirstSceneFrame({ onReady }: { onReady: () => void }) {
  const { scene } = useThree();
  useEffect(() => {
    recordSceneLifecycle("model", "ready");
    recordSceneLifecycle("frame", "begin");
    return watchFirstSceneFrame(scene, () => {
      recordSceneLifecycle("frame", "ready"); onReady(); reportScene("scene-ready");
    }, requestAnimationFrame, cancelAnimationFrame, () => recordSceneLifecycle("frame", "waiting"));
  }, [scene, onReady]);
  return null;
}

/** DOM feedback also covers async renderer initialization before Canvas mounts. */
export function SceneStartup({ label, children, onReady }: { label: string; children: (ready: () => void) => ReactNode; onReady?: () => void }) {
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => { setReady(true); onReady?.(); }, [onReady]);
  return <div className="relative h-full w-full" data-scene-startup={ready ? "ready" : "loading"}>
    {children(markReady)}
    {!ready && <div role="status" className="pointer-events-none absolute inset-0 grid place-items-center bg-[var(--bg-primary)] p-5 text-center text-sm text-[var(--text-secondary)]">{label}</div>}
  </div>;
}
