/**
 * Every VOX SDK 1 request names the app (owner 2026-11-06, decision Р-43): the
 * address is the bundle id, so Hybrid records Domain com.icoffio.regatta instead of
 * its fallback website icoffio.com, and a campaign can whitelist the app. It also
 * carries the language chosen in the app, which the privacy texts promise. The in-game
 * feed makes its own request and adds sdkInfo with the app id and nothing else.
 */
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));
jest.mock("expo-router", () => ({ Stack: { Screen: () => null } }));
jest.mock("../assets/sailing-offline.html", () => 123);
// The app's language differs from the device's (en-US above), so a test can tell which one is sent.
jest.mock("../src/i18n/context", () => ({
  useI18n: () => ({ lang: "pl", tl: (values: { en: string }) => values.en }),
}));
jest.mock("../src/simulator/SimWebView", () => {
  const React = require("react"); const { View } = require("react-native");
  return { SimWebView: (props: object) => React.createElement(View, { ...props, testID: "local-ads" }) };
});
// Jest has no native VOX module: this stands in for it, so the props the bridge gets are visible.
const mockShowFullScreen = jest.fn();
jest.mock("../modules/vox-ads", () => {
  const React = require("react"); const { View } = require("react-native");
  return {
    VoxAds: { showFullScreen: (...args: unknown[]) => mockShowFullScreen(...args) },
    VoxAdView: (props: object) => React.createElement(View, { ...props, testID: "vox-ad" }),
  };
});
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AdsInGame from "../app/ads/in-game";
import AdsInterstitial from "../app/ads/interstitial";
import AdsRewarded from "../app/ads/rewarded";
import { AdSlot } from "../src/ads/AdSlot";
import { VOX_APP_BUNDLE_ID, VOX_APP_PAGE_URL, placement } from "../src/ads/vox-placements";
import type { AdsText } from "../src/ads/strings";

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const text = { adLabel: "Ad", endpoint: "Request", reload: "Request again", status: {} } as unknown as AdsText;

describe("VOX requests name the app", () => {
  it("is the bundle id of the app, as an address Hybrid records as a Domain", () => {
    const app = JSON.parse(readFileSync(join(__dirname, "../app.json"), "utf8")) as { expo: { ios: { bundleIdentifier: string } } };
    expect(VOX_APP_BUNDLE_ID).toBe(app.expo.ios.bundleIdentifier);
    expect(VOX_APP_PAGE_URL).toBe(`https://${app.expo.ios.bundleIdentifier}/`);
  });

  it.each(["banner300x250", "videoHorizontal"])("passes the address to the inline slot %s", (key) => {
    const view = render(<AdSlot placement={placement(key)} width={320} text={text} showRequest={false} />);
    expect(view.getByTestId("vox-ad").props).toMatchObject({ placeId: placement(key).placeId, pageUrl: VOX_APP_PAGE_URL, language: "pl" });
  });

  it("passes the address to the rewarded video", () => {
    const view = render(<SafeAreaProvider initialMetrics={metrics}><AdsRewarded /></SafeAreaProvider>);
    fireEvent.press(view.getByRole("button", { name: "Watch video" }));
    expect(view.getByTestId("vox-ad").props).toMatchObject({ placeId: placement("rewarded").placeId, pageUrl: VOX_APP_PAGE_URL, language: "pl" });
  });

  it("passes the address on both full-screen places, the fallback included", async () => {
    mockShowFullScreen.mockReset();
    mockShowFullScreen.mockRejectedValueOnce(new Error("no-fill")).mockResolvedValueOnce(undefined);
    const view = render(<SafeAreaProvider initialMetrics={metrics}><AdsInterstitial /></SafeAreaProvider>);
    fireEvent.press(view.getByRole("button", { name: "Next race" }));
    await waitFor(() => expect(mockShowFullScreen).toHaveBeenCalledTimes(2));
    expect(mockShowFullScreen.mock.calls).toEqual([
      [placement("fullScreen1080x1920").placeId, 3, VOX_APP_PAGE_URL, "pl"],
      [placement("interstitial").placeId, 3, VOX_APP_PAGE_URL, "pl"],
    ]);
  });

  it("sends the address and only the app id in sdkInfo from the in-game board feed", async () => {
    const fetchMock = jest.fn(async () => ({ status: 204, ok: true }) as unknown as Response);
    const realFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;
    try {
      const host = render(<AdsInGame />).getByTestId("local-ads");
      await act(async () => {
        host.props.onOfflineMessage(JSON.stringify({ type: "ads.board", action: "ready" }), () => undefined);
        await new Promise(resolve => setImmediate(resolve));
      });
      const calls = fetchMock.mock.calls as unknown as [string][];
      expect(calls.length).toBeGreaterThan(0);
      for (const [url] of calls) {
        const request = JSON.parse(decodeURIComponent(url.split("request=")[1]));
        expect(request.browser.url).toBe(VOX_APP_PAGE_URL);
        expect(request.browser.language).toBe("pl");
        expect(request.sdkInfo).toEqual({ applicationId: VOX_APP_BUNDLE_ID });
        expect(request.gdpr).toBe(1);
        expect(request.gdprConsent).toBeUndefined();
      }
    } finally {
      global.fetch = realFetch;
    }
  });
});
