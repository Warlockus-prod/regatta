import { act, fireEvent, render, renderHook, waitFor } from "@testing-library/react-native";
import { Alert, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NavigationAction } from "@react-navigation/native";
import type { ReactNode } from "react";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-router", () => ({ Stack: { Screen: (props: object) => mockStackScreen(props) }, usePathname: () => "/kursy/motorowodny", useNavigation: () => mockNavigation, useRouter: () => ({ canGoBack: mockNavigation.canGoBack, back: mockNavigation.goBack, replace: mockReplace }) }));
jest.mock("../src/i18n/context", () => ({ useI18n: () => ({ lang: "pl", tp: (_ru: string, _en: string, pl: string) => pl }) }));
jest.mock("@react-navigation/native", () => ({ usePreventRemove: (enabled: boolean, callback: GuardCallback) => mockUsePreventRemove(enabled, callback) }));
jest.mock("../src/design-system/components", () => ({ Screen: (props: object) => jest.requireActual("react").createElement(jest.requireActual("react-native").View, { ...props, testID: "course-screen" }), Text: jest.requireActual("react-native").Text }));
jest.mock("../src/course/local-course-asset", () => ({ loadLocalCourseHtml: jest.fn().mockResolvedValue("<html>bundled-only</html>") }));
jest.mock("react-native-webview", () => {
  const React = require("react"); const { View } = require("react-native");
  return { WebView: React.forwardRef((props: object, ref: unknown) => { React.useImperativeHandle(ref, () => ({ injectJavaScript: mockInject })); return React.createElement(View, props); }) };
});

import { LocalCourseWebView } from "../src/course/LocalCourseWebView";
import { loadLocalCourseHtml } from "../src/course/local-course-asset";
import { ANALYTICS_CONSENT_KEY, WEB_NO_ANALYTICS_SCRIPT, useAnalyticsConsent } from "../src/persistence/analytics-consent";
import { parseSternikEntries, persistSternikEntries, readSternikEntries, sternikBootstrap, sternikHref, sternikStorageEvent, STERNIK_MESSAGE_LIMIT, STERNIK_STORAGE_KEY } from "../src/persistence/sternik-storage";
import { mainNavigationHiddenByScreen } from "../src/navigation/visibility";
import { nativeDiagnostics } from "../src/diagnostics/journal";

type GuardCallback = (event: { data: { action: NavigationAction } }) => void;
const mockUsePreventRemove = jest.fn<void, [boolean, GuardCallback]>();
const mockStackScreen = jest.fn((props: { options?: { headerLeft?: () => ReactNode } }) => props.options?.headerLeft?.() ?? null);
const mockInject = jest.fn();
const mockReplace = jest.fn();
const mockNavigation = { addListener: jest.fn(() => () => {}), dispatch: jest.fn(), goBack: jest.fn(), canGoBack: jest.fn(() => true) };
const storage = { read: readSternikEntries, parse: parseSternikEntries, persist: persistSternikEntries, bootstrap: sternikBootstrap, response: sternikStorageEvent };
const props = { asset: 42, title: "Sternik", baseUrl: "https://weektoregatta.com/sternik", href: "/sternik", readyMessage: "sternik-offline-ready", errorMessage: "sternik-offline-error", progressMessage: "sternik-offline-progress", messageLimit: STERNIK_MESSAGE_LIMIT, storage, localHref: sternikHref, examBase: "sternik" as const };
const send = (web: ReturnType<typeof render>["root"], data: object) => act(() => fireEvent(web, "message", { nativeEvent: { data: JSON.stringify(data) } }));
beforeEach(async () => { await nativeDiagnostics.clear(); jest.clearAllMocks(); mockNavigation.canGoBack.mockReturnValue(true); await AsyncStorage.clear(); (loadLocalCourseHtml as jest.Mock).mockResolvedValue("<html>bundled-only</html>"); });

