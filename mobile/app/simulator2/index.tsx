import { SimWebView } from '../../src/simulator/SimWebView';

// ============================================================================
// Simulator V2 (3D) screen.
//
// Embeds the deployed web V2 simulator (/simulator2) via WebView: an R3F + GLB
// sloop with morph-target sails and VPP sail physics. Native three.js does not
// render on this RN New-Architecture stack - see SimWebView for the why.
// ============================================================================

export default function SimulatorV2Screen() {
  return <SimWebView path="/simulator2" title="3D" />;
}
