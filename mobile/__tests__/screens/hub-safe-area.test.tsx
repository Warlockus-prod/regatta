/**
 * N3.2: on the tab hubs (Menu, Learn, Practice, Race) the status bar area is a
 * fixed strip outside the scroll view. The inset used to sit inside the scroll
 * content, so rows scrolled up under the clock and the system icons.
 */
import { render, waitFor } from "@testing-library/react-native";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return { Stack: { Screen: () => null }, useRouter: () => ({ push: jest.fn(), replace: jest.fn() }), useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]) };
});
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "en-US" }] }));
jest.mock("../../src/api/daily", () => ({ fetchDaily: () => Promise.resolve({ ok: false }) }));

import { I18nProvider } from "../../src/i18n/context";
import { ProductHub } from "../../src/navigation/ProductHub";

const TOP = 47;
const metrics = { insets: { top: TOP, bottom: 34, left: 0, right: 0 }, frame: { x: 0, y: 0, width: 390, height: 844 } };

describe.each(["library", "learn", "practice", "race"] as const)("ProductHub %s", (section) => {
  it("keeps the status bar inset out of the scrolling content", async () => {
    const view = render(<SafeAreaProvider initialMetrics={metrics}><I18nProvider initialLang="en"><ProductHub section={section} /></I18nProvider></SafeAreaProvider>);
    const scroll = view.UNSAFE_getByType(ScrollView);
    const content = StyleSheet.flatten(scroll.props.contentContainerStyle);
    expect(content.paddingTop).toBe(8);
    // The nearest styled ancestor is the Screen root, which pads the strip.
    let node = scroll.parent;
    while (node && StyleSheet.flatten(node.props.style)?.paddingTop === undefined) node = node.parent;
    expect(StyleSheet.flatten(node?.props.style).paddingTop).toBe(TOP);
    if (section === "library") await waitFor(() => view.getByText("My progress"));
    view.unmount();
  });
});
