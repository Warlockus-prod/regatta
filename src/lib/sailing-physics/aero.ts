// ============================================================================
// Aerodynamic coefficients for a sail modeled as a simple flat airfoil.
//
// These curves are deliberately simple: piecewise-linear with an explicit
// stall region. The goal is the shape (peak -> stall -> drag-dominated flat
// plate), not numerical fidelity. Domain experts agree this is enough for
// teaching the causal chain. (See DECISIONS.md ADR-0001.)
//
// AoA input is the absolute angle between sail chord and apparent-wind flow
// direction, in degrees. Range [0, 180].
// ============================================================================

/** Lift coefficient as a function of angle of attack (degrees).
 *
 *  Shape:
 *  - 0-3 deg: luffing, Cl near 0 (sail flapping)
 *  - 3-12 deg: linear rise (attached flow, sail filling)
 *  - 12-18 deg: plateau at peak (~Cl_peak)
 *  - 18-30 deg: drop (stall onset and development)
 *  - 30-90 deg: drag-dominated, Cl tapers to moderate value (flat plate)
 *  - 90-180 deg: backed / reversed, Cl clipped small
 */
export function sailCl(aoaDeg: number, peakCl = 1.5): number {
  const a = Math.abs(aoaDeg);
  if (a < 3) return a / 3 * 0.4;                           // 0 -> 0.4
  if (a < 12) return 0.4 + (a - 3) / 9 * (peakCl - 0.4);   // 0.4 -> peakCl
  if (a < 18) return peakCl;                                // plateau
  if (a < 25) return peakCl - (a - 18) / 7 * (peakCl - 0.45); // peak -> 0.45 (sharp stall)
  if (a < 45) return 0.45 - (a - 25) / 20 * 0.30;           // 0.45 -> 0.15 (deep stall)
  if (a < 90) return 0.15 + (a - 45) / 45 * 0.15;           // 0.15 -> 0.30 (broadside drag-dominated, small Cl)
  if (a < 135) return 0.30 - (a - 90) / 45 * 0.30;          // 0.30 -> 0
  return 0;
}

/** Drag coefficient as a function of angle of attack (degrees).
 *
 *  Minimal drag at small AoA (attached flow), rising to flat-plate drag at
 *  90 deg (sail broadside to flow). Symmetric past 90 deg.
 */
export function sailCd(aoaDeg: number): number {
  const a = Math.abs(aoaDeg);
  if (a < 10) return 0.06 + a / 10 * 0.04;                // 0.06 -> 0.10
  if (a < 25) return 0.10 + (a - 10) / 15 * 0.25;         // 0.10 -> 0.35
  if (a < 90) return 0.35 + (a - 25) / 65 * 0.85;         // 0.35 -> 1.20
  if (a < 180) return 1.20 - (a - 90) / 90 * 0.35;        // 1.20 -> 0.85
  return 0.85;
}

/** Stall predicate. Returns true when AoA is past the stall onset. */
export function isStalled(aoaDeg: number, stallOnset = 20): boolean {
  return Math.abs(aoaDeg) >= stallOnset;
}

/** Effective stall onset, shifted by twist. Twist lets the top of the sail
 *  fly at a different (usually higher) AoA than the bottom, delaying stall
 *  onset at the cost of peak lift. Simple model: +1 deg stall onset per 10%
 *  twist. */
export function stallOnsetWithTwist(baseOnset: number, twist01: number): number {
  return baseOnset + twist01 * 10;
}

/** Effective peak Cl, reduced slightly by twist (top of sail not pulling as
 *  hard when twisted open). */
export function peakClWithTwist(basePeak = 1.5, twist01: number): number {
  return basePeak * (1 - 0.12 * twist01);
}
