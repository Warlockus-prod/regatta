import { getBoatParams, settle, NO_GO_HALF_DEG, type BoatState as EngineState, type Controls as EngineControls } from "@/lib/sailing-physics";
import { clamp, optimalBoomAngle, optimalJibAngle } from "./sailModel";
const PARAMS = getBoatParams();
/** Near-optimal ENGINE controls for a given apparent wind angle: sheet so the
 * boom/jib sit at their optimal angles (sailModel's boom-angle optimum). */
function optimalEngineControls(awaAbs: number, reef: number): EngineControls {
  const mainSheet = clamp(1 - optimalBoomAngle(awaAbs) / PARAMS.mainMaxOff, 0, 1);
  const jibRange = PARAMS.jibMaxOff - PARAMS.jibMinOff;
  const jibSheet = clamp(1 - (optimalJibAngle(awaAbs) - PARAMS.jibMinOff) / jibRange, 0, 1);
  return { mainSheet, jibSheet, mainTwist: 0.35, jibTwist: 0.4, reef, jibFurl: 0, jibSide: 1 };
}

/** Settled boat speed at |TWA| under optimal trim (two-pass: trim to the
 * apparent wind the first pass discovers). */
function settledOptimalSpeed(twaAbs: number, twsKn: number, reef: number): number {
  const state: EngineState = {
    trueWindDir: 0,
    trueWindSpeed: twsKn,
    heading: twaAbs,
    boatSpeed: 3,
    heel: 0,
    leeway: 0,
  };
  const pass1 = settle(state, optimalEngineControls(twaAbs * 0.8, reef), PARAMS, 4);
  const pass2 = settle(pass1.state, optimalEngineControls(Math.abs(pass1.diag.awa), reef), PARAMS, 5);
  return pass2.state.boatSpeed;
}

/** Best-VMG angles for a wind speed, from the engine itself (not a lookup). */
function solveVmgTargets(twsKn: number, reef: number): { up: number; down: number } {
  let up = 48;
  let bestUp = -Infinity;
  for (let a = NO_GO_HALF_DEG + 1; a <= 75; a += 2) {
    const v = settledOptimalSpeed(a, twsKn, reef) * Math.cos((a * Math.PI) / 180);
    if (v > bestUp) {
      bestUp = v;
      up = a;
    }
  }
  let down = 155;
  let bestDown = -Infinity;
  // Cap the scan at 165: beyond that the engine's drag-driven run is nearly
  // flat, so cos() alone would push the answer to ~173 - deeper than the
  // reference polar (best downwind VMG 150-165 for this cruiser) teaches.
  for (let a = 125; a <= 165; a += 3) {
    const v = settledOptimalSpeed(a, twsKn, reef) * -Math.cos((a * Math.PI) / 180);
    if (v > bestDown) {
      bestDown = v;
      down = a;
    }
  }
  return { up, down };
}


/** Cache costly solves by all inputs which affect the target. */
export function createTargetSolver() {
  let targetKey = "";
  let windKey = "";
  let target = 0;
  let angles = { up: 48, down: 155 };
  return (twaAbs: number, twsKn: number, reef: number) => {
    const nextWindKey = `${twsKn}:${reef}`;
    const nextTargetKey = `${Math.round(twaAbs / 4)}:${nextWindKey}:${twaAbs < NO_GO_HALF_DEG}`;
    if (windKey !== nextWindKey) {
      angles = solveVmgTargets(twsKn, reef);
      windKey = nextWindKey;
    }
    if (targetKey !== nextTargetKey) {
      target = twaAbs < NO_GO_HALF_DEG ? 0 : settledOptimalSpeed(twaAbs, twsKn, reef);
      targetKey = nextTargetKey;
    }
    return { target, vmgUp: angles.up, vmgDown: angles.down };
  };
}
