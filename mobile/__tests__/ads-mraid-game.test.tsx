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

import { render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import AdsMraidGameScreen from "../app/ads/mraid-game";
import { placement } from "../src/ads/vox-placements";

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

it("puts the 300x600 MRAID game slot in an article and explains how to play", () => {
  const view = render(<SafeAreaProvider initialMetrics={metrics}><AdsMraidGameScreen /></SafeAreaProvider>);
  expect(view.getByText("MRAID game 300x600")).toBeTruthy();
  expect(view.getByText(/mraid\.expand/)).toBeTruthy();
  expect(view.getByText(/VOX SDK 1\.4\.3/)).toBeTruthy();
  // Without the native module (Jest) the slot shows its real-size frame.
  expect(view.getAllByText(/300x600/).length).toBeGreaterThan(1);
});

it("serves the game from the moderated 300x600 place", () => {
  expect(placement("mraidGame")).toMatchObject({ placeId: "6ae4bdb3810d986308d66830", kind: "banner", width: 300, height: 600 });
});
