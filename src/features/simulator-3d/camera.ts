import { Box3, Quaternion, Vector3 } from "three";
import { FORESTAY_AXIS, sailPoint, type SailKind } from "./sails/geometry";
import type { YachtState } from "./types";

export type CameraView = "whole" | "sails" | "main" | "jib" | "stern" | "deck";

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

/** Inspect the working middle sections from the loaded side of this sail. */
export function fitSailCamera(kind: SailKind, state: YachtState, aspect: number) {
  const angle = (kind === "main" ? state.boomAngle : state.jibAngle) * Math.PI / 180;
  const side = Math.sign(angle) || 1;
  const rotation = new Quaternion().setFromAxisAngle(kind === "main" ? new Vector3(0, 1, 0) : FORESTAY_AXIS, angle);
  const origin = kind === "main" ? new Vector3(.3, 2.74, 0) : new Vector3(6.3, 1.5, 0);
  const offset = kind === "main" ? new Vector3(.1, -.04, 0) : new Vector3();
  const shape = { ...(kind === "jib" ? state.jibShape ?? state : state), reef: kind === "main" ? state.reef : 0, side, time: 0 };
  const points = [0, .5, 1].flatMap(u => [.12, .4, .7].map(v =>
    sailPoint(kind, u, v, shape, new Vector3()).add(offset).applyQuaternion(rotation).add(origin)));
  const bounds = new Box3().setFromPoints(points);
  const direction = new Vector3(-.65, .15, side).applyQuaternion(rotation);
  return fitCamera(bounds.min, bounds.max, direction, aspect, 42, 1.18, points);
}
