// ============================================================================
// Sailing physics - mobile entry.
//
// This is a SHIM: the native trainer runs the exact same golden VPP engine as
// the web (src/lib/sailing-physics), resolved via the '@regatta/physics'
// alias (metro.config.js + tsconfig paths + jest moduleNameMapper). The old
// verbatim fork that used to live in this folder silently diverged (91 diff
// lines in forces.ts, missing current.ts, zero tests) and was deleted
// 2026-07-05 - see docs/design/SIMULATORS.md and DECISIONS.md ADR-0009.
//
// Do NOT re-add engine files here; CI guards against a second copy.
// ============================================================================

export * from '@regatta/physics';
