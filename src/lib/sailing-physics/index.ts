// ============================================================================
// Sailing physics - public API.
//
// See DECISIONS.md ADR-0001 for the "why" and the verification contract.
// See simulate.ts for the tick pipeline and the main entry point.
//
// Quick start:
//   import { createInitialState, tick, settle, getBoatParams } from '@/lib/sailing-physics';
//   const params = getBoatParams();
//   let state = createInitialState({ tws: 12, twa: 90 });
//   const controls = {
//     mainSheet: 0.4, jibSheet: 0.2,
//     mainTwist: 0.1, jibTwist: 0.1,
//     reef: 0, jibFurl: 0,
//     jibSide: 1,
//   };
//   const { state: next, diag } = tick(state, controls, params, dt);
//
// The engine is a pure function of (state, controls, params, dt). No React,
// no DOM, no I/O. Safe to run in the browser, in Node, or on the multiplayer
// server.
// ============================================================================

export type {
  BoatState,
  BoatParams,
  Controls,
  TickDiagnostics,
  TickResult,
} from './types';

export { DEFAULT_BOAT, getBoatParams } from './boat';
export {
  createInitialState,
  tick,
  settle,
  type InitArgs,
} from './simulate';
export {
  KN_TO_MPS,
  MPS_TO_KN,
  DEG_TO_RAD,
  RAD_TO_DEG,
  apparentWind,
  twaFromCompass,
  vmg,
} from './wind';
export {
  velocityOverGround,
  type Current,
  type OverGround,
} from './current';
