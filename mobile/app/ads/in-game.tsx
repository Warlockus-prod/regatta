import { useEffect, useMemo } from "react";
import { Dimensions, Linking } from "react-native";
import { createBoardFeed, readImageAsDataUrl } from "../../src/ads/board-feed";
import { useI18n } from "../../src/i18n/context";
import { useAdsText } from "../../src/ads/strings";
import { VOX_APP_PAGE_URL, placement } from "../../src/ads/vox-placements";
import { SimWebView } from "../../src/simulator/SimWebView";

const OFFLINE_SAILING = require("../../assets/sailing-offline.html");

/**
 * In-game format: the bundled 3D yacht scene (web route /ads) with a floating
 * board. VOX SDK 1 renders HTML, a 3D board needs an image, so board-feed.ts
 * asks Hybrid directly on this screen and passes the image to the page.
 */
export default function AdsInGameScreen() {
  const text = useAdsText();
  const { lang } = useI18n();
  const feed = useMemo(() => createBoardFeed([placement("inGameBoard640x360").placeId, placement("inGame970x250").placeId], { fetch: (...args) => fetch(...args), readImage: readImageAsDataUrl, openUrl: url => Linking.openURL(url), browser: () => {
    const { width, height } = Dimensions.get("screen");
    return { url: VOX_APP_PAGE_URL, referrer: "", language: lang, timezoneOffset: new Date().getTimezoneOffset(), screenWidth: Math.round(width), screenHeight: Math.round(height) };
  } }), [lang]);
  useEffect(() => () => feed.dispose(), [feed]);
  return <SimWebView path="/ads" title="Ads" offlineSource={OFFLINE_SAILING}
    fallbackRoute="/ads" fallbackLabel={text.backToFormats}
    onOfflineMessage={(message, inject) => { feed.handle(message, inject); }} />;
}
