import { ActivityIndicator } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { APP_EMBED_THEME_SCRIPT } from "../src/design-system/embedded-theme";
import { SimWebView } from "../src/simulator/SimWebView";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_CHANNEL, TRAINER_STORAGE_KEY } from "../../src/features/sailing-lab/runtime/storage-protocol";
import { nativeDiagnostics } from "../src/diagnostics/journal";
import { CommonActions, StackActions, StackRouter } from "@react-navigation/routers";
import { ActivityBack } from "../src/navigation/ActivityBack";
import { FOUNDATION_POSITION_KEY, loadFoundationPositions, saveFoundationPosition } from "../src/bootcamp/lesson-position";
import { loadLessonPositions, saveLessonPosition } from "../src/sailing/lesson-position";
import { LESSON_POSITION_KEY } from "../../src/features/sailing-lab/lessons/lesson-position";
import { SAIL_PROGRESS_KEY } from "../../src/features/sailing-lab/lessons/progress";
import { PRACTICE_RESULTS_KEY } from "../../src/features/sailing-lab/lessons/practice-results";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

const mockNavigate = jest.fn();
const mockDismissTo = jest.fn();
const mockBack = jest.fn();
let mockCanGoBack = () => true;
const mockWebInstances: { injectJavaScript: jest.Mock }[] = [];
jest.mock("expo-router", () => ({
  Stack: { Screen: ({ options }: { options?: { headerShown?: boolean; headerLeft?: () => React.ReactNode } }) => options?.headerShown === false ? null : options?.headerLeft?.() ?? null },
  useRouter: () => ({ replace: jest.fn(), navigate: mockNavigate, dismissTo: mockDismissTo, canGoBack: mockCanGoBack, back: mockBack }),
  usePathname: () => "/simulator-v3",
}));
jest.mock("../src/i18n/context", () => ({
  useI18n: () => ({ lang: "en", tp: (_ru: string, en: string) => en }),
}));
jest.mock("../src/design-system/components", () => ({
  Screen: ({ children }: { children: React.ReactNode }) => children,
  Text: jest.requireActual("react-native").Text,
}));
// The analytics choice as already read (analytics on), so these tests stay
// synchronous and touch no storage of their own. The consent gating and the
// injected flag are covered in webview-analytics-consent.test.tsx.
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

beforeEach(async () => { jest.useFakeTimers(); await nativeDiagnostics.clear(); jest.clearAllMocks(); mockNavigate.mockReset(); mockDismissTo.mockReset(); mockBack.mockReset(); mockCanGoBack = () => true; mockWebInstances.length = 0; });
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

it("binds a deferred local reply to its original WebView through Retry and disposal", () => {
  const replies: ((script: string) => void)[] = [];
  const view = render(<SimWebView path="/anatomy" title="Anatomy" offlineSource={{ uri: "file:///bundle/sailing-offline.html" }}
    onOfflineMessage={(_message, inject) => { replies.push(inject); }} />);
  fireEvent(view.getByTestId("webview"), "message", { nativeEvent: { data: '{"type":"local-result"}' } });
  const original = mockWebInstances[0];
  fireEvent(view.getByTestId("webview"), "contentProcessDidTerminate", { nativeEvent: {} });
  fireEvent.press(view.getByText("Retry"));
  const current = mockWebInstances[mockWebInstances.length - 1]; expect(current).not.toBe(original);
  original.injectJavaScript.mockClear(); current.injectJavaScript.mockClear();
  replies[0]("OLD_REPLY");
  expect(original.injectJavaScript).not.toHaveBeenCalled(); expect(current.injectJavaScript).not.toHaveBeenCalled();
  fireEvent(view.getByTestId("webview"), "message", { nativeEvent: { data: '{"type":"local-result"}' } });
  replies[1]("CURRENT_REPLY"); expect(current.injectJavaScript).toHaveBeenCalledWith("CURRENT_REPLY");
  view.unmount(); current.injectJavaScript.mockClear(); replies[1]("AFTER_DISPOSAL");
  expect(current.injectJavaScript).not.toHaveBeenCalled();
});

