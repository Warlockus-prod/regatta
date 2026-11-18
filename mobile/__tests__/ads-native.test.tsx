jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "en", languageTag: "en-US" }],
}));
jest.mock("../src/i18n/context", () => ({
  useI18n: () => ({ lang: "en", tl: (values: { en: string }) => values.en }),
}));
jest.mock("expo-router", () => ({ Stack: { Screen: () => null }, router: { push: jest.fn() } }));

const mockLoad = jest.fn();
const mockClick = jest.fn();
const mockRelease = jest.fn();
jest.mock("../modules/vox-ads", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    VoxAdView: null,
    VoxAds: null,
    VoxNativeAd: {
      load: (...args: unknown[]) => mockLoad(...args),
      click: (handle: string) => mockClick(handle),
      release: (handle: string) => mockRelease(handle),
    },
    // The container is a native view in the app; here a plain View that keeps the handle.
    VoxNativeAdContainer: ({ handle, children, ...rest }: { handle: string; children?: unknown }) =>
      React.createElement(View, { ...rest, testID: `native-container-${handle}` }, children),
  };
});
jest.mock("../modules/vox-prebid", () => ({ VoxPrebid: null, VoxPrebidBannerView: null }));

import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AdsNativeScreen from "../app/ads/native";
import { VOX_APP_PAGE_URL, placement } from "../src/ads/vox-placements";

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };
const AdsNative = () => <SafeAreaProvider initialMetrics={metrics}><AdsNativeScreen /></SafeAreaProvider>;

const FIELDS = {
  handle: "h1",
  title: "Hybrid: ads that people play with",
  advertiser: "Hybrid",
  callToAction: "Learn more",
  iconUrl: "https://content.hybrid.ai/icon.png",
  mainImageUrl: "https://content.hybrid.ai/main.png",
  ageRating: "",
};

beforeEach(() => {
  mockLoad.mockReset();
  mockClick.mockReset();
  mockRelease.mockReset();
});

it("requests the native place with the app address and draws the fields in a card the SDK watches", async () => {
  mockLoad.mockResolvedValue(FIELDS);
  const view = render(<AdsNative />);
  expect(mockLoad).toHaveBeenCalledWith(placement("native").placeId, VOX_APP_PAGE_URL, "en");
  await waitFor(() => expect(view.getByTestId("native-container-h1")).toBeTruthy());
  expect(view.getByText(FIELDS.title)).toBeTruthy();
  expect(view.getByText("Hybrid")).toBeTruthy();
  expect(view.getByText("Sponsored")).toBeTruthy();
  expect(view.getByText(/Shown/)).toBeTruthy();
  fireEvent.press(view.getByRole("link", { name: FIELDS.title }));
  expect(mockClick).toHaveBeenCalledWith("h1");
  view.unmount();
  expect(mockRelease).toHaveBeenCalledWith("h1");
});

it("shows the empty frame and the 204 state when the SSP has no native ad", async () => {
  mockLoad.mockRejectedValue(new Error("no-fill"));
  const view = render(<AdsNative />);
  await waitFor(() => expect(view.getByText(/No fill \(204\)/)).toBeTruthy());
  expect(view.getByText("native")).toBeTruthy();
  expect(view.queryByTestId("native-container-h1")).toBeNull();
  await act(async () => {
    fireEvent.press(view.getByRole("button", { name: "Request again" }));
  });
  expect(mockLoad).toHaveBeenCalledTimes(2);
});
