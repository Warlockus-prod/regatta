import SimulatorV2 from '@/features/simulator-3d/SimulatorV2';

// ============================================================================
// "3D Boat" route (historically Simulator V2).
//
// Renders the 3D sloop module (src/features/simulator-3d). In the two-tier
// simulator model (docs/design/SIMULATORS.md) this is NOT a third simulator:
// it is the 3D visual layer / boat view, linked from Basics (/simulator) and
// the Trainer (/simulator-v3), and embedded in the iOS app's "3D" tab
// (mobile/app/simulator2). Always on: the iOS App Store build depends on this
// route, so there is deliberately no feature flag (the old NEXT_PUBLIC_SIM_V2
// kill switch was build-time inlined and never worked in prod; removed).
//
// The old V2 race-view build was deleted 2026-07-05; recover from git history
// at commit be43938 if ever needed.
// ============================================================================

export default function SimulatorV2Page() {
  return <SimulatorV2 />;
}
