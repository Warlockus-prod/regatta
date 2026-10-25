import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert, Linking } from "react-native";
import type { ReactNode } from "react";
import type { NavigationAction } from "@react-navigation/native";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("../assets/radio-offline.html", () => 42);
jest.mock("expo-router", () => ({ Stack: { Screen: (props: object) => mockScreen(props) }, useNavigation: () => mockNavigation, useRouter: () => mockRouter }));
jest.mock("@react-navigation/native", () => ({ usePreventRemove: (enabled: boolean, callback: Guard) => mockPrevent(enabled, callback) }));
jest.mock("../src/design-system/components", () => ({ Screen: (props: object) => jest.requireActual("react").createElement(jest.requireActual("react-native").View, props), Text: jest.requireActual("react-native").Text }));
jest.mock("../src/i18n/context", () => ({ useI18n: () => ({ lang: "en", tp: (_ru: string, en: string) => en }) }));
jest.mock("../src/analytics/use-analytics", () => ({ useAnalytics: () => ({ capture: jest.fn() }) }));
jest.mock("../src/persistence/analytics-consent", () => ({ useAnalyticsConsent: () => ({ enabled: false, ready: true }), webAnalyticsGuardScript: () => "/* no analytics */" }));
jest.mock("../src/radio/useLocalRadioSpeech", () => ({ LOCAL_RADIO_SPEECH_SCRIPT: "/* local speech */", useLocalRadioSpeech: () => mockSpeech }));
jest.mock("../src/persistence/radio-storage", () => ({ ...jest.requireActual("../src/persistence/radio-storage"), readRadioEntries: jest.fn().mockResolvedValue(null), persistRadioEntries: jest.fn(async (entries: unknown) => entries) }));
jest.mock("react-native-webview", () => {
  const React = require("react");
  return { WebView: React.forwardRef((props: object, ref: unknown) => { React.useImperativeHandle(ref, () => ({ injectJavaScript: mockInject })); return React.createElement(require("react-native").View, { ...props, testID: "src-webview" }); }) };
});

import { OfflineRadioCourse } from "../src/course/OfflineRadioCourse";
import { darkColors } from "../src/design-system/tokens";
import { mainNavigationHiddenByScreen } from "../src/navigation/visibility";
import { persistRadioEntries, readRadioEntries } from "../src/persistence/radio-storage";
import { RADIO_FREE_HREF, RADIO_GUIDED_HREF } from "../../src/app/radio/navigation";

type Guard = (event: { data: { action: NavigationAction } }) => void;
const mockPrevent = jest.fn<void, [boolean, Guard]>();
const mockScreen = jest.fn((props: { options?: { headerShown?: boolean; headerLeft?: () => ReactNode } }) => props.options?.headerShown === false ? null : props.options?.headerLeft?.() ?? null);
const mockNavigation = { dispatch: jest.fn() };
const mockRouter = { back: jest.fn(), canGoBack: jest.fn(() => true), replace: jest.fn() };
const mockInject = jest.fn();
const mockSpeech = jest.fn(() => false);
const send = (web: ReturnType<typeof render>["root"], data: object) => act(() => fireEvent(web, "message", { nativeEvent: { data: JSON.stringify(data) } }));
beforeEach(() => { jest.clearAllMocks(); mockRouter.canGoBack.mockReturnValue(true); });

it("opens the actual local radio route with a matching dark native surface and no website-mode escape", async () => {
  const view = render(<OfflineRadioCourse />);
  const web = await waitFor(() => view.getByTestId("src-webview"));
  expect(web.props.source).toBe(42);
  expect(web.props.injectedJavaScriptBeforeContentLoaded).toContain(JSON.stringify(RADIO_FREE_HREF));
  expect(web.props.injectedJavaScriptBeforeContentLoaded).toContain("local speech");
  expect(web.props.injectedJavaScript).toBeUndefined();
  expect(view.getByRole("button", { name: "Back to app" })).toBeTruthy();
  send(web, { type: "radio-offline-ready" });
  expect(mockScreen).toHaveBeenLastCalledWith(expect.objectContaining({ options: expect.objectContaining({ headerShown: false, contentStyle: { backgroundColor: darkColors.bgPrimary } }) }));
  send(web, { type: "radio-open-online", path: RADIO_GUIDED_HREF });
  expect(mockInject).toHaveBeenLastCalledWith(expect.stringContaining("regatta:radio-navigate"));
  expect(web.props.source).toBe(42);
});

it("uses internal course Back while keeping explicit workspace exit tied to the app, including cold deep links", async () => {
  const view = render(<OfflineRadioCourse />);
  const web = await waitFor(() => view.getByTestId("src-webview"));
  send(web, { type: "radio-offline-ready" });
  send(web, { type: "radio-workspace", open: false });
  send(web, { type: "radio-route", href: "/radio/teoria", canGoBack: true });
  fireEvent.press(view.getByRole("button", { name: "Back" }));
  expect(mockInject).toHaveBeenLastCalledWith(expect.stringContaining("regatta:radio-back"));
  expect(mockRouter.back).not.toHaveBeenCalled();
  send(web, { type: "radio-exit" });
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
  mockRouter.canGoBack.mockReturnValue(false);
  send(web, { type: "radio-exit" });
  expect(mockRouter.replace).toHaveBeenCalledWith("/simulators");
});

