import type { BoatState, Controls, BoatParams, TickResult, TickDiagnostics, ResolvedRig, TickMotion } from './types';
import { apparentWind, twaFromCompass, vmg, KN_TO_MPS, MPS_TO_KN } from './wind';
import { computeSailForce, slotMultiplier, type SailConfig } from './forces';
import { softSailAttachment } from './aero';
import { computeBalance } from './balance';
import { cruiserResistance } from './resistance';

const RHO_AIR = 1.225;
import { reefAreaFraction, jibAreaFraction } from './sail-plan';

// ============================================================================
// Single tick of the sailing-physics engine.
//
// Pure function: (state, controls, params, dt) -> { state', diagnostics }.
// No React, no DOM, no I/O.
//
// 8-step pipeline per ADR-0001:
// 1. Apparent wind from TW and boat motion.
// 2. Sail geometry from sheet + twist + reef/furl.
// 3. AoA and Cl/Cd per sail (inside computeSailForce).
// 4. Sail forces as drive + side in boat frame.
// 5. Slot multiplier on main from jib state.
// 6. Heel and leeway from moment balance.
// 7. Hull drag.
// 8. Integrate boat speed. (Heading is user input in V1.)
// ============================================================================

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

/** Construct an initial BoatState at rest (or near-rest) given a scenario. */
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

/** Compute effective sail angle off centerline from sheet tension.
 *  Sheet 0 = fully eased (max angle off), sheet 1 = hard sheeted (min angle). */
function sailAngleOff(sheet: number, minOff: number, maxOff: number): number {
  const t = Math.max(0, Math.min(1, sheet));
  return minOff + (1 - t) * (maxOff - minOff);
}

/** Effective sail area after reef/furl.
 *  A 2nd main reef on a cruiser removes ~35-40% of area, 3rd reef ~55%.
 *  Modeling curve: reef=0.5 -> 67.5% area, reef=1.0 -> 35% area. */
function effectiveArea(fullArea: number, reduction01: number): number {
  return fullArea * reefAreaFraction(reduction01);
}

/** Effective center of pressure shift when reefed. Reefing lowers the top of
 *  the sail and hence the CoP. Linear model: full reef drops CoP by 35%. */
function effectiveCop(fullCop: number, reduction01: number): number {
  const r = Math.max(0, Math.min(1, reduction01));
  return fullCop * (1 - 0.35 * r);
}