it("consumes diagnostic batches before the course protocol, forces its host surface and rejects private fields", async () => {
  const view = render(<LocalCourseWebView {...props} />);
  const web = await waitFor(() => view.getByTestId("local-course-webview"));
  const control = { type: "control.change", surface: "radio", control: "rudder", value: .2, outcome: "accepted" };
  const injectedBefore = mockInject.mock.calls.length;
  send(web, { type: "diagnostic-events", version: 1, events: [control] });
  expect(nativeDiagnostics.snapshot().entries.some(entry => entry.event.type === "control.change" && entry.event.surface === "sternik")).toBe(true);
  expect(mockInject).toHaveBeenCalledTimes(injectedBefore);
  send(web, { type: "diagnostic-events", version: 1, events: [{ ...control, text: "PRIVATE_COURSE_ANSWER" }] });
  expect(nativeDiagnostics.snapshot().entries.some(entry => entry.event.reason === "invalid-message" && entry.event.surface === "sternik")).toBe(true);
  expect(JSON.stringify(nativeDiagnostics.snapshot())).not.toContain("PRIVATE_COURSE_ANSWER");
  send(web, { type: "sternik-offline-ready" });
  expect(nativeDiagnostics.snapshot().entries.some(entry => entry.event.type === "embedded.lifecycle" && entry.event.action === "ready")).toBe(true);
});

it("loads packaged HTML with the legacy origin, consent and PL bootstrap, and routes all links locally", async () => {
  await AsyncStorage.setItem(ANALYTICS_CONSENT_KEY, JSON.stringify({ enabled: false }));
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  const view = render(<LocalCourseWebView {...props} />);
  expect(view.queryByTestId("local-course-webview")).toBeNull();
  const web = await waitFor(() => view.getByTestId("local-course-webview"));
  expect(web.props.source).toEqual({ html: "<html>bundled-only</html>", baseUrl: props.baseUrl });
  expect(web.props.injectedJavaScriptBeforeContentLoaded.startsWith(WEB_NO_ANALYTICS_SCRIPT)).toBe(true);
  expect(web.props.injectedJavaScriptBeforeContentLoaded).toContain('__REGATTA_APP_LANG__="pl"');
  expect(web.props.mediaCapturePermissionGrantType).toBe("deny");
  expect(view.getByTestId("course-screen").props.noBottomInset).not.toBe(true);
  expect(view.getByTestId("course-screen").props.noTopInset).not.toBe(true);
  send(web, { type: "sternik-offline-ready" });
  expect(web.props.onShouldStartLoadWithRequest({ url: "https://weektoregatta.com/sternik/test?cat=locja", navigationType: "click" })).toBe(false);
  expect(mockInject).toHaveBeenLastCalledWith(expect.stringContaining("regatta:sternik-navigate"));
  expect(web.props.onShouldStartLoadWithRequest({ url: "https://evil.test/page", navigationType: "other" })).toBe(false);
  expect(open).not.toHaveBeenCalled();
  view.rerender(<LocalCourseWebView {...props} href="/sternik/ustny" />);
  await waitFor(() => expect(mockInject).toHaveBeenLastCalledWith(expect.stringContaining("/sternik/ustny?lang=pl&embed=1")));
});

