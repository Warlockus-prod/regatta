// ============================================================================
// Shared UI-facing physics constants.
//
// Single source of truth for numbers that MUST read the same in every
// simulator surface (Basics /simulator, Trainer /simulator-v3, 3D /simulator2,
// and the native iOS trainer). The 2026-07 audit found three different no-go
// cones (30/42/45 deg) taught to the same beginner; consumers now import this.
// ============================================================================

/**
 * Half-angle of the no-go zone (degrees off the true wind). A cruising sloop
 * cannot generate drive closer than ~40-45 deg to the wind; 42 matches the
 * VPP-derived value used by the 3D sail model and the physics reference doc
 * (docs/design/SAILING_PHYSICS_REFERENCE.md, section 4).
 */
export const NO_GO_HALF_DEG = 42;
