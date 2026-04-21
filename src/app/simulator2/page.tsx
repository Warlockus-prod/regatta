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
// Links to `/simulator2` in V1 (`src/app/simulator/page.tsx`) and V3
// (`src/features/simulator-v3/SimulatorV3Page.tsx`) are owned by other lanes;
// they still render but now bounce here and get redirected. Shared/V3 lanes
// can remove those pills at their convenience.
// ============================================================================

export default function SimulatorV2Page() {
  redirect('/simulator');
}
