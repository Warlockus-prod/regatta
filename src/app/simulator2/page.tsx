import { redirect } from 'next/navigation';
import SimulatorV2 from '@/features/simulator-3d/SimulatorV2';
import { SIM_V2_ENABLED } from '@/features/simulator-3d/config';

// ============================================================================
// SIMULATOR V2 route.
//
// V2 is now the new 3D sloop module (src/features/simulator-3d). It is gated by
// a feature flag so it can be turned off without code changes: set
// NEXT_PUBLIC_SIM_V2=0 and the route falls back to V1.
//
// The old V2 race-view build (PR-1..PR-6) still lives in
// src/features/simulator-v2/* and ./SailingScene.tsx (unused, kept in git
// history, last live at commit be43938) and can be removed once V2-3D is final.
// ============================================================================

export default function SimulatorV2Page() {
  if (!SIM_V2_ENABLED) redirect('/simulator');
  return <SimulatorV2 />;
}
