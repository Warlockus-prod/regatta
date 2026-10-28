import { Spherical, Vector3 } from "three";
import type { AdsCamera, AdsFov } from "../../lib/ads-preview";
import { fitCamera } from "../simulator-3d/camera";
import type { SailingCameraPose } from "../simulator-3d/orbit-controls";

export type AdsCameraDirection = "left" | "right" | "up" | "down";
export interface AdsCameraCommand { readonly seq: number; readonly direction: AdsCameraDirection }
/** Fits the declared 35 degree lens even at a narrow portrait aspect. */
export const ADS_CAMERA_MAX_DISTANCE = 320;

export function adsCameraPose(view: AdsCamera, fov: AdsFov, aspect: number): SailingCameraPose {
  if (view === "deck") return { position: new Vector3(-4, 3, 2), target: new Vector3(18, 4, 0), fov };
  const direction = view === "high" ? new Vector3(.08, 1, .08) : view === "stern" ? new Vector3(-1, .22, .1) : new Vector3(-.65, .4, .9);
  return { ...fitCamera(new Vector3(-23, 0, -18), new Vector3(23, 21, 18), direction, aspect, fov, 1.08), fov };
}

/** Real camera geometry, shared by buttons and tested independently of WebGL. */
export function rotateAdsCamera(position: Vector3, target: Vector3, direction: AdsCameraDirection): Vector3 {
  const spherical = new Spherical().setFromVector3(position.clone().sub(target));
  const step = Math.PI / 12;
  if (direction === "left") spherical.theta -= step;
  if (direction === "right") spherical.theta += step;
  if (direction === "up") spherical.phi -= step;
  if (direction === "down") spherical.phi += step;
  spherical.phi = Math.max(.06, Math.min(Math.PI / 2.04, spherical.phi));
  return new Vector3().setFromSpherical(spherical).add(target);
}
