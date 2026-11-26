'use client';

import { useEffect, useLayoutEffect, useState, type ComponentProps } from "react";
import { useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import { STAGE_EVENT, parseStageWindow, stageViewOffset, type StageWindow } from "../trainer-controls/stage";
import { SailingCameraRig } from "./SailingCameraRig";

const stageOf = (canvas: unknown): HTMLElement | null => {
  const element = canvas as { closest?: (selector: string) => Element | null } | null;
  return typeof element?.closest === "function" ? element.closest("[data-trainer-stage]") as HTMLElement | null : null;
};

/**
 * Package 32 stage B: the free window of the phone workspace this canvas is
 * painted under (trainer-controls/SceneStage), or null when the canvas is the
 * whole scene (desktop, tests).
 */
export function useStageWindow(): StageWindow | null {
  const canvas = useThree(state => state.gl?.domElement);
  const [free, setFree] = useState<StageWindow | null>(() => parseStageWindow(stageOf(canvas)?.dataset.window));
  useEffect(() => {
    const stage = stageOf(canvas);
    if (!stage) return;
    const read = () => setFree(current => {
      const next = parseStageWindow(stage.dataset.window);
      return current && next && current.left === next.left && current.top === next.top && current.width === next.width && current.height === next.height ? current : next;
    });
    read();
    stage.addEventListener(STAGE_EVENT, read);
    return () => stage.removeEventListener(STAGE_EVENT, read);
  }, [canvas]);
  return free;
}

/** Shifts the camera's view so its centre is the middle of the free window while the canvas covers the stage. */
export function StageView() {
  const camera = useThree(state => state.camera) as PerspectiveCamera;
  const width = useThree(state => state.size.width);
  const height = useThree(state => state.size.height);
  const invalidate = useThree(state => state.invalidate);
  const free = useStageWindow();
  useLayoutEffect(() => {
    if (typeof camera.setViewOffset !== "function") return;
    const view = stageViewOffset({ width, height }, free);
    if (view) camera.setViewOffset(view.fullWidth, view.fullHeight, view.x, view.y, view.width, view.height);
    else if (camera.view?.enabled) camera.clearViewOffset();
    invalidate();
    return () => { if (camera.view?.enabled) camera.clearViewOffset(); };
  }, [camera, width, height, free, invalidate]);
  return null;
}

/** The shared camera rig, fitted to the free window when the canvas is a phone stage. */
export function StageCameraRig(props: Omit<ComponentProps<typeof SailingCameraRig>, "stage">) {
  return <SailingCameraRig {...props} stage={useStageWindow()} />;
}