it("keeps a native SRC exam mounted after Stay, then continues its exact blocked action once", async () => {
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  const view = render(<OfflineRadioCourse initialHref="/radio" />);
  const web = await waitFor(() => view.getByTestId("src-webview"));
  send(web, { type: "radio-exam-dirty", dirty: true });
  expect(mockPrevent.mock.calls.at(-1)![0]).toBe(true);
  expect(mainNavigationHiddenByScreen()).toBe(true);
  const action: NavigationAction = { type: "POP", source: "src-screen", target: "native-stack", payload: { count: 1 } };
  act(() => mockPrevent.mock.calls.at(-1)![1]({ data: { action } }));
  act(() => alert.mock.calls.at(-1)![2]![0].onPress!());
  expect(view.getByTestId("src-webview")).toBe(web);
  expect(mockNavigation.dispatch).not.toHaveBeenCalled();
  expect(mockPrevent.mock.calls.at(-1)![0]).toBe(true);
  act(() => mockPrevent.mock.calls.at(-1)![1]({ data: { action } }));
  const leave = alert.mock.calls.at(-1)![2]![1].onPress!;
  act(() => { leave(); leave(); });
  expect(mockNavigation.dispatch).toHaveBeenCalledTimes(1);
  expect(mockNavigation.dispatch.mock.calls[0][0]).toBe(action);
  expect(mockPrevent.mock.calls.at(-1)![0]).toBe(false);
  expect(mainNavigationHiddenByScreen()).toBe(false);
  alert.mockRestore();
});

it("rejects forged routes and opens official external references outside the installed course", async () => {
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  const view = render(<OfflineRadioCourse />);
  const web = await waitFor(() => view.getByTestId("src-webview"));
  send(web, { type: "radio-route", href: "https://outside.test", canGoBack: true });
  send(web, { type: "radio-open-online", path: "https://outside.test" });
  expect(mockInject).not.toHaveBeenCalled();
  expect(web.props.onShouldStartLoadWithRequest({ url: "https://bip.uke.gov.pl/reference" })).toBe(false);
  expect(open).toHaveBeenCalledWith("https://bip.uke.gov.pl/reference");
  open.mockRestore();
});

it("keeps an app exit and local retry visible when default free-practice progress cannot be read", async () => {
  jest.mocked(readRadioEntries).mockRejectedValueOnce(new Error("unreadable progress"));
  const view = render(<OfflineRadioCourse />);
  await waitFor(() => view.getByText("Retry"));
  expect(view.queryByTestId("src-webview")).toBeNull();
  expect(mainNavigationHiddenByScreen()).toBe(true);
  fireEvent.press(view.getByRole("button", { name: "Back to app" }));
  expect(mockRouter.back).toHaveBeenCalledTimes(1);
  expect(persistRadioEntries).not.toHaveBeenCalled();
  fireEvent.press(view.getByText("Retry"));
  const web = await waitFor(() => view.getByTestId("src-webview"));
  expect(web.props.source).toBe(42);
  send(web, { type: "radio-offline-ready" });
  send(web, { type: "radio-workspace", open: true });
  expect(view.queryByText("Retry")).toBeNull();
  expect(mockScreen.mock.calls.at(-1)![0].options?.headerShown).toBe(false);
  expect(persistRadioEntries).not.toHaveBeenCalled();
});

it("exits the app rather than injecting dead internal Back after the ready watchdog expires, and can retry locally", async () => {
  jest.useFakeTimers();
  try {
    const view = render(<OfflineRadioCourse />);
    await act(async () => { await Promise.resolve(); });
    const web = view.getByTestId("src-webview");
    send(web, { type: "radio-route", href: "/radio/teoria", canGoBack: true });
    act(() => { jest.advanceTimersByTime(15000); });
    expect(view.getByText("Retry")).toBeTruthy();
    mockRouter.canGoBack.mockReturnValue(false);
    fireEvent.press(view.getByRole("button", { name: "Back to app" }));
    expect(mockRouter.replace).toHaveBeenCalledWith("/simulators");
    expect(mockInject).not.toHaveBeenCalled();
    fireEvent.press(view.getByText("Retry"));
    await act(async () => { await Promise.resolve(); });
    const retried = view.getByTestId("src-webview");
    expect(retried).not.toBe(web);
    expect(retried.props.source).toBe(42);
    send(retried, { type: "radio-offline-ready" });
    send(retried, { type: "radio-workspace", open: true });
    expect(view.queryByText("Retry")).toBeNull();
    expect(mockScreen.mock.calls.at(-1)![0].options?.headerShown).toBe(false);
  } finally { jest.useRealTimers(); }
});