it("routes sanitized diagnostic batches to the host journal before any offline callback or checkpoint handler", async () => {
  const handle = jest.fn();
  const view = render(<SimWebView path="/simulator-v3" title="Trainer" tier="trainer" offlineSource={{ uri: "file:///bundle/sailing-offline.html" }} onOfflineMessage={handle} />);
  const web = view.getByTestId("webview");
  const control = { type: "control.change", surface: "radio", control: "rudder", value: .25, outcome: "accepted" };
  fireEvent(web, "message", { nativeEvent: { data: JSON.stringify({ type: "diagnostic-events", version: 1, events: [control] }) } });
  expect(handle).not.toHaveBeenCalled();
  expect(nativeDiagnostics.snapshot().entries.some(entry => entry.event.type === "control.change" && entry.event.surface === "trainer")).toBe(true);
  fireEvent(web, "message", { nativeEvent: { data: JSON.stringify({ type: "diagnostic-events", version: 1, events: [{ ...control, text: "PRIVATE_TRANSCRIPT" }] }) } });
  expect(JSON.stringify(nativeDiagnostics.snapshot())).not.toContain("PRIVATE_TRANSCRIPT");
  expect(nativeDiagnostics.snapshot().entries.some(entry => entry.event.reason === "invalid-message")).toBe(true);
  const raw = JSON.stringify({ version: 1, snapshot: "PRIVATE_CHECKPOINT_DATA" });
  await act(async () => fireEvent(web, "message", { nativeEvent: { data: JSON.stringify({ channel: STORAGE_CHANNEL, id: "diag-write", action: "write", raw }) } }));
  await waitFor(() => expect(nativeDiagnostics.snapshot().entries.some(entry => entry.event.type === "storage.operation" && entry.event.target === "checkpoint" && entry.event.outcome === "accepted")).toBe(true));
  expect(await AsyncStorage.getItem(TRAINER_STORAGE_KEY)).toBe(raw);
  expect(JSON.stringify(nativeDiagnostics.snapshot())).not.toContain("PRIVATE_CHECKPOINT_DATA");
});

it("records actual page ready, process failure and user Retry with only static lifecycle fields", () => {
  const view = render(<SimWebView path="/simulator-v3" title="Trainer" tier="trainer" offlineSource={{ uri: "file:///bundle/sailing-offline.html" }} />);
  const web = view.getByTestId("webview");
  fireEvent(web, "loadStart");
  fireEvent(web, "message", { nativeEvent: { data: "app-ready" } });
  fireEvent(web, "contentProcessDidTerminate", { nativeEvent: { url: "PRIVATE_URL", description: "PRIVATE_STACK" } });
  fireEvent.press(view.getByText("Retry"));
  const lifecycle = nativeDiagnostics.snapshot().entries.flatMap(entry => entry.event.type === "embedded.lifecycle" ? [entry.event.action] : []);
  expect(lifecycle).toEqual(["begin", "ready", "process-terminated", "retry"]);
  expect(JSON.stringify(nativeDiagnostics.snapshot())).not.toContain("PRIVATE_");
});

it("returns to a known lesson and hides tier switching during lesson practice", async () => {
  const view = render(<SimWebView path="/simulator-v3" title="Trainer" tier="trainer" query={{ lesson: "mainsheet", study: "mainsheet" }} />);
  await act(async () => {});
  expect(view.queryByRole("tab", { name: "Basics" })).toBeNull();
  fireEvent.press(view.getByRole("button", { name: "Return to the lesson" }));
  expect(mockDismissTo).toHaveBeenCalledWith({ pathname: "/learn/sails/[lesson]", params: { lesson: "mainsheet" } });
  view.unmount();
  const invalid = render(<SimWebView path="/simulator-v3" title="Trainer" tier="trainer" query={{ lesson: "https://example.com" }} />);
  expect(invalid.queryByRole("button", { name: "Return to the lesson" })).toBeNull();
  expect(invalid.getByRole("tab", { name: "Basics" })).toBeTruthy();
});

