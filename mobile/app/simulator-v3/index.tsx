import { SimWebView } from '../../src/simulator/SimWebView';

// ============================================================================
// Simulator V3 screen.
//
// Embeds the live web /simulator-v3 via WebView for full parity with the
// website (same physics, same UI, same content). Mobile-lane only: this loads
// the deployed web route, it does not edit any web V3 code.
// ============================================================================

export default function SimulatorV3Screen() {
  return <SimWebView path="/simulator-v3" title="V3" />;
}
