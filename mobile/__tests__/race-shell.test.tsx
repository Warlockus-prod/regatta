import { act, fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SimWebView } from "../src/simulator/SimWebView";
import { RACE_PROCESS_RELOAD_WINDOW_MS, raceFrameInsets, raceOverlayInsets, raceProcessRecovery, raceShellStackOptions } from "../src/simulator/race-shell";
import { nativeDiagnostics } from "../src/diagnostics/journal";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

const mockStackOptions: Record<string, unknown>[] = [];
const mockActivate = jest.fn(async (_tag: string) => true);
const mockDeactivate = jest.fn(async (_tag: string) => true);
const mockWebInstances: object[] = [];
jest.mock("expo-router", () => ({
  Stack: { Screen: ({ options }: { options: Record<string, unknown> }) => { mockStackOptions.push(options); return null; } },
  useRouter: () => ({ replace: jest.fn(), navigate: jest.fn(), dismissTo: jest.fn(), canGoBack: () => true, back: jest.fn() }),
  usePathname: () => "/game",
}));
jest.mock("expo-modules-core", () => ({
  ...jest.requireActual("expo-modules-core"),
  requireOptionalNativeModule: (name: string) => name === "ExpoKeepAwake"
    ? { activate: (tag: string) => mockActivate(tag), deactivate: (tag: string) => mockDeactivate(tag) }
    : null,
}));
jest.mock("../src/i18n/context", () => ({
  useI18n: () => ({ lang: "en", tp: (_ru: string, en: string) => en, tl: (values: { en: string }) => values.en }),
}));
jest.mock("../src/design-system/components", () => {
  const React = require("react");
  const { View, Text } = require("react-native");
  return { Screen: ({ children, style }: { children: React.ReactNode; style?: object }) => React.createElement(View, { testID: "screen", style }, children), Text };
});
jest.mock("../src/persistence/analytics-consent", () => ({
  ...jest.requireActual("../src/persistence/analytics-consent"),
  useAnalyticsConsent: () => ({ enabled: true, ready: true, setEnabled: () => {} }),
}));
jest.mock("react-native-webview", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { WebView: React.forwardRef((props: object, ref: unknown) => {
    React.useImperativeHandle(ref, () => { const instance = { injectJavaScript: jest.fn() }; mockWebInstances.push(instance); return instance; }, []);
    return React.createElement(View, { ...props, testID: "webview" });
  }) };
});

// iPhone with a Dynamic Island turned to landscape: island and corners on both sides.
const LANDSCAPE = { insets: { top: 0, left: 59, right: 59, bottom: 21 }, frame: { x: 0, y: 0, width: 852, height: 393 } };
const local = { uri: "file:///bundle/sailing-offline.html" };
const lastOptions = () => mockStackOptions[mockStackOptions.length - 1];
const lifecycle = () => nativeDiagnostics.snapshot().entries.flatMap(entry => entry.event.type === "embedded.lifecycle"
  ? [`${entry.event.action}${entry.event.reason ? `:${entry.event.reason}` : ""}`] : []);
const raceNotice = "The system closed the race to free memory. The race menu is open again.";

beforeEach(async () => {
  jest.useFakeTimers();
  await nativeDiagnostics.clear();
  mockStackOptions.length = 0;
  mockWebInstances.length = 0;
  mockActivate.mockClear();
  mockDeactivate.mockClear();
});
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

it("keeps a landscape race clear of the side insets, swipe-proof and awake until it leaves", async () => {
  const view = render(<SafeAreaProvider initialMetrics={LANDSCAPE}>
    <SimWebView path="/game" title="Race" fullScreen offlineSource={local} />
  </SafeAreaProvider>);
  await act(async () => {});
  expect(view.getByTestId("screen").props.style).toEqual({ paddingLeft: 59, paddingRight: 59 });
  expect(lastOptions()).toMatchObject({ gestureEnabled: false, fullScreenGestureEnabled: false });
  expect(mockActivate).toHaveBeenCalledTimes(1);
  const tag = mockActivate.mock.calls[0][0];
  expect(mockDeactivate).not.toHaveBeenCalled();
  view.unmount();
  expect(mockDeactivate).toHaveBeenCalledWith(tag);
});

it("leaves the trainers' gestures, insets and idle timer alone", async () => {
  const view = render(<SafeAreaProvider initialMetrics={LANDSCAPE}>
    <SimWebView path="/simulator-v3" title="Trainer" tier="trainer" offlineSource={local} />
  </SafeAreaProvider>);
  await act(async () => {});
  expect(view.getByTestId("screen").props.style).toBeNull();
  expect(lastOptions().gestureEnabled).toBeUndefined();
  expect(mockActivate).not.toHaveBeenCalled();
});

it("keeps the live multiplayer room swipe-proof and awake", async () => {
  const view = render(<SimWebView path="/multiplayer" title="Multiplayer" />);
  await act(async () => {});
  expect(lastOptions()).toMatchObject({ gestureEnabled: false });
  expect(mockActivate).toHaveBeenCalledTimes(1);
  view.unmount();
});

