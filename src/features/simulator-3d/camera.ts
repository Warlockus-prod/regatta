import { Box3, Quaternion, Vector3 } from "three";
import { FORESTAY_AXIS, sailPoint, type SailKind } from "./sails/geometry";
import type { YachtState } from "./types";
import { mainsheetPath, travelerPoint } from "../sailing-lab/rig/layout";
import { toGlb } from "../sailing-lab/rig/passport";

export type CameraView = "whole" | "sails" | "main" | "jib" | "stern" | "deck" | "mainsheet";

export function fitMainsheetCamera(state: YachtState, aspect: number) {
  const trim = state.mainTrim ?? { pose: { yaw: state.boomAngle, rise: 0 }, traveler: 0 };
  const heel = state.heel * Math.PI / 180;
  const points = [...mainsheetPath(trim.pose, trim.traveler), travelerPoint(-.8), travelerPoint(.8)]
    .map(p => new Vector3(...toGlb(p)).applyAxisAngle(new Vector3(1, 0, 0), heel));
  const bounds = new Box3().setFromPoints(points).expandByScalar(.45);
  // View from inside/windward of the boom; the leeward view hides the tackle
  // behind the mainsail. Keep a little height to see the traveler track.
  return fitCamera(bounds.min, bounds.max, new Vector3(-.55, .35, -(Math.sign(state.boomAngle) || 1)), aspect, 42, 1.2);
}

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
  const shape = { ...(kind === "jib" ? state.jibShape ?? state : state), boomRise: kind === "main" ? state.mainTrim?.pose.rise : 0, reef: kind === "main" ? state.reef : 0, side, time: 0 };
  const points = [0, .5, 1].flatMap(u => [.12, .4, .7].map(v =>
    sailPoint(kind, u, v, shape, new Vector3()).add(offset).applyQuaternion(rotation).add(origin)));
  const bounds = new Box3().setFromPoints(points);
  const direction = new Vector3(-.65, .15, side).applyQuaternion(rotation);
  return fitCamera(bounds.min, bounds.max, direction, aspect, 42, 1.18, points);
}
