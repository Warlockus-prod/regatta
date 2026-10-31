import { Vector3 } from "three";
import { fitYachtCamera } from "@/features/simulator-3d/camera";
import { NEUTRAL_YACHT, type YachtState } from "@/features/simulator-3d/types";
import type { RaceCamera } from "@/features/race-3d/pose";
import { tacticalPose, type TacticalInput } from "./camera";

/** A preset supplies the initial pose only. Every preset remains rotatable
 * and zoomable using the same controls as the trainer; "stern" (Behind) then
 * keeps following the course (ChaseCamera in RaceScene.tsx, M2-1). */
export function raceCameraPose(preset: RaceCamera, state: YachtState, aspect: number, tactical: Omit<TacticalInput, "portrait">) {
  if (preset === "stern") return chaseCameraPose(state.heading ?? 90, aspect);
  if (preset !== "high") return fitYachtCamera("whole", state, aspect);
  const pose = tacticalPose({ ...tactical, portrait: aspect < 1 });
  return { position: new Vector3(...pose.position), target: new Vector3(...pose.look), fov: pose.fov };
}

export interface ChasePose { position: Vector3; target: Vector3; fov: number }
/** A pose to fill every frame (chaseCameraPose `out`). */
export const createChasePose = (): ChasePose => ({ position: new Vector3(), target: new Vector3(), fov: 0 });

/** The stern fit for a boat heading east, kept for the last aspect (the chase asks every frame). */
let fitted: { aspect: number; fit: ReturnType<typeof fitYachtCamera> } | null = null;
const UP = new Vector3(0, 1, 0);

/**
 * The chase pose ("Behind", M2-1): the trainer's fitted stern view, turned to
 * the course `heading` (degrees, 0 = north). Always seen from the same side,
 * so a tack or a gybe does not jump the camera across the stern. `distance`
 * keeps the player's zoom: the camera stands that far from its target along
 * the same line; null keeps the fitted distance. `out` (the per-frame chase)
 * is filled and returned instead of allocating a new pose.
 */
export function chaseCameraPose(heading: number, aspect: number, distance: number | null = null, out?: ChasePose): ChasePose {
  if (!fitted || fitted.aspect !== aspect) fitted = { aspect, fit: fitYachtCamera("stern", { ...NEUTRAL_YACHT, heading: 90, boomAngle: 1 }, aspect) };
  const pose = out ?? createChasePose();
  const yaw = (90 - heading) * Math.PI / 180;
  pose.target.copy(fitted.fit.target).applyAxisAngle(UP, yaw);
  pose.position.copy(fitted.fit.position).sub(fitted.fit.target).applyAxisAngle(UP, yaw);
  if (distance !== null && Number.isFinite(distance) && distance > 0) pose.position.setLength(distance);
  pose.position.add(pose.target);
  pose.fov = fitted.fit.fov;
  return pose;
}
