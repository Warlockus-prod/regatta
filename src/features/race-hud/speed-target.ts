// The boat speed against the target speed of the race HUD (M1-3): what the
// force model's best trim makes at this true wind angle (target.ts). Pure, so
// the status row and the tests read one rule.

export const SPEED_TARGET = {
  /** At or above this share of the target the boat is on its polar. */
  onRatio: 0.95,
  /** Below this share the boat is clearly slow (sail trim, pinching, a bump). */
  belowRatio: 0.8,
  /** A target below this (the no-go zone) is not shown, knots. */
  minTargetKn: 0.5,
} as const;

export type SpeedTargetState = "none" | "on" | "near" | "below";

export interface SpeedVersusTarget {
  /** Knots, null when there is nothing to compare with. */
  target: number | null;
  /** speed / target, null with no target. */
  ratio: number | null;
  state: SpeedTargetState;
}

export function speedVersusTarget(speedKn: number, targetKn: number | null | undefined): SpeedVersusTarget {
  if (targetKn == null || !Number.isFinite(targetKn) || targetKn < SPEED_TARGET.minTargetKn || !Number.isFinite(speedKn))
    return { target: null, ratio: null, state: "none" };
  const ratio = Math.max(0, speedKn) / targetKn;
  const state = ratio >= SPEED_TARGET.onRatio ? "on" : ratio < SPEED_TARGET.belowRatio ? "below" : "near";
  return { target: targetKn, ratio, state };
}

/** The accessible name of the target next to the speed readout (the same
 * words as the Boat 3D target readout). */
export const TARGET_SPEED_LABEL = { ru: "Целевая скорость", en: "Target speed", pl: "Prędkość docelowa", es: "Velocidad objetivo", fr: "Vitesse cible", de: "Zielgeschwindigkeit", it: "Velocità obiettivo" } as const;
