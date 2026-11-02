jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));
jest.mock("../assets/sailing-offline.html", () => 123);
jest.mock("../src/i18n/context", () => ({
  useI18n: () => ({ lang: "en", tl: (values: { en: string }) => values.en }),
}));
jest.mock("../src/simulator/SimWebView", () => {
  const React = require("react"); const { View } = require("react-native");
  return { SimWebView: (props: object) => React.createElement(View, { ...props, testID: "local-ads" }) };
});
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  router: { push: (href: string) => mockPush(href) },
}));
import { fireEvent, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AdsFormats from "../app/ads";
import AdsInGame from "../app/ads/in-game";
import { statusFromFailure } from "../src/ads/AdSlot";
import { AD_FORMATS, AD_FORMAT_ROUTES } from "../src/ads/formats";
import { VOX_PLACEMENTS, placement } from "../src/ads/vox-placements";
import { showsMainNavigation } from "../src/navigation/visibility";
import { sailingNativeDestination } from "../src/navigation/sailing-entry";

it("opens the bundled 3D in-game lab with a recovery path back to the formats", () => {
  const host = render(<AdsInGame />).getByTestId("local-ads");
  expect(host.props).toMatchObject({ path: "/ads", title: "Ads", offlineSource: 123, fallbackRoute: "/ads", fallbackLabel: "Back to formats" });
  expect(host.props.tier).toBeUndefined();
  expect(showsMainNavigation("/ads")).toBe(false);
  expect(showsMainNavigation("/ads/in-game")).toBe(false);
  expect(showsMainNavigation("/adsx")).toBe(true);
  expect(showsMainNavigation("/settings")).toBe(true);
  expect(sailingNativeDestination("/ads")).toBe("/ads");
});

it("lists every ad format and opens its screen", () => {
  const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
  const view = render(<SafeAreaProvider initialMetrics={metrics}><AdsFormats /></SafeAreaProvider>);
  for (const format of AD_FORMATS) {
    mockPush.mockClear();
    const title = { display: "Display banners", interstitial: "Interstitial (full screen)", rewarded: "Rewarded video", video: "In-content video (VAST)", inGame: "In-game" }[format];
    fireEvent.press(view.getByRole("button", { name: title }));
    expect(mockPush).toHaveBeenCalledWith(AD_FORMAT_ROUTES[format]);
  }
  // Jest has no native VOX module: the hub says so instead of pretending to load ads.
  expect(view.getByText(/not in this build/)).toBeTruthy();
});

it("maps the bridge's no-fill answer apart from real errors", () => {
  expect(statusFromFailure("no-fill")).toBe("noFill");
  expect(statusFromFailure("timeout")).toBe("error");
});

it("keeps one place ID per placement key and a real size for every inline slot", () => {
  const keys = VOX_PLACEMENTS.map((p) => p.key);
  expect(new Set(keys).size).toBe(keys.length);
  for (const p of VOX_PLACEMENTS) {
    expect(p.placeId).toMatch(/^[0-9a-f]{24}$/);
    if (p.kind !== "fullscreen") expect(p.width > 0 && p.height > 0).toBe(true);
  }
  expect(() => placement("missing")).toThrow();
});

it("keeps ad SDK bridges inside the Ads section only", () => {
  // Owner rule (2026-10-30): this is a test build and ads appear only under
  // Settings -> Ads. Any other screen importing an ad bridge breaks that.
  const fs = require("fs") as typeof import("fs");
  const path = require("path") as typeof import("path");
  const root = path.resolve(__dirname, "..");
  const allowed = [/^app\/ads\//, /^src\/ads\//, /^modules\/vox-/, /^plugins\/with-vox-/];
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!["node_modules", "ios", "android", "__tests__", ".expo"].includes(entry.name)) walk(rel);
      } else if (/\.(ts|tsx|js)$/.test(entry.name) && !allowed.some((re) => re.test(rel))) {
        const source = fs.readFileSync(path.join(root, rel), "utf8");
        if (/modules\/vox-|VoxAdView|VoxAds\b|VoxPrebid|PrebidMobile|ssp\.hybrid\.ai|src\/ads\/(?!strings)|\.\/ads\/(?!strings)/.test(source)) offenders.push(rel);
      }
    }
  };
  for (const dir of ["app", "src", "plugins", "scripts"]) walk(dir);
  expect(offenders).toEqual([]);
});

it("offers VOX SDK 2 only in development builds, where its Prebid Server is reachable", () => {
  const { availableAdSdks } = require("../src/ads/sdk");
  expect(availableAdSdks(true)).toEqual(["vox1", "vox2"]);
  expect(availableAdSdks(false)).toEqual(["vox1"]);
});