it("acknowledges only durable bounded progress and retries a failed save", async () => {
  const view = render(<LocalCourseWebView {...props} />);
  const web = await waitFor(() => view.getByTestId("local-course-webview"));
  send(web, { type: "sternik-offline-progress", entries: { "regatta.analytics.v1": "erase" } });
  expect(mockInject).toHaveBeenLastCalledWith(expect.stringContaining("sternik-storage-error"));
  expect(await AsyncStorage.getItem(STERNIK_STORAGE_KEY)).toBeNull();
  expect(nativeDiagnostics.snapshot().entries.some(entry => entry.event.type === "storage.operation" && entry.event.outcome === "rejected" && entry.event.reason === "storage-invalid")).toBe(true);
  mockInject.mockClear();
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("disk full"));
  const entries = { "sternik.examBase.v1": "materialy" };
  send(web, { type: "sternik-offline-progress", entries });
  await waitFor(() => view.getByText("Ponów zapis"));
  expect(nativeDiagnostics.snapshot().entries.some(entry => entry.event.type === "storage.operation" && entry.event.outcome === "failed" && entry.event.reason === "storage-write")).toBe(true);
  expect(mockInject).not.toHaveBeenCalledWith(expect.stringContaining("sternik-storage-saved"));
  fireEvent.press(view.getByText("Ponów zapis"));
  await waitFor(() => expect(mockInject).toHaveBeenLastCalledWith(expect.stringContaining("sternik-storage-saved")));
  expect(await readSternikEntries()).toEqual(entries);
  expect(nativeDiagnostics.snapshot().entries.some(entry => entry.event.type === "storage.operation" && entry.event.action === "write" && entry.event.outcome === "accepted")).toBe(true);
  const consent = renderHook(() => useAnalyticsConsent());
  await waitFor(() => expect(consent.result.current.ready).toBe(true));
  act(() => consent.result.current.setEnabled(false));
  await waitFor(() => expect(view.getByTestId("local-course-webview")).not.toBe(web));
  expect(view.getByTestId("local-course-webview").props.injectedJavaScriptBeforeContentLoaded).toContain('"sternik.examBase.v1":"materialy"');
  expect(view.getByTestId("local-course-webview").props.onShouldStartLoadWithRequest({ url: props.baseUrl, navigationType: "other" })).toBe(true);
});

it("offers an offline retry after a ready page reports a runtime error without losing progress", async () => {
  const entries = { "sternik.examBase.v1": "materialy" };
  await persistSternikEntries(entries);
  const view = render(<LocalCourseWebView {...props} />);
  const web = await waitFor(() => view.getByTestId("local-course-webview"));
  send(web, { type: "sternik-offline-ready" });
  send(web, { type: "sternik-offline-error" });
  expect(view.getByText("Ponów")).toBeTruthy();
  expect(view.getByText("Kod: course-page-runtime")).toBeTruthy();
  expect(await readSternikEntries()).toEqual(entries);
  fireEvent.press(view.getByText("Ponów"));
  await waitFor(() => expect(view.getByTestId("local-course-webview")).not.toBe(web));
  expect(view.getByTestId("local-course-webview").props.injectedJavaScriptBeforeContentLoaded).toContain('"sternik.examBase.v1":"materialy"');
});

it("protects an unfinished exam and relays a validated result once", async () => {
  const onOpenRadio = jest.fn(); const onExamFinished = jest.fn();
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const view = render(<LocalCourseWebView {...props} onOpenRadio={onOpenRadio} onExamFinished={onExamFinished} />);
  const web = await waitFor(() => view.getByTestId("local-course-webview"));
  send(web, { type: "exam-dirty", dirty: true });
  send(web, { type: "sternik-open-radio" });
  expect(onOpenRadio).not.toHaveBeenCalled();
  expect(alert).toHaveBeenCalledWith("Wyjść z egzaminu?", expect.any(String), expect.any(Array), expect.objectContaining({ cancelable: true }));
  act(() => alert.mock.calls[0][2]![1].onPress!());
  expect(onOpenRadio).toHaveBeenCalledTimes(1);
  const result = { type: "exam-finished", base: "sternik", score: 66, total: 75, passed: true };
  send(web, { ...result, base: "src" }); send(web, result); send(web, result);
  expect(onExamFinished).toHaveBeenCalledTimes(1);
  expect(onExamFinished).toHaveBeenCalledWith({ base: "sternik", score: 66, total: 75, passed: true });
});

