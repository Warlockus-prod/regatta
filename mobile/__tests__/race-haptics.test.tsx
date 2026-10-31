import { act, fireEvent, render } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";
import { SimWebView } from "../src/simulator/SimWebView";
import { NATIVE_HAPTIC_MIN_INTERVAL_MS, createNativeRaceHaptics, parseRaceHapticMessage, playNativeRaceHaptic } from "../src/simulator/race-haptics";
import { RACE_STORAGE_BRIDGE_SCRIPT, RACE_WEB_STORAGE_KEYS, parseRaceStorageEntries } from "../src/persistence/race-web-storage";

// Contract (M3-4, decision #4): the race WebView may ask for a haptic only
// with {"type":"race-haptic","event":<start|mark|contact|finish>} and only on
// the race screens (/game, /multiplayer); the app maps each event to its own
// expo-haptics feedback, plays at most one per 300 ms, refuses every other
// shape and every other WebView, and never passes the message on. The
// vibration choice (regatta.race.haptics.v1) crosses the race storage bridge.

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

const mockWebInstances: object[] = [];
jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ replace: jest.fn(), navigate: jest.fn(), dismissTo: jest.fn(), canGoBack: () => true, back: jest.fn() }),
  usePathname: () => "/game",
}));
jest.mock("expo-keep-awake", () => ({ activateKeepAwakeAsync: jest.fn(async () => undefined), deactivateKeepAwake: jest.fn(async () => undefined) }));
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

const msg = (event: unknown) => JSON.stringify({ type: "race-haptic", event });
const impact = Haptics.impactAsync as jest.Mock;
const notify = Haptics.notificationAsync as jest.Mock;
const local = { uri: "file:///bundle/sailing-offline.html" };

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(1_000_000); impact.mockClear(); notify.mockClear(); (Haptics.selectionAsync as jest.Mock).mockClear(); mockWebInstances.length = 0; });
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

describe("message validation", () => {
  it("accepts exactly the four race events", () => {
    for (const event of ["start", "mark", "contact", "finish"]) expect(parseRaceHapticMessage(msg(event))).toBe(event);
  });

  it("refuses any other event, extra keys, other types and malformed text", () => {
    for (const raw of [
      msg("rudder"), msg("wheel"), msg("sheet"), msg(""), msg(1), msg(null), msg(["start"]),
      JSON.stringify({ type: "race-haptic", event: "start", pattern: [500] }),
      JSON.stringify({ type: "race-haptic" }),
      JSON.stringify({ event: "start", type: "race-haptic" }),
      JSON.stringify({ type: "race-haptics", event: "start" }),
      '{"type":"race-haptic","event":"start"', '{"type":"race-haptic","event":"start"}' + " ".repeat(64),
      "start", "",
    ]) expect(parseRaceHapticMessage(raw)).toBeNull();
    expect(parseRaceHapticMessage(undefined)).toBeNull();
    expect(parseRaceHapticMessage({ type: "race-haptic", event: "start" })).toBeNull();
  });
});

describe("mapping to expo-haptics", () => {
  it("gives each event its own feedback", async () => {
    await playNativeRaceHaptic("start"); await playNativeRaceHaptic("mark");
    await playNativeRaceHaptic("contact"); await playNativeRaceHaptic("finish");
    expect(impact.mock.calls).toEqual([[Haptics.ImpactFeedbackStyle.Heavy], [Haptics.ImpactFeedbackStyle.Medium]]);
    expect(notify.mock.calls).toEqual([[Haptics.NotificationFeedbackType.Warning], [Haptics.NotificationFeedbackType.Success]]);
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });
});

