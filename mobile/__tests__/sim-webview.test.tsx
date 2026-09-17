import { ActivityIndicator } from "react-native";
import { act, fireEvent, render } from "@testing-library/react-native";
import { SimWebView } from "../src/simulator/SimWebView";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_CHANNEL, TRAINER_STORAGE_KEY } from "../../src/features/sailing-lab/runtime/storage-protocol";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

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
  return { WebView: React.forwardRef((props: object, ref: unknown) => {
    React.useImperativeHandle(ref, () => ({ injectJavaScript: jest.fn() }));
    return React.createElement(View, { ...props, testID: "webview" });
  }) };
});

beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
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
  fireEvent(view.getByTestId("webview"), "message", { nativeEvent: { data: "scene-error" } });
  expect(view.queryByText("Retry")).toBeNull();
  fireEvent(view.getByTestId("webview"), "message", { nativeEvent: { data: "app-error" } });
  expect(view.getByText("Retry")).toBeTruthy();
});

it("loads the local source without an online fallback or network-error advice", () => {
  const local = { uri: "file:///bundle/sailing-offline.html" };
  const view = render(<SimWebView path="/simulator2" title="3D" tier="boat3d" offlineSource={local} />);
  const web = view.getByTestId("webview");
  expect(web.props.source).toEqual(local);
  expect(web.props.injectedJavaScriptBeforeContentLoaded).toContain('window.__REGATTA_LANGUAGE__ = "en"');
  expect(web.props.onShouldStartLoadWithRequest({ url: "https://weektoregatta.com/simulator2", navigationType: "other" })).toBe(false);
  expect(web.props.onShouldStartLoadWithRequest({ url: local.uri, navigationType: "other" })).toBe(true);
  fireEvent(web, "message", { nativeEvent: { data: "scene-error" } });
  expect(view.getByText("The local simulator could not open. Retry or open simplified Basics. No internet is needed.")).toBeTruthy();
  fireEvent.press(view.getByText("Retry"));
  expect(view.getByTestId("webview").props.source).toEqual(local);
});

it("passes the offline Trainer route and lesson parameters to the local bundle", () => {
  const local = { uri: "file:///bundle/sailing-offline.html" };
  const view = render(<SimWebView path="/simulator-v3" title="Trainer" tier="trainer" offlineSource={local} query={{ drill: "hold-trim" }} />);
  const web = view.getByTestId("webview");
  expect(web.props.source).toEqual(local);
  expect(web.props.injectedJavaScriptBeforeContentLoaded).toContain('"path":"/simulator-v3"');
  expect(web.props.injectedJavaScriptBeforeContentLoaded).toContain("__REGATTA_SAILING_STORAGE__ = true");
  expect(web.props.injectedJavaScriptBeforeContentLoaded).toContain("drill=hold-trim");
  expect(web.props.injectedJavaScript).toContain("regatta-embed");
  fireEvent(web, "loadEnd");
  fireEvent(web, "message", { nativeEvent: { data: "ready" } });
  expect(view.UNSAFE_queryByType(ActivityIndicator)).toBeTruthy();
  fireEvent(web, "message", { nativeEvent: { data: "app-ready" } });
  expect(view.UNSAFE_queryByType(ActivityIndicator)).toBeNull();
  fireEvent(web, "message", { nativeEvent: { data: "scene-error" } });
  expect(view.queryByText("Retry")).toBeNull();
});

it("only exposes checkpoint storage to the bundled Trainer, not remote pages", async () => {
  const data = JSON.stringify({ channel: STORAGE_CHANNEL, id: "read-1", action: "read" });
  const remote = render(<SimWebView path="/simulator-v3" title="Trainer" tier="trainer" />);
  fireEvent(remote.getByTestId("webview"), "message", { nativeEvent: { data } });
  expect(AsyncStorage.getItem).not.toHaveBeenCalled();
  remote.unmount();
  const local = render(<SimWebView path="/simulator-v3" title="Trainer" tier="trainer" offlineSource={{ uri: "file:///bundle/sailing-offline.html" }} />);
  await act(async () => fireEvent(local.getByTestId("webview"), "message", { nativeEvent: { data } }));
  expect(AsyncStorage.getItem).toHaveBeenCalledWith(TRAINER_STORAGE_KEY);
});