it("prevents native-stack removal on Stay, continues the exact action once on Exit, and protects the next exam", async () => {
  const entries = { "sternik.examBase.v1": "materialy" };
  await persistSternikEntries(entries);
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const view = render(<LocalCourseWebView {...props} />);
  const web = await waitFor(() => view.getByTestId("local-course-webview"));
  expect(mockStackScreen).toHaveBeenLastCalledWith(expect.objectContaining({ options: expect.objectContaining({ headerBackButtonMenuEnabled: false }) }));
  expect(mockUsePreventRemove.mock.calls.at(-1)![0]).toBe(false);
  send(web, { type: "exam-dirty", dirty: true });
  expect(mockUsePreventRemove.mock.calls.at(-1)![0]).toBe(true);
  expect(mainNavigationHiddenByScreen()).toBe(true);
  const action: NavigationAction = { type: "POP", source: "course-route", target: "native-stack", payload: { count: 1 } };
  const attempt = () => act(() => mockUsePreventRemove.mock.calls.at(-1)![1]({ data: { action } }));
  attempt(); attempt();
  expect(alert).toHaveBeenCalledTimes(1);
  expect(mockNavigation.dispatch).not.toHaveBeenCalled();
  act(() => alert.mock.calls.at(-1)![2]![0].onPress!());
  expect(view.getByTestId("local-course-webview")).toBe(web);
  expect(mockUsePreventRemove.mock.calls.at(-1)![0]).toBe(true);
  expect(mainNavigationHiddenByScreen()).toBe(true);
  expect(mockNavigation.dispatch).not.toHaveBeenCalled();
  expect(await readSternikEntries()).toEqual(entries);
  attempt();
  const leave = alert.mock.calls.at(-1)![2]![1].onPress!;
  act(() => { leave(); leave(); });
  expect(mockNavigation.dispatch).toHaveBeenCalledTimes(1);
  expect(mockNavigation.dispatch.mock.calls[0][0]).toBe(action);
  expect(mockUsePreventRemove.mock.calls.at(-1)![0]).toBe(false);
  expect(mainNavigationHiddenByScreen()).toBe(false);
  expect(mockNavigation.addListener).not.toHaveBeenCalled();
  send(web, { type: "exam-dirty", dirty: true });
  expect(mockUsePreventRemove.mock.calls.at(-1)![0]).toBe(true);
  attempt();
  expect(alert).toHaveBeenCalledTimes(3);
  act(() => alert.mock.calls.at(-1)![3]!.onDismiss!());
  expect(mockUsePreventRemove.mock.calls.at(-1)![0]).toBe(true);
  expect(await readSternikEntries()).toEqual(entries);
  alert.mockRestore();
});

it("keeps a repeatable RN exam exit button after Stay and dismiss, without initiating a native pop", async () => {
  const entries = { "sternik.examBase.v1": "materialy" };
  await persistSternikEntries(entries);
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const view = render(<LocalCourseWebView {...props} />);
  const web = await waitFor(() => view.getByTestId("local-course-webview"));
  expect(view.queryByRole("button", { name: "Wyjdź z egzaminu" })).toBeNull();
  send(web, { type: "exam-dirty", dirty: true });
  expect(mockStackScreen).toHaveBeenLastCalledWith(expect.objectContaining({ options: expect.objectContaining({ headerBackVisible: false, gestureEnabled: false, headerLeft: expect.any(Function) }) }));
  const button = view.getByRole("button", { name: "Wyjdź z egzaminu" });
  fireEvent.press(button); fireEvent.press(button);
  expect(alert).toHaveBeenCalledTimes(1);
  act(() => alert.mock.calls.at(-1)![2]![0].onPress!());
  expect(view.getByRole("button", { name: "Wyjdź z egzaminu" })).toBe(button);
  fireEvent.press(button);
  expect(alert).toHaveBeenCalledTimes(2);
  act(() => alert.mock.calls.at(-1)![3]!.onDismiss!());
  expect(view.getByTestId("local-course-webview")).toBe(web);
  expect(mainNavigationHiddenByScreen()).toBe(true);
  expect(mockNavigation.goBack).not.toHaveBeenCalled();
  expect(mockNavigation.dispatch).not.toHaveBeenCalled();
  expect(await readSternikEntries()).toEqual(entries);
  fireEvent.press(view.getByRole("button", { name: "Wyjdź z egzaminu" }));
  expect(alert).toHaveBeenCalledTimes(3);
  const leave = alert.mock.calls.at(-1)![2]![1].onPress!;
  act(() => { leave(); leave(); });
  expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
  expect(mockUsePreventRemove.mock.calls.at(-1)![0]).toBe(false);
  expect(mainNavigationHiddenByScreen()).toBe(false);
  expect(view.queryByRole("button", { name: "Wyjdź z egzaminu" })).toBeNull();
  expect(mockStackScreen).toHaveBeenLastCalledWith(expect.objectContaining({ options: expect.objectContaining({ headerBackVisible: false, gestureEnabled: undefined, headerLeft: expect.any(Function) }) }));
  expect(view.getByRole("button", { name: "Wróć" })).toBeTruthy();
  alert.mockRestore();
});