/** Tick function. Mutates nothing; returns new state + diagnostics. */
export function tick(
  state: BoatState,
  controls: Controls,
  params: BoatParams,
  dt: number,
  rig?: ResolvedRig,
  motion?: TickMotion,
): TickResult {
  const model = params.model;
  // --- Step 1: apparent wind ---
  const twa = twaFromCompass(state.trueWindDir, state.heading);
  const aw = apparentWind(
    state.trueWindSpeed,
    twa,
    state.boatSpeed,
    state.leeway,
  );
  const awsMps = aw.aws * KN_TO_MPS;

  // --- Step 2: sail geometry ---
  // On the current tack, sails default to leeward side (opposite of where wind
  // comes from). TWA > 0 => wind from starboard => sails on port (sailSide = -1).
  // TWA < 0 => wind from port => sails on starboard (sailSide = +1).
  // TWA == 0 (dead upwind) => undefined; pick -1 by convention (starboard tack).
  const mainSideSign: 1 | -1 = rig?.main.side ?? (twa > 0 ? -1 : twa < 0 ? 1 : -1);
  // Jib side: normally same as main; for wing-on-wing, opposite.
  const jibSideSign: 1 | -1 = rig?.jib.side ?? (controls.jibSide === -1
    ? (mainSideSign === 1 ? -1 : 1)
    : mainSideSign);

  const mainAngle = rig?.main.angleOff ?? sailAngleOff(controls.mainSheet, 0, params.mainMaxOff);
  const jibAngle = rig?.jib.angleOff ?? sailAngleOff(controls.jibSheet, params.jibMinOff, params.jibMaxOff);
  const mainLoad = Math.max(0, Math.min(1, rig?.main.load ?? 1));
  const jibLoad = Math.max(0, Math.min(1, rig?.jib.load ?? 1));

  const mainArea = controls.mainHoisted === false ? 0 : effectiveArea(params.mainArea, controls.reef);
  const jibArea = params.jibArea * jibAreaFraction(controls.jibFurl);

  // --- Step 3-4: compute sail forces ---
  // Jib first (we need its AoA/stall state for the slot effect on main).
  // Classic profile: an unloaded (transferring) sail simply has less area.
  // Cruiser profile (ADR-0021): it keeps its area and flogs, so a sail that
  // crosses the boat in a tack drags until the crew has it drawing again.
  const jibCfg: SailConfig = {
    area: model ? jibArea : jibArea * jibLoad,
    angleOff: jibAngle,
    side: jibSideSign,
    twist: controls.jibTwist,
    ...(model ? { attached: jibLoad } : {}),
  };
  const jibF = computeSailForce(aw.vec, awsMps, jibCfg, 1.0, model);

  // --- Step 5: slot multiplier on main Cl ---
  const slot = slotMultiplier({
    jibAoA: jibF.aoa,
    jibStalled: jibF.stalled,
    jibFurl01: controls.jibFurl,
    jibAreaEffective: jibArea * jibLoad,
    jibSide: jibSideSign,
    mainSide: mainSideSign,
  });

  const mainCfg: SailConfig = {
    area: model ? mainArea : mainArea * mainLoad,
    angleOff: mainAngle,
    side: mainSideSign,
    twist: controls.mainTwist,
    outhaulEase: rig?.main.outhaulEase,
    ...(model ? { attached: mainLoad } : {}),
  };
  // Cruiser profile (ADR-0021): a drawing jib bends the flow that reaches the
  // main toward the bow (downwash, the backwind a pinching crew sees first in
  // the main's luff). The main meets an apparent wind mainBackwindDeg finer,
  // full up to AWA 60 and gone by AWA 100, never with the jib goose-winged.
  let mainAw = aw.vec;
  if (model && model.mainBackwindDeg > 0 && jibSideSign === mainSideSign && awsMps > 1e-4) {
    const drawing = (jibArea * jibLoad / Math.max(params.jibArea, 1e-9))
      * softSailAttachment(jibF.aoa, model.luffStartDeg, model.luffFullDeg);
    const fade = Math.max(0, Math.min(1, (100 - Math.abs(aw.awa)) / 40));
    const eps = model.mainBackwindDeg * drawing * fade;
    if (eps > 0) {
      const finer = (aw.awa - Math.sign(aw.awa) * Math.min(eps, Math.abs(aw.awa))) * Math.PI / 180;
      mainAw = { x: -awsMps * Math.sin(finer), y: -awsMps * Math.cos(finer) };
    }
  }
  const mainF = computeSailForce(mainAw, awsMps, mainCfg, slot.mult, model);

  // Blanketing: at deep TWA (running downwind) with the jib on the same side
  // as the main, the main sits upwind of the jib and blocks its airflow. The
  // jib loses force. Wing-on-wing (jib on opposite side) gets clean air.
  // Model: blanket kicks in within 45 deg of dead downwind, worst at 180 deg.
  const twaFromDead = 180 - Math.abs(twa);
  if (!model) {
    if (mainArea > 0 && jibSideSign === mainSideSign && twaFromDead < 45) {
      const blanketFactor = 0.4 + 0.6 * (twaFromDead / 45);
      jibF.drive *= blanketFactor;
      jibF.side *= blanketFactor;
    }
  } else if (mainArea > 0 && jibSideSign === mainSideSign) {
    // Cruiser profile (ADR-0021): the main's wind shadow is set by the
    // apparent wind. A jib on the main's side collapses in it by AWA 170
    // (white sails have no pole), it draws fully again from AWA 140.
    const fromDead = 180 - Math.abs(aw.awa);
    const blanketFactor = Math.max(0, Math.min(1, (fromDead - 10) / 30));
    if (blanketFactor < 1) {
      const mainShare = mainArea * mainLoad / Math.max(params.mainArea, 1e-9);
      const factor = 1 - (1 - blanketFactor) * Math.min(1, mainShare);
      jibF.drive *= factor;
      jibF.side *= factor;
    }
  }

  // Heel self-limits sail force: as the rig tips over, the horizontal
  // projection of the sail area drops. Single cos(heel) captures this
  // projected-area effect (cos^2 would be too aggressive and leads to
  // under-heeling at moderate winds).
  const heelRad = Math.abs(state.heel) * Math.PI / 180;
  const heelSailFactor = Math.cos(heelRad);

  const mainSideEff = mainF.side * heelSailFactor;
  const jibSideEff = jibF.side * heelSailFactor;
  const mainDriveEff = mainF.drive * heelSailFactor;
  const jibDriveEff = jibF.drive * heelSailFactor;

  // --- Step 6: balance (heel, leeway) toward equilibrium ---
  const balance = computeBalance({
    fSideMainN: mainSideEff,
    fSideJibN: jibSideEff,
    mainCop: effectiveCop(params.mainCOP, controls.reef),
    // Roller furling narrows the jib along its full-height forestay. It does
    // not lower its head like a slab reef. Keep the reference pressure height
    // for this sectional model; area reduction already reduces the moment.
    jibCop: params.jibCOP,
    boatSpeedKn: state.boatSpeed,
    params,
  });

  // First-order relaxation toward equilibrium. Time constants: heel ~2s,
  // leeway ~4s.
  const tauHeel = 2.0;
  const tauLeeway = 4.0;
  const alphaHeel = 1 - Math.exp(-dt / tauHeel);
  const alphaLeeway = 1 - Math.exp(-dt / tauLeeway);
  const newHeel = state.heel + alphaHeel * (balance.heelEquilibrium - state.heel);
  const newLeeway = state.leeway + alphaLeeway * (balance.leewayEquilibrium - state.leeway);

  // --- Step 7: hull drag ---
  const bsMps = state.boatSpeed * KN_TO_MPS;
  const totalDriveN = mainDriveEff + jibDriveEff;
  let newBsMps: number;
  let resistanceN: number | undefined;
  if (!model) {
    // Classic profile (ADR-0001, ADR-0002): one quadratic drag and a cap.
    const hullDragN = params.hullDragK * bsMps * bsMps;

    // --- Step 8: integrate boat speed ---
    const netN = totalDriveN - hullDragN;
    const accMps2 = netN / params.surgeMass;
    newBsMps = Math.max(0, bsMps + accMps2 * dt);
    // Soft cap at hull speed * 1.25 (wave train gets large past hull speed)
    const hullSpeedKn = 1.34 * Math.sqrt(params.lwl * 3.281);
    const hullSpeedMps = hullSpeedKn * 1.25 * KN_TO_MPS;
    if (newBsMps > hullSpeedMps) newBsMps = hullSpeedMps;
  } else {
    // Cruiser profile (ADR-0021): friction plus wave making, heel, keel and
    // turning drag (resistance.ts), and the windage of hull and rig along the
    // apparent wind. No cap: the wave wall holds the boat near hull speed.
    const water = cruiserResistance({
      speedMps: bsMps,
      heelDeg: state.heel,
      sideN: mainSideEff + jibSideEff,
      leewayDeg: state.leeway,
      yawRateDegPerS: motion?.yawRateDegPerS ?? 0,
      params,
      model,
    });
    const windageDriveN = awsMps > 1e-4
      ? 0.5 * RHO_AIR * awsMps * awsMps * model.windageCdA * (aw.vec.y / awsMps)
      : 0;
    resistanceN = water.total - windageDriveN;
    // --- Step 8: integrate boat speed ---
    const accMps2 = (totalDriveN + windageDriveN - water.total) / params.surgeMass;
    newBsMps = Math.max(0, bsMps + accMps2 * dt);
  }
  const newBsKn = newBsMps * MPS_TO_KN;

  // --- Diagnostics ---
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
    ...(model ? { resistance: resistanceN, heelTarget: balance.heelEquilibrium } : {}),
  };

  const newState: BoatState = {
    ...state,
    boatSpeed: newBsKn,
    heel: newHeel,
    leeway: newLeeway,
  };

  return { state: newState, diag };
}

/** Helper: run a tick loop to steady state or for N seconds. Returns final
 *  tick result. Useful for tests and for "settle" behavior in the UI after
 *  a user input change. */
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
