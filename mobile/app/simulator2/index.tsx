import { SimWebView } from '../../src/simulator/SimWebView';

// ============================================================================
// Simulator V2 (3D) screen.
//
// Embeds the web R3F + GLB 3D simulator via WebView (native three.js does not
// render on this RN New-Architecture stack - see SimWebView for the why).
//
// Target is /simulator2 once the web V2 ships to prod. Until then it loads
// /anatomy (a live R3F + GLB 3D page) so the pipeline is verifiable on device.
// ============================================================================

export default function SimulatorV2Screen() {
  return <SimWebView path="/anatomy" title="3D" />;
}
