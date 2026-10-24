import { act, fireEvent, render, renderHook, waitFor } from "@testing-library/react-native";
import { Alert, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-router", () => ({ Stack: { Screen: () => null }, useNavigation: () => mockNavigation }));
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

const mockInject = jest.fn();
const mockNavigation = { addListener: jest.fn(() => () => {}), dispatch: jest.fn() };
const storage = { read: readSternikEntries, parse: parseSternikEntries, persist: persistSternikEntries, bootstrap: sternikBootstrap, response: sternikStorageEvent };
const props = { asset: 42, title: "Sternik", baseUrl: "https://weektoregatta.com/sternik", href: "/sternik", readyMessage: "sternik-offline-ready", errorMessage: "sternik-offline-error", progressMessage: "sternik-offline-progress", messageLimit: STERNIK_MESSAGE_LIMIT, storage, localHref: sternikHref, examBase: "sternik" as const };
const send = (web: ReturnType<typeof render>["root"], data: object) => act(() => fireEvent(web, "message", { nativeEvent: { data: JSON.stringify(data) } }));
beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); (loadLocalCourseHtml as jest.Mock).mockResolvedValue("<html>bundled-only</html>"); });

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
  mockInject.mockClear();
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("disk full"));
  const entries = { "sternik.examBase.v1": "materialy" };
  send(web, { type: "sternik-offline-progress", entries });
  await waitFor(() => view.getByText("Ponów zapis"));
  expect(mockInject).not.toHaveBeenCalledWith(expect.stringContaining("sternik-storage-saved"));
  fireEvent.press(view.getByText("Ponów zapis"));
  await waitFor(() => expect(mockInject).toHaveBeenLastCalledWith(expect.stringContaining("sternik-storage-saved")));
  expect(await readSternikEntries()).toEqual(entries);
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
  expect(alert).toHaveBeenCalledWith("Wyjść z egzaminu?", expect.any(String), expect.any(Array));
  act(() => alert.mock.calls[0][2]![1].onPress!());
  expect(onOpenRadio).toHaveBeenCalledTimes(1);
  const result = { type: "exam-finished", base: "sternik", score: 66, total: 75, passed: true };
  send(web, { ...result, base: "src" }); send(web, result); send(web, result);
  expect(onExamFinished).toHaveBeenCalledTimes(1);
  expect(onExamFinished).toHaveBeenCalledWith({ base: "sternik", score: 66, total: 75, passed: true });
});

it("keeps unreadable native progress untouched and offers an offline retry", async () => {
  await AsyncStorage.setItem(STERNIK_STORAGE_KEY, "unreadable");
  const view = render(<LocalCourseWebView {...props} />);
  await waitFor(() => view.getByText("Ponów"));
  expect(view.queryByTestId("local-course-webview")).toBeNull();
  expect(await AsyncStorage.getItem(STERNIK_STORAGE_KEY)).toBe("unreadable");
  await AsyncStorage.setItem(STERNIK_STORAGE_KEY, "{}");
  fireEvent.press(view.getByText("Ponów"));
  await waitFor(() => view.getByTestId("local-course-webview"));
});
