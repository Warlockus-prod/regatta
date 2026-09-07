import { Vector3 } from "three";

export type CameraView = "whole" | "sails" | "deck";

/** Fit the projected corners, including depth, instead of guessing a distance. */
export function fitCamera(
  min: Vector3, max: Vector3, direction: Vector3, aspect: number, fov: number,
  padding = 1.18,
  points?: Vector3[],
) {
  const target = min.clone().add(max).multiplyScalar(0.5);
  const forward = direction.clone().normalize();
  const worldUp = Math.abs(forward.y) > 0.999 ? new Vector3(0, 0, -1) : new Vector3(0, 1, 0);
  const right = new Vector3().crossVectors(worldUp, forward).normalize();
  const up = new Vector3().crossVectors(forward, right).normalize();
  const tanV = Math.tan(fov * Math.PI / 360);
  const tanH = tanV * Math.max(0.2, aspect);
  let distance = 1;
  const corners = points ?? [min.x, max.x].flatMap((x) => [min.y, max.y].flatMap((y) => [min.z, max.z].map((z) => new Vector3(x, y, z))));
  for (const corner of corners) {
    const point = corner.clone().sub(target);
    distance = Math.max(distance,
      Math.abs(point.dot(right)) * padding / tanH + point.dot(forward),
      Math.abs(point.dot(up)) * padding / tanV + point.dot(forward));
  }
  return { target, position: forward.multiplyScalar(distance).add(target) };
}