it.each(["sails", "foundation"] as const)("%s practice return removes the trainer before the next native Back without changing saved learning evidence", async kind => {
  const outline = kind === "sails" ? "learn/sails/index" : "bootcamp/index";
  const lessonRoute = kind === "sails" ? "learn/sails/[lesson]" : "bootcamp/[id]";
  const id = kind === "sails" ? "mainsheet" : "wind-direction";
  const params = kind === "sails" ? { lesson: id } : { id };
  const target = { pathname: `/${lessonRoute}`, params };
  const stack = StackRouter({ initialRouteName: outline });
  // Match the installed root Stack: no getId or dangerouslySingular override.
  const config = { routeNames: [outline, lessonRoute, "simulator-v3/index"], routeParamList: {}, routeGetIdList: {} };
  let state = stack.getInitialState(config);
  const dispatch = (action: Parameters<typeof stack.getStateForAction>[1]) => {
    const next = stack.getStateForAction(state, action, config);
    if (!next || next.stale !== false) throw new Error("Lesson stack action did not return a hydrated state");
    state = next;
  };
  dispatch(StackActions.push(lessonRoute, params));
  const originalLessonKey = state.routes[state.index].key;
  dispatch(StackActions.push("simulator-v3/index", kind === "sails" ? { lesson: id } : { fromLesson: id }));
  mockNavigate.mockImplementation(href => { expect(href).toEqual(target); dispatch(CommonActions.navigate(lessonRoute, params)); });
  mockDismissTo.mockImplementation(href => { expect(href).toEqual(target); dispatch(StackActions.popTo(lessonRoute, params)); });
  mockCanGoBack = () => state.index > 0;
  mockBack.mockImplementation(() => dispatch(CommonActions.goBack()));
  await saveLessonPosition("mainsheet", { step: "try", diagram: 1 });
  await saveFoundationPosition("wind-direction", { step: "practice", diagram: 2 });
  await AsyncStorage.multiSet([
    [SAIL_PROGRESS_KEY, JSON.stringify({ version: 1, checked: ["rig-basics"], current: "mainsheet" })],
    [PRACTICE_RESULTS_KEY, JSON.stringify({ version: 1, completed: { mainsheet: 123 } })],
    ["regatta.bootcamp-quiz.v1", JSON.stringify({ "wind-direction": { score: 3, total: 3, answeredAt: 123 } })],
  ]);
  const keys = [LESSON_POSITION_KEY, FOUNDATION_POSITION_KEY, SAIL_PROGRESS_KEY, PRACTICE_RESULTS_KEY, "regatta.bootcamp-quiz.v1"];
  const savedBefore = await AsyncStorage.multiGet(keys);
  expect(savedBefore.every(([, value]) => value !== null)).toBe(true);
  const practice = render(<SimWebView path="/simulator-v3" title="Trainer" tier="trainer"
    query={kind === "sails" ? { lesson: id } : { fromLesson: id }} />);
  fireEvent.press(practice.getByRole("button", { name: kind === "sails" ? "Return to the lesson" : "Return to lesson" }));
  expect(state.routes.map(route => route.name)).toEqual([outline, lessonRoute]);
  expect(state.routes[state.index].key).toBe(originalLessonKey);
  expect(state.routes[state.index].params).toEqual(params);
  practice.unmount();
  const lessonHeader = render(<ActivityBack fallback="/learn" />);
  fireEvent.press(lessonHeader.getByRole("button", { name: "Back" }));
  expect(state.routes.map(route => route.name)).toEqual([outline]);
  expect(await AsyncStorage.multiGet(keys)).toEqual(savedBefore);
  if (kind === "sails") expect((await loadLessonPositions()).lessons[id]).toEqual({ step: "try", diagram: 1 });
  else expect((await loadFoundationPositions())[id]).toEqual({ step: "practice", diagram: 2 });
});

it("a standalone sail practice returns to its known lesson without leaving a trainer behind", () => {
  const stack = StackRouter({ initialRouteName: "simulator-v3/index" });
  const config = { routeNames: ["simulator-v3/index", "learn/sails/[lesson]"], routeParamList: {}, routeGetIdList: {} };
  let state = stack.getInitialState(config);
  mockDismissTo.mockImplementation(href => {
    expect(href).toEqual({ pathname: "/learn/sails/[lesson]", params: { lesson: "mainsheet" } });
    const next = stack.getStateForAction(state, StackActions.popTo("learn/sails/[lesson]", { lesson: "mainsheet" }), config);
    if (!next || next.stale !== false) throw new Error("Standalone return did not return a hydrated state");
    state = next;
  });
  const view = render(<SimWebView path="/simulator-v3" title="Trainer" tier="trainer" query={{ lesson: "mainsheet" }} />);
  fireEvent.press(view.getByRole("button", { name: "Return to the lesson" }));
  expect(state.routes.map(route => route.name)).toEqual(["learn/sails/[lesson]"]);
  expect(state.routes[0].params).toEqual({ lesson: "mainsheet" });
});

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
  expect(web.props.injectedJavaScriptBeforeContentLoaded).toContain(APP_EMBED_THEME_SCRIPT);
  expect(web.props.injectedJavaScript).toContain(APP_EMBED_THEME_SCRIPT);
  expect(web.props.injectedJavaScript).not.toContain("background: #0a1628 !important");
  expect(web.props.onShouldStartLoadWithRequest({ url: "https://weektoregatta.com/simulator2", navigationType: "other" })).toBe(false);
  expect(web.props.onShouldStartLoadWithRequest({ url: local.uri, navigationType: "other" })).toBe(true);
  fireEvent(web, "message", { nativeEvent: { data: "scene-error" } });
  expect(view.getByText("The local simulator could not open. Retry or open simplified Basics. No internet is needed.")).toBeTruthy();
  fireEvent.press(view.getByText("Retry"));
  expect(view.getByTestId("webview").props.source).toEqual(local);
});