it("keeps unreadable native progress untouched and offers an offline retry", async () => {
  await AsyncStorage.setItem(STERNIK_STORAGE_KEY, "unreadable");
  const view = render(<LocalCourseWebView {...props} />);
  await waitFor(() => view.getByText("Ponów"));
  expect(view.getByText("Kod: course-storage-read")).toBeTruthy();
  expect(view.queryByTestId("local-course-webview")).toBeNull();
  expect(await AsyncStorage.getItem(STERNIK_STORAGE_KEY)).toBe("unreadable");
  await AsyncStorage.setItem(STERNIK_STORAGE_KEY, "{}");
  fireEvent.press(view.getByText("Ponów"));
  await waitFor(() => view.getByTestId("local-course-webview"));
});

it("distinguishes packaged-file and WK load errors without logging content or rewriting progress", async () => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  (loadLocalCourseHtml as jest.Mock).mockRejectedValueOnce(new Error("course-asset-read"));
  const view = render(<LocalCourseWebView {...props} />);
  await waitFor(() => view.getByText("Kod: course-asset-read"));
  expect(view.queryByTestId("local-course-webview")).toBeNull();
  fireEvent.press(view.getByText("Ponów"));
  const web = await waitFor(() => view.getByTestId("local-course-webview"));
  act(() => fireEvent(web, "error", { nativeEvent: { code: -999, description: "private content", url: "https://private.test/answer" } }));
  expect(view.getByText("Kod: course-webview-load:-999")).toBeTruthy();
  expect(JSON.stringify(warn.mock.calls)).not.toMatch(/private/);
  expect(await AsyncStorage.getItem(STERNIK_STORAGE_KEY)).toBeNull();
  warn.mockRestore();
});

it("returns a deep-linked unfinished exam to Learn when its native stack has no previous screen", async () => {
  mockNavigation.canGoBack.mockReturnValue(false);
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const view = render(<LocalCourseWebView {...props} />);
  const web = await waitFor(() => view.getByTestId("local-course-webview"));
  send(web, { type: "exam-dirty", dirty: true });
  fireEvent.press(view.getByRole("button", { name: "Wyjdź z egzaminu" }));
  act(() => alert.mock.calls.at(-1)![2]![0].onPress!());
  expect(mockReplace).not.toHaveBeenCalled();
  fireEvent.press(view.getByRole("button", { name: "Wyjdź z egzaminu" }));
  act(() => alert.mock.calls.at(-1)![2]![1].onPress!());
  expect(mockReplace).toHaveBeenCalledWith("/learn");
  expect(mockNavigation.goBack).not.toHaveBeenCalled();
  alert.mockRestore();
});
