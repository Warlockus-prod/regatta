import { Vector3 } from "three";
import { fitYachtCamera } from "@/features/simulator-3d/camera";
import type { YachtState } from "@/features/simulator-3d/types";
import type { RaceCamera } from "@/features/race-3d/pose";
import { tacticalPose, type TacticalInput } from "./camera";

/** A preset supplies the initial pose only. Every preset remains rotatable
 * and zoomable using the same controls as the trainer. */
export function raceCameraPose(preset: RaceCamera, state: YachtState, aspect: number, tactical: Omit<TacticalInput, "portrait">) {
  if (preset !== "high") return fitYachtCamera(preset === "stern" ? "stern" : "whole", state, aspect);
  const pose = tacticalPose({ ...tactical, portrait: aspect < 1 });
  return { position: new Vector3(...pose.position), target: new Vector3(...pose.look), fov: pose.fov };
}
