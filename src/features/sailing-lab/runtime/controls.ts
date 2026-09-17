import type { Controls } from "../../../lib/sailing-physics";
import { approach, clamp } from "./math";

/** Teaching-assistant response rates, not winch speeds or real reef procedures. */
export const CONTROL_RATES: Record<keyof Controls, number> = {
  mainHoisted: Infinity, mainSheet: 0.6, jibSheet: 0.6,
  mainTwist: 0.5, jibTwist: 0.5, reef: 0.3, jibFurl: 0.4, jibSide: Infinity,
};
export function interpolateControls(live: Controls, target: Controls, dt: number): Controls {
  const move = (key: "mainSheet" | "jibSheet" | "mainTwist" | "jibTwist" | "reef" | "jibFurl") =>
    clamp(approach(live[key], target[key], CONTROL_RATES[key] * dt), 0, 1);
  return {
    mainHoisted: target.mainHoisted, mainSheet: move("mainSheet"), jibSheet: move("jibSheet"),
    mainTwist: move("mainTwist"), jibTwist: move("jibTwist"), reef: move("reef"),
    jibFurl: move("jibFurl"), jibSide: target.jibSide,
  };
}
