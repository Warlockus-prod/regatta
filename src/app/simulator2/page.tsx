import { redirect } from 'next/navigation';

// ============================================================================
// SIMULATOR V2 - hidden 2026-04-22.
//
// The V2 race-view build (PR-1..PR-6) did not match the product direction the
// user wanted, so the route is redirected to V1 for now. The underlying code
// stays in `src/features/simulator-v2/*` and `./SailingScene.tsx` so it can
// be revived later by restoring this page's contents from git history (last
// live version: commit be43938).
//
// Public V1/V3 headers no longer link here. If a stale external link opens
// `/simulator2`, redirect it to the current simulator entry.
// ============================================================================

export default function SimulatorV2Page() {
  redirect('/simulator');
}