it("boots the shared race from the local asset with native replay and preferences before content", async () => {
  const local = { uri: "file:///bundle/sailing-offline.html" };
  const handle = jest.fn();
  const replay = { schema: 1, id: "saved-race" };
  const view = render(<SimWebView path="/game" title="Race" fullScreen offlineSource={local}
      query={{ view: "3d", scene: "next", mode: "pro" }} raceReplay={replay}
      localStorage={{ "regatta.race.mode.v1": "pro", "regatta.race-resume.v1": null }}
      offlineBridgeScript="window.raceBridge = true;" onOfflineMessage={handle} />);
  await act(async () => {});
  const web = view.getByTestId("webview");
  expect(web.props.source).toEqual(local);
  const bootstrap = web.props.injectedJavaScriptBeforeContentLoaded;
  expect(bootstrap).toContain("window.__REGATTA_RACE_NATIVE__ = true");
  expect(bootstrap).toContain('window.__REGATTA_RACE_REPLAY__ = {"schema":1,"id":"saved-race"}');
  expect(bootstrap).toContain('"path":"/game"');
  expect(bootstrap).toContain("view=3d&scene=next&mode=pro");
  expect(bootstrap).toContain("localStorage.removeItem(k)");
  expect(bootstrap).toContain("window.raceBridge = true");
  const message = JSON.stringify({ type: "native-navigate", href: "/history" });
  fireEvent(web, "message", { nativeEvent: { data: message } });
  expect(handle).toHaveBeenCalledWith(message, expect.any(Function));
  fireEvent(web, "message", { nativeEvent: { data: "app-error" } });
  expect(view.getByText("The race could not open. Retry or return to the race menu. No internet is needed.")).toBeTruthy();
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

it("routes actual offline lesson links instead of silently discarding the native navigation message", () => {
  const view = render(<SimWebView path="/simulator-v3" title="Trainer" tier="trainer" offlineSource={{ uri: "file:///bundle/sailing-offline.html" }} />);
  const web = view.getByTestId("webview");
  fireEvent(web, "message", { nativeEvent: { data: JSON.stringify({ type: "native-navigate", href: "/learn/sails/mainsheet" }) } });
  expect(mockNavigate).toHaveBeenCalledWith("/learn/sails/mainsheet");
  mockNavigate.mockClear();
  fireEvent(web, "message", { nativeEvent: { data: JSON.stringify({ type: "native-navigate", href: "https://example.com" }) } });
  expect(mockNavigate).not.toHaveBeenCalled();
});

// Trainer controls (owner decisions 2026-10-19): the app's record reaches the
// page before it runs, and a change made in the page's own settings sheet is
// stored by the app under the same key the website uses.
it("passes trainer control prefs to the page and stores the ones it posts back", async () => {
  const view = render(<SimWebView path="/simulator-v3" title="Trainer" tier="trainer" />);
  const web = view.getByTestId("webview");
  expect(web.props.injectedJavaScriptBeforeContentLoaded).toContain("window.__REGATTA_CONTROLS__ = ");
  const posted = JSON.stringify({ type: "controls-prefs", prefs: { version: 1, mode: "wheels", sound: true, helmMapping: { trainer: "rudder" } } });
  await act(async () => { fireEvent(web, "message", { nativeEvent: { data: posted } }); });
  const stored = JSON.parse((await AsyncStorage.getItem("regatta.controls.v1")) ?? "{}");
  expect(stored.mode).toBe("wheels");
  expect(stored.sound).toBe(true);
  expect(stored.helmMapping).toEqual({ trainer: "rudder" });
  // A controls message is not a load signal or a checkpoint.
  expect(view.queryByText("Retry")).toBeNull();
});
