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
 * a moving boat keeps momentum and may pinch inside this reference cone. */
export const NO_GO_HALF_DEG = 42;
