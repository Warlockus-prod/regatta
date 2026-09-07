import { ActivityIndicator } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import { SimWebView } from "../src/simulator/SimWebView";

jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ replace: jest.fn() }),
}));
jest.mock("../src/i18n/context", () => ({
  useI18n: () => ({ lang: "en", tp: (_ru: string, en: string) => en }),
}));
jest.mock("../src/design-system/components", () => ({
  Screen: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("react-native-webview", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { WebView: React.forwardRef((props: object, ref: unknown) =>
    React.createElement(View, { ...props, ref, testID: "webview" })) };
});

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it("keeps the 3D loader until the yacht is ready, then cancels the watchdog", () => {
  const view = render(<SimWebView path="/simulator2" title="3D" tier="boat3d" />);
  const web = view.getByTestId("webview");
  fireEvent(web, "loadEnd");
  fireEvent(web, "message", { nativeEvent: { data: "ready" } });
  expect(view.UNSAFE_queryByType(ActivityIndicator)).toBeTruthy();
  act(() => jest.advanceTimersByTime(15000));
  expect(view.queryByText("Retry")).toBeNull();
  fireEvent(web, "message", { nativeEvent: { data: "scene-ready" } });
  expect(view.UNSAFE_queryByType(ActivityIndicator)).toBeNull();
  act(() => jest.advanceTimersByTime(30000));
  expect(view.queryByText("Retry")).toBeNull();
});

it("recovers from scene failure with a fresh load and times out a stalled retry", () => {
  const view = render(<SimWebView path="/simulator2" title="3D" tier="boat3d" />);
  fireEvent(view.getByTestId("webview"), "message", { nativeEvent: { data: "scene-error" } });
  expect(view.getByText("Retry")).toBeTruthy();
  fireEvent.press(view.getByText("Retry"));
  expect(view.queryByText("Retry")).toBeNull();
  expect(view.UNSAFE_queryByType(ActivityIndicator)).toBeTruthy();
  act(() => jest.advanceTimersByTime(30000));
  expect(view.getByText("Retry")).toBeTruthy();
});

it("preserves generic ready for the other simulator tiers", () => {
  const view = render(<SimWebView path="/simulator-v3" title="Trainer" tier="trainer" />);
  fireEvent(view.getByTestId("webview"), "message", { nativeEvent: { data: "ready" } });
  expect(view.UNSAFE_queryByType(ActivityIndicator)).toBeNull();
});
