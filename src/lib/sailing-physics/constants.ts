// ============================================================================
// Shared UI-facing physics constants.
//
// Single source of truth for numbers that MUST read the same in every
// simulator surface (Basics /simulator, Trainer /simulator-v3, 3D /simulator2,
// and the native iOS trainer). The 2026-07 audit found three different no-go
// cones (30/42/45 deg) taught to the same beginner; consumers now import this.
// ============================================================================

/** Teaching reference for the close-hauled boundary of our synthetic cruiser.
 * It is a recommended course limit, not a discontinuity in the force model:
 * no force-model code reads it (the cruiser luffs by its own aerodynamics).
 * ADR-0023 (owner, 2026-11-02) set it to 40 so it is never wider than the best
 * course. Measured on the cruiser profile, best upwind VMG: 45 / 42 / 40 deg
 * TWA in 6 / 12 / 20 kn by a 1 deg scan of the force model, 45 / 40 / 40 deg
 * on the race's 5 deg polar table that BEST VMG and the Trainer's "Best VMG"
 * sail (helm-angles.ts). cruiser.test.ts fails if a best angle falls inside
 * this cone. The legacy race keeps its own 30 deg zone (race-manoeuvres.ts
 * NO_GO, classic profile) and the right-of-way judge its own 42
 * (race-rules.ts JUDGE_TACKING_TWA_DEG). */
export const NO_GO_HALF_DEG = 40;
