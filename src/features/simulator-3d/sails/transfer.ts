import { clamp } from "../physics/sailModel";

export type Maneuver = "sailing" | "tacking" | "gybing";
export interface RigMotion {
  /** Physical side: +1 starboard, -1 port. Also the sign of Y-up rig rotation. */
  lee: 1 | -1;
  main: number;
  jib: number;
  maneuver: Maneuver;
  elapsed: number;
}
export interface RigInput { awa: number; aws: number; mainLimit: number; jibLimit: number }
const smooth = (x: number) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };

/** Sheets limit how far a sail can open. Slack sheets cannot hold an unloaded
 * sail out against the wind: it trails the air while crossing the bow. */
function targetAngle(awa: number, limit: number, lee: number) {
  return lee * Math.min(limit, Math.max(0, Math.abs(awa) - 2));
}

export function initialRig(input: RigInput): RigMotion {
  const lee = input.awa > 0 ? -1 : 1;
  return { lee, main: targetAngle(input.awa, input.mainLimit, lee),
    jib: targetAngle(input.awa, input.jibLimit, lee), maneuver: "sailing", elapsed: 0 };
}

/** Assisted crew: remembers the tack at both wind-axis boundaries, releases
 * the old jib sheet and takes up the new one. User sheet limits are untouched.
 * Bounded angular rates/time constants are gameplay choices, not measured
 * sail inertia. A gybe crosses aft under load, never through the no-go state. */
export function advanceRig(previous: RigMotion, input: RigInput, delta: number): RigMotion {
  const dt = clamp(delta, 0, .1);
  const lateral = Math.sin(input.awa * Math.PI / 180);
  // 3-degree hysteresis avoids chatter at 0 and +/-180. No air, no auto gybe.
  const lee = input.aws > .5 && Math.abs(lateral) > Math.sin(3 * Math.PI / 180)
    ? (lateral > 0 ? -1 : 1) : previous.lee;
  const crossed = lee !== previous.lee;
  let maneuver: Maneuver = crossed ? (Math.abs(input.awa) > 90 ? "gybing" : "tacking") : previous.maneuver;
  const elapsed = crossed ? 0 : Math.min(10, previous.elapsed + dt);
  const move = (value: number, target: number, tau: number, rate: number) =>
    value + clamp((target - value) * (1 - Math.exp(-dt / tau)), -rate * dt, rate * dt);
  const mainTarget = input.aws > .5 ? targetAngle(input.awa, input.mainLimit, lee) : previous.main;
  const jibTarget = input.aws > .5 ? targetAngle(input.awa, input.jibLimit, lee) : previous.jib;
  const main = move(previous.main, mainTarget, .32, 100);
  const jib = move(previous.jib, jibTarget, .5, 75);
  if (elapsed > 1.4 && Math.abs(main - mainTarget) < 2 && Math.abs(jib - jibTarget) < 2) maneuver = "sailing";
  return { lee, main, jib, maneuver, elapsed };
}

/** Recover load only after the sail reaches the new side. The jib fills later
 * as the assisted crew takes up its new sheet. A central boom is valid when
 * hard sheeted, so angle zero must not force a port/starboard flip. */
export function transferLoad(rig: RigMotion, kind: "main" | "jib") {
  if (rig.maneuver === "sailing") return 1;
  if (rig[kind] * rig.lee < -.5) return 0;
  return smooth(rig.elapsed / (kind === "main" ? .8 : 1.4));
}

export const rigSide = (angle: number, fallback: 1 | -1): 1 | -1 =>
  Math.abs(angle) < .5 ? fallback : angle > 0 ? 1 : -1;
