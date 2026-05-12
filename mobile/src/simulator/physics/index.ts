// ============================================================================
// Sailing physics - public API (mobile).
//
// Mirror of the web entry at src/lib/sailing-physics/index.ts. Same surface,
// same conventions. Engine is pure TS - no React, no DOM. Safe in worklets,
// safe in node tests.
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
