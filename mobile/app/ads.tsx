import { adsCopy } from "../../src/features/ads-lab/copy";
import { useI18n } from "../src/i18n/context";
import { SimWebView } from "../src/simulator/SimWebView";

const OFFLINE_SAILING = require("../assets/sailing-offline.html");

/** Owner-requested local inspection lab. A real ad SDK is not configured. */
export default function AdsScreen() {
  const { lang } = useI18n();
  return <SimWebView path="/ads" title="Ads" offlineSource={OFFLINE_SAILING}
    fallbackRoute="/settings" fallbackLabel={adsCopy.back[lang]} />;
}
