/**
 * Package 32 (owner on build 81: "the picture is crooked"). The frame in the
 * Race tab came out as tall as its file (688 pt) and ran off the right edge:
 * React Native puts a required asset's own width and height before the style,
 * so a style with only width and aspectRatio keeps the file's height.
 * Contract: the frame sizes the picture, the picture always has an explicit
 * width and height, and the frame has the file's own proportion (no crop).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react-native";
import { Image, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return { Stack: { Screen: () => null }, useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(() => effect(), [effect]) };
});
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "en-US" }] }));
jest.mock("../src/api/daily", () => ({ fetchDaily: () => Promise.resolve({ ok: false }) }));

import { I18nProvider } from "../src/i18n/context";
import { HUB_SCENE_RATIO, ProductHub, RACE_SCENE_RATIO } from "../src/navigation/ProductHub";

/** Width and height from a JPEG's frame header (SOF0-SOF2), no image library. */
function jpegSize(file: string): { width: number; height: number } {
  const bytes = readFileSync(file);
  for (let i = 2; i < bytes.length - 8;) {
    if (bytes[i] !== 0xff) throw new Error("not a JPEG segment");
    const marker = bytes[i + 1];
    if (marker >= 0xc0 && marker <= 0xc2) return { height: bytes.readUInt16BE(i + 5), width: bytes.readUInt16BE(i + 7) };
    i += 2 + bytes.readUInt16BE(i + 2);
  }
  throw new Error("no frame header");
}

const metrics = { insets: { top: 47, bottom: 34, left: 0, right: 0 }, frame: { x: 0, y: 0, width: 390, height: 844 } };

it("the frame has the file's proportion, so the whole picture shows", () => {
  const { width, height } = jpegSize(join(__dirname, "../assets/design/race-scene.jpg"));
  expect(RACE_SCENE_RATIO).toBeCloseTo(width / height, 3);
});

it("the frame sizes the picture and the picture never falls back to the file's size", async () => {
  const view = render(<SafeAreaProvider initialMetrics={metrics}><I18nProvider initialLang="en"><ProductHub section="race" /></I18nProvider></SafeAreaProvider>);
  const frame = await view.findByTestId("race-hub-scene");
  expect(StyleSheet.flatten(frame.props.style)).toMatchObject({ width: "100%", aspectRatio: RACE_SCENE_RATIO, overflow: "hidden" });
  const picture = frame.findByType(Image);
  // Both set explicitly: a missing height is what let the file's 688 through.
  expect(StyleSheet.flatten(picture.props.style)).toMatchObject({ width: "100%", height: "100%" });
});

// Package 32, stage C: Learn, Practice and the Menu open with a frame of the 3D scene too.
it.each([["learn", "hub-learn.jpg"], ["practice", "hub-practice.jpg"], ["library", "hub-menu.jpg"]] as const)("the %s tab has its own frame, sized by the frame like the race one", async (section, file) => {
  const { width, height } = jpegSize(join(__dirname, "../assets/design", file));
  expect(HUB_SCENE_RATIO).toBeCloseTo(width / height, 3);
  const view = render(<SafeAreaProvider initialMetrics={metrics}><I18nProvider initialLang="en"><ProductHub section={section} /></I18nProvider></SafeAreaProvider>);
  const frame = await view.findByTestId("hub-scene");
  expect(StyleSheet.flatten(frame.props.style)).toMatchObject({ width: "100%", aspectRatio: HUB_SCENE_RATIO, overflow: "hidden" });
  const picture = frame.findByType(Image);
  expect(StyleSheet.flatten(picture.props.style)).toMatchObject({ width: "100%", height: "100%" });
  expect(picture.props.accessibilityLabel.length).toBeGreaterThan(10);
  expect(view.queryByTestId("race-hub-scene")).toBeNull();
});
