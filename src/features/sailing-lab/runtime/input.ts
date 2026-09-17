import type { SessionInput } from "./session";
import { isMainTrimCommand } from "../rig/main-trim";
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const range = (value: unknown, min: number, max: number) => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

/** Current assisted model supports the normal working jib, not a manual
 * backed jib or pole. Reject unsupported configurations instead of silently
 * ignoring their side. The underlying legacy force engine remains unchanged.
 */
export function isSessionInput(value: unknown): value is SessionInput {
  if (!record(value) || !record(value.controls) || !record(value.wind) || !record(value.steering)) return false;
  const { controls, wind, steering } = value;
  if (value.mainTrim !== undefined && !isMainTrimCommand(value.mainTrim)) return false;
  if (controls.jibSide !== 1 || !["mainSheet", "jibSheet", "mainTwist", "jibTwist", "reef", "jibFurl"].every(key => range(controls[key], 0, 1))
    || (controls.mainHoisted !== undefined && typeof controls.mainHoisted !== "boolean")) return false;
  if (!range(wind.speed, 0, 60) || !range(wind.direction, 0, 360) || !["steady", "shift", "gust"].includes(String(wind.mode))) return false;
  return (steering.mode === "course-assist" && range(steering.heading, 0, 360))
    || (steering.mode === "helm" && range(steering.rudder, -1, 1) && typeof steering.lowSpeedAssist === "boolean");
}
