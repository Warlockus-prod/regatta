import { act, render, waitFor } from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SharedRaceHost from "../src/game/SharedRaceHost";
import { RACE_STORAGE_BRIDGE_SCRIPT } from "../src/persistence/race-web-storage";
import { NATIVE_STORAGE_SYNC_FLAG } from "../src/simulator/SimWebView";
import { GHOST_STORAGE_KEY, ghostClassKey, makeGhostTrack, readGhostStore } from "../../src/lib/race-ghost";
import { LEGACY_RACE_CONTEXT } from "../../src/lib/race-context";
import { nativeDiagnostics } from "../src/diagnostics/journal";

// Contract (M4-4): the real race host and WebView wrapper against a page that
// runs the real injected scripts. After a relaunch the ghost row stored in
// AsyncStorage is in the page's localStorage before the race code runs. When
// the race ends and the page writes two rows back to back (the resume row
// removed, then the new ghost), native storage ends with the new ghost, the
// page keeps it, and no row is posted back and forth afterwards.

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("../assets/sailing-offline.html", () => ({ uri: "file:///bundle/sailing-offline.html" }));
jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ replace: jest.fn(), navigate: jest.fn(), dismissTo: jest.fn(), canGoBack: () => true, back: jest.fn() }),
  usePathname: () => "/game",
  useLocalSearchParams: () => ({}),
}));
jest.mock("expo-keep-awake", () => ({ activateKeepAwakeAsync: jest.fn(async () => undefined), deactivateKeepAwake: jest.fn(async () => undefined) }));
jest.mock("../src/analytics", () => ({ AnalyticsEvent: { RaceFinished: "race_finished", RaceStarted: "race_started" }, useAnalytics: () => ({ capture: jest.fn() }) }));
jest.mock("../src/i18n/context", () => ({ useI18n: () => ({ lang: "en", tp: (_ru: string, en: string) => en, tl: (values: { en: string }) => values.en }) }));
jest.mock("../src/design-system/components", () => {
  const React = require("react");
  const { View, Text, Pressable } = require("react-native");
  return { Screen: ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children), Text, Button: (props: object) => React.createElement(Pressable, props) };
});
jest.mock("../src/persistence/analytics-consent", () => ({
  ...jest.requireActual("../src/persistence/analytics-consent"),
  useAnalyticsConsent: () => ({ enabled: true, ready: true, setEnabled: () => {} }),
}));

/** A page with its own localStorage that runs injected scripts as WKWebView would. */
function createPage() {
  const vm = require("node:vm");
  const data = new Map<string, string>();
  class Storage {
    getItem(key: string) { return data.has(String(key)) ? data.get(String(key))! : null; }
    setItem(key: string, value: string) { data.set(String(key), String(value)); }
    removeItem(key: string) { data.delete(String(key)); }
  }
  const localStorage = new Storage();
  const posts: string[] = [];
  const page: { data: Map<string, string>; posts: string[]; deliver: ((message: string) => void) | null; run: (script: string) => void } = {
    data, posts, deliver: null, run: () => undefined,
  };
  const permissive: object = new Proxy(function () { /* any DOM call */ }, {
    get: (_t, p) => (p === Symbol.toPrimitive ? () => "" : permissive), apply: () => permissive, set: () => true,
  });
  const win: Record<string, unknown> = {
    localStorage, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
    ReactNativeWebView: { postMessage: (message: string) => { posts.push(message); page.deliver?.(message); } },
  };
  win.window = win;
  class PageEvent { constructor(public type: string) {} }
  const context = vm.createContext({ window: win, localStorage, Storage, Event: PageEvent, CustomEvent: PageEvent, document: permissive, navigator: {} });
  page.run = (script: string) => { vm.runInContext(script, context); };
  return page;
}
const mockPage = { current: createPage() };

jest.mock("react-native-webview", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { WebView: React.forwardRef((props: { injectedJavaScriptBeforeContentLoaded: string; onMessage?: (e: object) => void }, ref: unknown) => {
    const latest = React.useRef(props);
    latest.current = props;
    React.useImperativeHandle(ref, () => ({ injectJavaScript: (script: string) => mockPage.current.run(script) }), []);
    React.useEffect(() => {
      // postMessage reaches native asynchronously, as in the real WebView.
      mockPage.current.deliver = message => { setTimeout(() => latest.current.onMessage?.({ nativeEvent: { data: message } }), 0); };
      mockPage.current.run(props.injectedJavaScriptBeforeContentLoaded);
    }, []);
    return React.createElement(View, { ...props, testID: "webview" });
  }) };
});

const RESUME = "regatta.race-resume.v1";
const key = ghostClassKey({ raceContext: LEGACY_RACE_CONTEXT, mode: "simple", difficulty: "easy", windStrength: "medium", missionId: null });
const ghostRow = (finish: number) => JSON.stringify({ [key]: makeGhostTrack(key, finish,
  Array.from({ length: 600 }, (_, i) => ({ t: i * .5, x: 400 + i / 3, y: 1000 - i, heading: 352.25, speed: 5.5, lap: i < 300 ? 0 : 1 })), [150])! });
const settle = async () => { for (let i = 0; i < 30; i += 1) await act(async () => { await new Promise(resolve => setTimeout(resolve, 5)); }); };

