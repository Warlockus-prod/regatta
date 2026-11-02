// ============================================================================
// Shared UI-facing physics constants.
//
// Single source of truth for numbers that MUST read the same in every
// simulator surface (Basics /simulator, Trainer /simulator-v3, 3D /simulator2,
// and the native iOS trainer). The 2026-07 audit found three different no-go
// cones (30/42/45 deg) taught to the same beginner; consumers now import this.
// ============================================================================

/** Teaching reference for the close-hauled boundary of our synthetic cruiser.
 * It is a recommended course limit, not a discontinuity in the force model.
 * Since ADR-0021 it agrees with the physics: the cruiser profile's best upwind
 * VMG lies at 45 / 42 / 40 deg TWA in 6 / 12 / 20 kn, and inside the cone the
 * rig luffs and stops the boat (cruiser.test.ts locks both). The legacy race
 * keeps its own 30 deg zone (race-manoeuvres.ts NO_GO, classic profile). */
export const NO_GO_HALF_DEG = 42;
