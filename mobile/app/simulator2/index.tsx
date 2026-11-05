import { SimWebView } from '../../src/simulator/SimWebView';
import { useI18n } from '../../src/i18n/context';
import { OPEN_BASICS_OFFLINE, TRAINER_NAMES } from '../../../src/lib/product/trainer-names';

const OFFLINE_SAILING = require("../../assets/sailing-offline.html");

// ============================================================================
// Simulator V2 (3D) screen.
//
// Embeds the bundled web 3D simulator via WebView: an R3F + GLB
// sloop with morph-target sails and VPP sail physics. Native three.js does not
// render on this RN New-Architecture stack - see SimWebView for the why.
//
// The bundle contains the yacht and runtime, with no server requirement.
// If WebGL fails, the explicitly labelled simplified Basics remain available.
// ============================================================================

export default function SimulatorV2Screen() {
  const { lang } = useI18n();
  return (
    <SimWebView
      path="/simulator2"
      tier="boat3d"
      offlineSource={OFFLINE_SAILING}
      title={TRAINER_NAMES.boat[lang]}
      fallbackRoute="/simulator-basics"
      fallbackLabel={OPEN_BASICS_OFFLINE[lang]}
    />
  );
}
