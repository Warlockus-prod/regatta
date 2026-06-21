// ============================================================================
// Aerodynamic coefficients for a sail modeled as a simple flat airfoil.
//
// These curves are deliberately simple: piecewise-linear with an explicit
// stall region. The goal is the shape (peak -> stall -> drag-dominated flat
// plate), not numerical fidelity.
//
// AoA input is the absolute angle between sail chord and apparent-wind flow
// direction, in degrees. Range [0, 180].
//
// Ported verbatim from web src/lib/sailing-physics/aero.ts.
// ============================================================================

/** Lift coefficient as a function of angle of attack (degrees). */
export function sailCl(aoaDeg: number, peakCl = 1.5): number {
  const a = Math.abs(aoaDeg);
  if (a < 3) return a / 3 * 0.4;
  if (a < 12) return 0.4 + (a - 3) / 9 * (peakCl - 0.4);
  if (a < 18) return peakCl;
  if (a < 25) return peakCl - (a - 18) / 7 * (peakCl - 0.45);
  if (a < 45) return 0.45 - (a - 25) / 20 * 0.30;
  if (a < 90) return 0.15 + (a - 45) / 45 * 0.15;
  if (a < 135) return 0.30 - (a - 90) / 45 * 0.30;
  return 0;
}

/** Drag coefficient as a function of angle of attack (degrees). */
export function sailCd(aoaDeg: number): number {
  const a = Math.abs(aoaDeg);
  if (a < 10) return 0.06 + a / 10 * 0.04;
  if (a < 25) return 0.10 + (a - 10) / 15 * 0.25;
  if (a < 90) return 0.35 + (a - 25) / 65 * 0.85;
  if (a < 180) return 1.20 - (a - 90) / 90 * 0.35;
  return 0.85;
}

/** Stall predicate. Returns true when AoA is past the stall onset. */
export function isStalled(aoaDeg: number, stallOnset = 20): boolean {
  return Math.abs(aoaDeg) >= stallOnset;
}

/** Effective stall onset, shifted by twist. */
export function stallOnsetWithTwist(baseOnset: number, twist01: number): number {
  return baseOnset + twist01 * 10;
}

/** Effective peak Cl, reduced slightly by twist. */
export function peakClWithTwist(basePeak = 1.5, twist01: number): number {
  return basePeak * (1 - 0.12 * twist01);
}
