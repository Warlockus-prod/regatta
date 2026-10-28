'use client';

import { useEffect, useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls } from "three-stdlib";
import type { AdsCamera, AdsFov } from "../../lib/ads-preview";
import { applySailingCameraPose, createSailingOrbitControls } from "../simulator-3d/orbit-controls";
import { ADS_CAMERA_MAX_DISTANCE, adsCameraPose, rotateAdsCamera, type AdsCameraCommand } from "./camera";

export function AdsCameraRig({ view, fov, reset, command, onOrbit }: {
  view: AdsCamera; fov: AdsFov; reset: number; command: AdsCameraCommand | null; onOrbit: (outcome: "accepted" | "noop") => void;
}) {
  const { camera, gl, size, invalidate } = useThree();
  const controls = useRef<OrbitControls | null>(null);
  const changed = useRef(false);
  const fitted = useRef("");
  const lastCommand = useRef(command?.seq ?? 0);
  const report = useRef(onOrbit);
  useLayoutEffect(() => { report.current = onOrbit; }, [onOrbit]);
  useEffect(() => {
    const binding = createSailingOrbitControls(camera, gl.domElement);
    const orbit = binding.controls; controls.current = orbit;
    orbit.minDistance = 2; orbit.maxDistance = ADS_CAMERA_MAX_DISTANCE;
    let started = camera.position.clone(), startedTarget = orbit.target.clone(), startedZoom = camera.zoom;
    const start = () => { changed.current = true; started = camera.position.clone(); startedTarget = orbit.target.clone(); startedZoom = camera.zoom; };
    const end = () => report.current(camera.position.distanceToSquared(started) + orbit.target.distanceToSquared(startedTarget) > 1e-10 || camera.zoom !== startedZoom ? "accepted" : "noop");
    const repaint = () => invalidate();
    orbit.addEventListener("start", start); orbit.addEventListener("end", end); orbit.addEventListener("change", repaint);
    return () => {
      orbit.removeEventListener("start", start); orbit.removeEventListener("end", end); orbit.removeEventListener("change", repaint);
      controls.current = null; fitted.current = ""; binding.dispose();
    };
  }, [camera, gl.domElement, invalidate]);
  useEffect(() => {
    const orbit = controls.current; if (!orbit) return;
    const key = `${view}:${fov}:${reset}`;
    if (fitted.current === key && changed.current) return;
    applySailingCameraPose(camera, orbit, adsCameraPose(view, fov, size.width / Math.max(1, size.height)));
    fitted.current = key; changed.current = false;
  }, [camera, view, fov, reset, size.width, size.height]);
  useEffect(() => {
    const orbit = controls.current;
    if (!orbit || !command || command.seq === lastCommand.current) return;
    lastCommand.current = command.seq;
    const position = rotateAdsCamera(camera.position, orbit.target, command.direction);
    const moved = position.distanceToSquared(camera.position) > 1e-10;
    applySailingCameraPose(camera, orbit, { position, target: orbit.target.clone(), fov });
    changed.current = true;
    report.current(moved ? "accepted" : "noop");
  }, [camera, command, fov]);
  useFrame(() => controls.current?.update());
  return null;
}
