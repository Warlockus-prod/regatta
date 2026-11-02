import { useAdsText } from "../../src/ads/strings";
import { SimWebView } from "../../src/simulator/SimWebView";

const OFFLINE_SAILING = require("../../assets/sailing-offline.html");

/**
 * In-game format: the bundled 3D yacht scene (web route /ads) with local
 * test boards. The boards are not fed by the SDK yet: VOX SDK 1 returns
 * HTML creatives, a 3D board needs an image.
 */
export default function AdsInGameScreen() {
  const text = useAdsText();
  return <SimWebView path="/ads" title="Ads" offlineSource={OFFLINE_SAILING}
    fallbackRoute="/ads" fallbackLabel={text.backToFormats} />;
}