it.each(["contentProcessDidTerminate", "renderProcessGone"])("reloads the local race to its menu after %s and says why, once per window", async event => {
  const view = render(<SimWebView path="/game" title="Race" fullScreen offlineSource={local} />);
  await act(async () => {});
  fireEvent(view.getByTestId("webview"), "message", { nativeEvent: { data: "app-ready" } });
  const first = mockWebInstances[mockWebInstances.length - 1];
  fireEvent(view.getByTestId("webview"), event, { nativeEvent: { didCrash: true } });
  expect(mockWebInstances[mockWebInstances.length - 1]).not.toBe(first);
  expect(view.getByTestId("webview").props.source).toEqual(local);
  expect(view.getByText(raceNotice)).toBeTruthy();
  expect(view.queryByText("Retry")).toBeNull();
  expect(lifecycle()).toEqual(["ready", "process-terminated:webview-process", "retry:webview-process"]);
  fireEvent(view.getByTestId("webview"), "message", { nativeEvent: { data: "app-ready" } });
  act(() => jest.advanceTimersByTime(8000));
  expect(view.queryByText(raceNotice)).toBeNull();
  // A second loss inside the window is a real failure, not a reload loop.
  fireEvent(view.getByTestId("webview"), event, { nativeEvent: {} });
  expect(view.getByText("Retry")).toBeTruthy();
  expect(view.queryByText(raceNotice)).toBeNull();
  fireEvent.press(view.getByText("Retry"));
  fireEvent(view.getByTestId("webview"), "message", { nativeEvent: { data: "app-ready" } });
  act(() => jest.advanceTimersByTime(RACE_PROCESS_RELOAD_WINDOW_MS));
  fireEvent(view.getByTestId("webview"), event, { nativeEvent: {} });
  expect(view.getByText(raceNotice)).toBeTruthy();
});

it("keeps the native overlays inside the same safe frame as the race", async () => {
  const view = render(<SafeAreaProvider initialMetrics={LANDSCAPE}>
    <SimWebView path="/game" title="Race" fullScreen offlineSource={local} />
  </SafeAreaProvider>);
  await act(async () => {});
  fireEvent(view.getByTestId("webview"), "contentProcessDidTerminate", { nativeEvent: {} });
  // Absolute overlays ignore the frame padding: the island side must be offset explicitly.
  expect(StyleSheet.flatten(view.getByTestId("race-process-notice").props.style)).toMatchObject({ top: 12, left: 75, right: 75 });
  fireEvent(view.getByTestId("webview"), "contentProcessDidTerminate", { nativeEvent: {} });
  expect(StyleSheet.flatten(view.getByTestId("sim-failed").props.style)).toMatchObject({ left: 59, right: 59 });
});

it("drops the memory notice below the island once the portrait race hides its header", async () => {
  const portrait = { insets: { top: 59, left: 0, right: 0, bottom: 34 }, frame: { x: 0, y: 0, width: 393, height: 852 } };
  const view = render(<SafeAreaProvider initialMetrics={portrait}>
    <SimWebView path="/game" title="Race" fullScreen offlineSource={local} />
  </SafeAreaProvider>);
  await act(async () => {});
  fireEvent(view.getByTestId("webview"), "message", { nativeEvent: { data: "app-ready" } });
  fireEvent(view.getByTestId("webview"), "renderProcessGone", { nativeEvent: {} });
  // Reloading: the header is back and clears the status bar itself.
  expect(StyleSheet.flatten(view.getByTestId("race-process-notice").props.style)).toMatchObject({ top: 12, left: 16 });
  fireEvent(view.getByTestId("webview"), "message", { nativeEvent: { data: "app-ready" } });
  expect(lastOptions().headerShown).toBe(false);
  expect(StyleSheet.flatten(view.getByTestId("race-process-notice").props.style)).toMatchObject({ top: 71, left: 16, right: 16 });
});

it("tells a replay viewer the replay itself was reopened", async () => {
  const view = render(<SimWebView path="/game" title="Race" fullScreen offlineSource={local} raceReplay={{ schema: 1, id: "saved" }} />);
  await act(async () => {});
  fireEvent(view.getByTestId("webview"), "contentProcessDidTerminate", { nativeEvent: {} });
  expect(view.getByText("The system closed the replay to free memory. It has been opened again.")).toBeTruthy();
});

it("keeps Retry for a process loss outside the local race", async () => {
  const view = render(<SimWebView path="/simulator2" title="3D" tier="boat3d" offlineSource={local} />);
  await act(async () => {});
  fireEvent(view.getByTestId("webview"), "contentProcessDidTerminate", { nativeEvent: {} });
  expect(view.getByText("Retry")).toBeTruthy();
  expect(lifecycle()).toEqual(["process-terminated:webview-process"]);
});

it("computes the shell policy without a rendered screen", () => {
  expect(raceFrameInsets({ left: 59, right: 59 }, true)).toEqual({ paddingLeft: 59, paddingRight: 59 });
  expect(raceFrameInsets({ left: 0, right: 0 }, true)).toEqual({ paddingLeft: 0, paddingRight: 0 });
  expect(raceFrameInsets({ left: 59, right: 59 }, false)).toBeNull();
  expect(raceFrameInsets(null, true)).toBeNull();
  expect(raceOverlayInsets({ top: 59, left: 0, right: 0 }, true, false)).toEqual({ top: 59, left: 0, right: 0 });
  expect(raceOverlayInsets({ top: 0, left: 59, right: 59 }, true, true)).toEqual({ top: 0, left: 59, right: 59 });
  expect(raceOverlayInsets({ top: 59, left: 59, right: 59 }, false, false)).toEqual({ top: 0, left: 0, right: 0 });
  expect(raceShellStackOptions("/game")).toEqual({ gestureEnabled: false, fullScreenGestureEnabled: false });
  expect(raceShellStackOptions("/anatomy")).toEqual({});
  expect(raceProcessRecovery(null, 1_000)).toBe("reload");
  expect(raceProcessRecovery(1_000, 1_000 + RACE_PROCESS_RELOAD_WINDOW_MS - 1)).toBe("fail");
  expect(raceProcessRecovery(1_000, 1_000 + RACE_PROCESS_RELOAD_WINDOW_MS)).toBe("reload");
});
