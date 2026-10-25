'use client';

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls } from "three-stdlib";
import { applySailingCameraPose, createSailingOrbitControls, type SailingCameraPose } from "./orbit-controls";

/** Shared direct camera manipulation. Presets fit once; live boat updates never
 * overwrite a learner's orbit or pinch. Resizing retains an adjusted view. */
export function SailingCameraRig({ poseForAspect, revision = 0, minDistance = 9, maxDistance = 240 }: {
  poseForAspect: (aspect: number) => SailingCameraPose;
  revision?: number; minDistance?: number; maxDistance?: number;
}) {
  const { camera, gl, size, get, set, invalidate } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  const adjusted = useRef(false);
  const fitted = useRef<{ pose: typeof poseForAspect; revision: number } | null>(null);
  useEffect(() => {
    const binding = createSailingOrbitControls(camera, gl.domElement);
    controls.current = binding.controls;
    const previous = get().controls;
    set({ controls: binding.controls });
    const started = () => { adjusted.current = true; };
    const changed = () => invalidate();
    binding.controls.addEventListener("start", started);
    binding.controls.addEventListener("change", changed);
    return () => {
      binding.controls.removeEventListener("start", started); binding.controls.removeEventListener("change", changed);
      if (get().controls === binding.controls) set({ controls: previous });
      controls.current = null; fitted.current = null; binding.dispose();
    };
  }, [camera, gl.domElement, get, set, invalidate]);
  useEffect(() => {
    if (!controls.current) return;
    controls.current.minDistance = minDistance; controls.current.maxDistance = maxDistance;
  }, [minDistance, maxDistance]);
  useEffect(() => {
    const orbit = controls.current;
    if (!orbit) return;
    const changed = fitted.current?.pose !== poseForAspect || fitted.current?.revision !== revision;
    if (!changed && adjusted.current) return;
    applySailingCameraPose(camera, orbit, poseForAspect(size.width / Math.max(1, size.height)));
    fitted.current = { pose: poseForAspect, revision }; adjusted.current = false;
  }, [camera, poseForAspect, revision, size.width, size.height]);
  useFrame(() => controls.current?.update());
  return null;
}