describe("throttle and screens", () => {
  it("plays at most one haptic per 300 ms on a fake clock", () => {
    let t = 0;
    const play = jest.fn(async () => undefined);
    const haptics = createNativeRaceHaptics({ now: () => t, play });
    expect(haptics.handle("/game", msg("mark"))).toBe("played");
    t = 120; expect(haptics.handle("/game", msg("contact"))).toBe("throttled");
    t = NATIVE_HAPTIC_MIN_INTERVAL_MS - 1; expect(haptics.handle("/game", msg("finish"))).toBe("throttled");
    t = NATIVE_HAPTIC_MIN_INTERVAL_MS; expect(haptics.handle("/multiplayer", msg("finish"))).toBe("played");
    expect(play.mock.calls).toEqual([["mark"], ["finish"]]);
  });

  it("refuses a haptic from any screen but the race and the live room, without touching the throttle", () => {
    let t = 0;
    const play = jest.fn(async () => undefined);
    const haptics = createNativeRaceHaptics({ now: () => t, play });
    for (const path of ["/simulator-v3", "/simulator2", "/simulator-v1", "/anatomy", "/radio/symulator", "/learn/sails"]) expect(haptics.handle(path, msg("start"))).toBe("refused");
    expect(haptics.handle("/game", msg("rudder"))).toBe("refused");
    expect(play).not.toHaveBeenCalled();
    expect(haptics.handle("/game", msg("start"))).toBe("played");
  });

  it("leaves other messages to the WebView's other handlers", () => {
    const haptics = createNativeRaceHaptics({ now: () => 0, play: jest.fn(async () => undefined) });
    expect(haptics.handle("/game", '{"type":"race-storage","entries":{}}')).toBeNull();
    expect(haptics.handle("/game", "app-ready")).toBeNull();
  });

  it("survives a haptics engine that fails", () => {
    const haptics = createNativeRaceHaptics({ now: () => 0, play: () => Promise.reject(new Error("no engine")) });
    expect(haptics.handle("/game", msg("finish"))).toBe("played");
  });
});

describe("in the WebView", () => {
  it("plays a race haptic on the race screen and never hands it to the page's own handler", async () => {
    const offline = jest.fn();
    const view = render(<SimWebView path="/game" title="Race" fullScreen offlineSource={local} onOfflineMessage={offline} />);
    await act(async () => {});
    const web = view.getByTestId("webview");
    fireEvent(web, "message", { nativeEvent: { data: msg("finish") } });
    expect(notify).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    // Within 300 ms: dropped.
    jest.setSystemTime(1_000_000 + 10_000 + 100);
    fireEvent(web, "message", { nativeEvent: { data: msg("start") } });
    jest.setSystemTime(1_000_000 + 10_000 + 200);
    fireEvent(web, "message", { nativeEvent: { data: msg("mark") } });
    expect(impact.mock.calls).toEqual([[Haptics.ImpactFeedbackStyle.Heavy]]);
    expect(offline).not.toHaveBeenCalled();
    view.unmount();
  });

  it("announces the haptics handler to race pages only, before and after load", async () => {
    for (const [path, flag] of [["/game", true], ["/multiplayer", true], ["/simulator-v3", false], ["/anatomy", false]] as const) {
      const view = render(<SimWebView path={path} title="Screen" fullScreen />);
      await act(async () => {});
      const web = view.getByTestId("webview");
      for (const prop of ["injectedJavaScriptBeforeContentLoaded", "injectedJavaScript"]) {
        expect(`${path} ${prop}: ${web.props[prop]}`).toContain(`window.__REGATTA_RACE_HAPTICS__ = ${flag};`);
      }
      view.unmount();
    }
  });

  it("ignores a race haptic from a trainer WebView", async () => {
    jest.setSystemTime(2_000_000);
    const offline = jest.fn();
    const view = render(<SimWebView path="/simulator-v3" title="Trainer" tier="trainer" offlineSource={local} onOfflineMessage={offline} />);
    await act(async () => {});
    fireEvent(view.getByTestId("webview"), "message", { nativeEvent: { data: msg("contact") } });
    expect(impact).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
    expect(offline).not.toHaveBeenCalled();
    view.unmount();
  });
});

it("lets the vibration choice cross the race storage bridge", () => {
  expect(RACE_WEB_STORAGE_KEYS).toContain("regatta.race.haptics.v1");
  expect(RACE_STORAGE_BRIDGE_SCRIPT).toContain('"regatta.race.haptics.v1"');
  expect(parseRaceStorageEntries({ "regatta.race.haptics.v1": "off" })).toEqual({ "regatta.race.haptics.v1": "off" });
});
