// ============================================================================
// Abstract 2-sail cruiser. Numbers chosen to represent a ~40 ft production
// cruiser without committing to a specific hull.
//
// Ported verbatim from web src/lib/sailing-physics/boat.ts.
// ============================================================================

import type { BoatParams } from './types';

export const DEFAULT_BOAT: BoatParams = {
  displacement: 8000,
  loa: 12.2,
  lwl: 10.5,
  mainArea: 45,
  jibArea: 30,
  mainCOP: 7.5,
  jibCOP: 4.5,
  mainMaxOff: 85,
  jibMaxOff: 55,
  jibMinOff: 5,
  gm: 1.0,
  hullDragK: 220,
  keelK: 1500,
  surgeMass: 10000,
};

export function getBoatParams(overrides: Partial<BoatParams> = {}): BoatParams {
  return { ...DEFAULT_BOAT, ...overrides };
}
