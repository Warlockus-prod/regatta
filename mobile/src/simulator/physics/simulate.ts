// ============================================================================
// Single tick of the sailing-physics engine.
//
// Pure function: (state, controls, params, dt) -> { state', diagnostics }.
// No React, no DOM, no I/O.
//
// Ported verbatim from web src/lib/sailing-physics/simulate.ts.
// ============================================================================

import type { BoatState, Controls, BoatParams, TickResult, TickDiagnostics } from './types';
import { apparentWind, twaFromCompass, vmg, KN_TO_MPS, MPS_TO_KN } from './wind';
import { computeSailForce, slotMultiplier, type SailConfig } from './forces';
import { computeBalance } from './balance';

export interface InitArgs {
  /** True wind speed, knots. */
  tws: number;
  /** Signed TWA in degrees. If provided, heading is chosen so that
   *  (trueWindDir - heading) = twa. */
  twa?: number;
  /** True wind from-direction in compass degrees. Alternative to twa. */
  trueWindDir?: number;
  /** Heading in compass degrees. Default 0. */
  heading?: number;
  /** Initial boat speed, knots. Default 2 so starts are not at zero. */
  boatSpeed?: number;
}

export function createInitialState(args: InitArgs): BoatState {
  const heading = args.heading ?? 0;
  let trueWindDir: number;
  if (typeof args.twa === 'number') {
    trueWindDir = (heading + args.twa + 360) % 360;
  } else {
    trueWindDir = args.trueWindDir ?? 0;
  }
  return {
    trueWindDir,
    trueWindSpeed: args.tws,
    heading,
    boatSpeed: args.boatSpeed ?? 2,
    heel: 0,
    leeway: 0,
  };
}

function sailAngleOff(sheet: number, minOff: number, maxOff: number): number {
  const t = Math.max(0, Math.min(1, sheet));
  return minOff + (1 - t) * (maxOff - minOff);
}

function effectiveArea(fullArea: number, reduction01: number): number {
  const r = Math.max(0, Math.min(1, reduction01));
  return fullArea * (1 - 0.65 * r);
}

function effectiveCop(fullCop: number, reduction01: number): number {
  const r = Math.max(0, Math.min(1, reduction01));
  return fullCop * (1 - 0.35 * r);
}

export function tick(
  state: BoatState,
  controls: Controls,
  params: BoatParams,
  dt: number,
): TickResult {
  const twa = twaFromCompass(state.trueWindDir, state.heading);
  const aw = apparentWind(
    state.trueWindSpeed,
    twa,
    state.boatSpeed,
    state.leeway,
  );
  const awsMps = aw.aws * KN_TO_MPS;

  const mainSideSign: 1 | -1 = twa > 0 ? -1 : twa < 0 ? 1 : -1;
  const jibSideSign: 1 | -1 = controls.jibSide === -1
    ? (mainSideSign === 1 ? -1 : 1)
    : mainSideSign;

  const mainAngle = sailAngleOff(controls.mainSheet, 0, params.mainMaxOff);
  const jibAngle = sailAngleOff(controls.jibSheet, params.jibMinOff, params.jibMaxOff);

  const mainArea = effectiveArea(params.mainArea, controls.reef);
  const jibArea = effectiveArea(params.jibArea, controls.jibFurl);

  const jibCfg: SailConfig = {
    area: jibArea,
    angleOff: jibAngle,
    side: jibSideSign,
    twist: controls.jibTwist,
  };
  const jibF = computeSailForce(aw.vec, awsMps, jibCfg, 1.0);

  const slot = slotMultiplier({
    jibAoA: jibF.aoa,
    jibStalled: jibF.stalled,
    jibFurl01: controls.jibFurl,
    jibAreaEffective: jibArea,
    jibSide: jibSideSign,
    mainSide: mainSideSign,
  });

  const mainCfg: SailConfig = {
    area: mainArea,
    angleOff: mainAngle,
    side: mainSideSign,
    twist: controls.mainTwist,
  };
  const mainF = computeSailForce(aw.vec, awsMps, mainCfg, slot.mult);

  const twaFromDead = 180 - Math.abs(twa);
  if (jibSideSign === mainSideSign && twaFromDead < 45) {
    const blanketFactor = 0.4 + 0.6 * (twaFromDead / 45);
    jibF.drive *= blanketFactor;
    jibF.side *= blanketFactor;
  }

  const heelRad = Math.abs(state.heel) * Math.PI / 180;
  const heelSailFactor = Math.cos(heelRad);

  const mainSideEff = mainF.side * heelSailFactor;
  const jibSideEff = jibF.side * heelSailFactor;
  const mainDriveEff = mainF.drive * heelSailFactor;
  const jibDriveEff = jibF.drive * heelSailFactor;

  const balance = computeBalance({
    fSideMainN: mainSideEff,
    fSideJibN: jibSideEff,
    mainCop: effectiveCop(params.mainCOP, controls.reef),
    jibCop: effectiveCop(params.jibCOP, controls.jibFurl),
    boatSpeedKn: state.boatSpeed,
    params,
  });

  const tauHeel = 2.0;
  const tauLeeway = 4.0;
  const alphaHeel = 1 - Math.exp(-dt / tauHeel);
  const alphaLeeway = 1 - Math.exp(-dt / tauLeeway);
  const newHeel = state.heel + alphaHeel * (balance.heelEquilibrium - state.heel);
  const newLeeway = state.leeway + alphaLeeway * (balance.leewayEquilibrium - state.leeway);

  const bsMps = state.boatSpeed * KN_TO_MPS;
  const hullDragN = params.hullDragK * bsMps * bsMps;

  const totalDriveN = mainDriveEff + jibDriveEff;
  const netN = totalDriveN - hullDragN;
  const accMps2 = netN / params.surgeMass;
  let newBsMps = Math.max(0, bsMps + accMps2 * dt);
  const hullSpeedKn = 1.34 * Math.sqrt(params.lwl * 3.281);
  const hullSpeedMps = hullSpeedKn * 1.25 * KN_TO_MPS;
  if (newBsMps > hullSpeedMps) newBsMps = hullSpeedMps;
  const newBsKn = newBsMps * MPS_TO_KN;

  const diag: TickDiagnostics = {
    aws: aw.aws,
    awa: aw.awa,
    mainAoA: mainF.aoa,
    jibAoA: jibF.aoa,
    mainStalled: mainF.stalled,
    jibStalled: jibF.stalled,
    slotHealth: slot.health,
    drive: totalDriveN,
    side: mainF.side + jibF.side,
    vmg: vmg(newBsKn, twa),
  };

  const newState: BoatState = {
    ...state,
    boatSpeed: newBsKn,
    heel: newHeel,
    leeway: newLeeway,
  };

  return { state: newState, diag };
}

export function settle(
  state: BoatState,
  controls: Controls,
  params: BoatParams,
  seconds: number,
  dt = 0.1,
): TickResult {
  let s = state;
  let result: TickResult = { state: s, diag: {} as TickDiagnostics };
  const steps = Math.ceil(seconds / dt);
  for (let i = 0; i < steps; i++) {
    result = tick(s, controls, params, dt);
    s = result.state;
  }
  return result;
}