let unmount: (() => void) | null = null;
let restore: (() => void) | null = null;
beforeEach(async () => { await AsyncStorage.clear(); mockPage.current = createPage(); });
afterEach(() => { unmount?.(); unmount = null; mockPage.current.deliver = null; restore?.(); restore = null; });

it("keeps the bridge silent while the app writes rows into the page", () => {
  expect(RACE_STORAGE_BRIDGE_SCRIPT).toContain(NATIVE_STORAGE_SYNC_FLAG);
});

/** Native writes take a few milliseconds, so the host renders between two persists. */
function slowNativeWrites() {
  const slow = <T extends unknown[]>(original: (...args: T) => Promise<void>) => async (...args: T) => {
    await new Promise(resolve => setTimeout(resolve, 15));
    await original(...args);
  };
  // The jest AsyncStorage mock's methods are jest.fn: wrap their own implementation, not the mock itself.
  const setMock = AsyncStorage.multiSet as jest.Mock, removeMock = AsyncStorage.multiRemove as jest.Mock;
  const realSet = setMock.getMockImplementation()!, realRemove = removeMock.getMockImplementation()!;
  setMock.mockImplementation(slow(realSet));
  removeMock.mockImplementation(slow(realRemove));
  restore = () => { setMock.mockImplementation(realSet); removeMock.mockImplementation(realRemove); };
}

it("ends with the page's last value when it writes one row twice before the first write lands", async () => {
  const VIEW = "regatta.race.view.v1";
  await AsyncStorage.setItem(VIEW, "3d");
  slowNativeWrites();
  const view = render(<SharedRaceHost />);
  unmount = view.unmount;
  await waitFor(() => expect(view.getByTestId("webview")).toBeTruthy());
  mockPage.current.run(`localStorage.setItem("${VIEW}", "2d"); localStorage.setItem("${VIEW}", "3d"); localStorage.setItem("${VIEW}", "2d");`);
  await settle();
  expect(await AsyncStorage.getItem(VIEW)).toBe("2d");
  expect(mockPage.current.data.get(VIEW)).toBe("2d");
  expect(mockPage.current.posts).toHaveLength(3);
});

it("brings the stored ghost back before load and keeps the new one after two race-end writes", async () => {
  const oldGhost = ghostRow(320);
  const newGhost = ghostRow(300);
  await AsyncStorage.multiSet([[GHOST_STORAGE_KEY, oldGhost], [RESUME, '{"setup":1}']]);
  slowNativeWrites();
  const view = render(<SharedRaceHost />);
  unmount = view.unmount;
  await waitFor(() => expect(view.getByTestId("webview")).toBeTruthy());
  // Relaunch path: AsyncStorage -> host -> before-load script -> the page's readGhostStore.
  expect(view.getByTestId("webview").props.injectedJavaScriptBeforeContentLoaded).toContain(JSON.stringify(oldGhost));
  expect(readGhostStore(mockPage.current.data.has(GHOST_STORAGE_KEY) ? { getItem: k => mockPage.current.data.get(k) ?? null } : null)[key]?.finishTimeSec).toBe(320);
  expect(mockPage.current.posts).toEqual([]);

  // Race end: clearRaceSetup() then writeGhostStore(), two bridged messages.
  mockPage.current.run(`localStorage.removeItem(${JSON.stringify(RESUME)}); localStorage.setItem(${JSON.stringify(GHOST_STORAGE_KEY)}, ${JSON.stringify(newGhost)});`);
  await settle();
  expect(await AsyncStorage.getItem(GHOST_STORAGE_KEY)).toBe(newGhost);
  expect(await AsyncStorage.getItem(RESUME)).toBeNull();
  expect(mockPage.current.data.get(GHOST_STORAGE_KEY)).toBe(newGhost);
  // Only the page's own two writes crossed the bridge, nothing echoed back.
  expect(mockPage.current.posts).toHaveLength(2);
});

it("leaves a diagnostic trace when a ghost row is refused or cannot be stored", async () => {
  await nativeDiagnostics.clear();
  const view = render(<SharedRaceHost />);
  unmount = view.unmount;
  await waitFor(() => expect(view.getByTestId("webview")).toBeTruthy());
  const ghostTrace = (outcome: string) => nativeDiagnostics.snapshot().entries.some(entry => entry.event.type === "storage.operation"
    && entry.event.target === "ghost" && entry.event.outcome === outcome);
  mockPage.current.run(`localStorage.setItem(${JSON.stringify(GHOST_STORAGE_KEY)}, "{not a ghost");`);
  await settle();
  expect(ghostTrace("rejected")).toBe(true);
  expect(await AsyncStorage.getItem(GHOST_STORAGE_KEY)).toBeNull();
  (AsyncStorage.multiSet as jest.Mock).mockRejectedValueOnce(new Error("disk full"));
  mockPage.current.run(`localStorage.setItem(${JSON.stringify(GHOST_STORAGE_KEY)}, ${JSON.stringify(ghostRow(300))});`);
  await settle();
  expect(ghostTrace("failed")).toBe(true);
  // A small preference row that fails is not reported as a ghost loss.
  await nativeDiagnostics.clear();
  (AsyncStorage.multiSet as jest.Mock).mockRejectedValueOnce(new Error("disk full"));
  mockPage.current.run(`localStorage.setItem("regatta.race.view.v1", "2d");`);
  await settle();
  expect(ghostTrace("failed")).toBe(false);
});
