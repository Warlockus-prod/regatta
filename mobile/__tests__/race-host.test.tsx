jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("../assets/sailing-offline.html", () => 123);
const mockNavigate = jest.fn();
const mockDismissTo = jest.fn();
const mockCapture = jest.fn();
let mockParams: Record<string, string | string[]> = {};
jest.mock("expo-router", () => ({
  Stack: { Screen: (props: { options?: { headerLeft?: () => React.ReactNode } }) => props.options?.headerLeft?.() ?? null },
  useRouter: () => ({ navigate: mockNavigate, replace: mockNavigate, dismissTo: mockDismissTo, canGoBack: () => false }),
  usePathname: () => "/game",
  useLocalSearchParams: () => mockParams,
}));
jest.mock("../src/analytics", () => ({
  AnalyticsEvent: { RaceFinished: "race_finished" },
  useAnalytics: () => ({ capture: mockCapture }),
}));
jest.mock("../src/i18n/context", () => ({ useI18n: () => ({ lang: "en", tp: (_ru: string, en: string) => en }) }));
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "en-US" }] }));
jest.mock("../src/design-system/components", () => {
  const React = require("react");
  const { View, Text, Pressable } = require("react-native");
  return { Screen: View, Text, Button: (props: object) => React.createElement(Pressable, props) };
});
jest.mock("../src/simulator/SimWebView", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { SimWebView: (props: object) => React.createElement(View, { ...props, testID: "local-race" }) };
});

import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import Game from "../app/game";
import SharedRaceHost from "../src/game/SharedRaceHost";
import { CommonActions, StackActions, StackRouter } from "@react-navigation/routers";
import { saveNativeRace } from "../src/persistence/race-native";
import { readRaces } from "../src/persistence/race-history";
import type { NativeRaceSnapshot } from "../../src/lib/race-native";

const race: NativeRaceSnapshot = {
  schema: 1, id: "race-host-1", difficulty: "medium", windStrength: "medium", missionId: null,
  finishTimeSec: 10, position: 1, totalBoats: 3,
  course: { marks: [{ pos: { x: 400, y: 100 }, radius: 10, type: "windward", label: "Знак", labelEn: "Mark", labelPl: "Znak" }], startLine: { a: { x: 300, y: 1000 }, b: { x: 500, y: 1000 } }, finishLine: { a: { x: 300, y: 1000 }, b: { x: 500, y: 1000 } } },
  samples: [{ t: 0, x: 400, y: 990, heading: 45, twa: 45, speed: 4, lap: 0 }, { t: 10, x: 400, y: 1000, heading: 180, twa: 180, speed: 5, lap: 2 }],
  events: [{ type: "start", t: 0 }, { type: "finish", t: 10 }],
};

beforeEach(async () => { jest.clearAllMocks(); mockNavigate.mockReset(); mockDismissTo.mockReset(); mockParams = {}; await AsyncStorage.clear(); });

it("starts one local 3D game on a clean install and keeps changed prefs for Retry", async () => {
  const view = render(<Game />);
  await waitFor(() => expect(view.getByTestId("local-race")).toBeTruthy());
  const game = view.getByTestId("local-race");
  expect(game.props.offlineSource).toBe(123);
  expect(game.props.fullScreen).toBe(true);
  expect(game.props.query).toMatchObject({ view: "3d", scene: "next", mode: "simple" });
  await act(async () => game.props.onOfflineMessage(JSON.stringify({ type: "race-storage", entries: { "regatta.race.mode.v1": "pro", "regatta.muted.v1": "1" } }), jest.fn()));
  await waitFor(() => expect(view.getByTestId("local-race").props.localStorage["regatta.race.mode.v1"]).toBe("pro"));
  expect(view.getByTestId("local-race").props.query.mode).toBe("pro");
  expect(await AsyncStorage.getItem("regatta.muted.v1")).toBe("1");
  const message = view.getByTestId("local-race").props.onOfflineMessage;
  act(() => message(JSON.stringify({ type: "native-navigate", href: "https://example.com" }), jest.fn()));
  expect(mockNavigate).not.toHaveBeenCalled();
  act(() => message(JSON.stringify({ type: "native-navigate", href: "/history" }), jest.fn()));
  expect(mockNavigate).toHaveBeenCalledWith("/history");
});

it("acknowledges a finish only after native storage and reports a disk failure explicitly", async () => {
  const view = render(<Game />);
  await waitFor(() => expect(view.getByTestId("local-race")).toBeTruthy());
  const inject = jest.fn();
  const message = view.getByTestId("local-race").props.onOfflineMessage;
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("disk full"));
  await act(async () => message(JSON.stringify({ type: "race-finished", race }), inject));
  await waitFor(() => expect(inject).toHaveBeenCalledWith(expect.stringContaining('"code":"storage-unavailable"')));
  expect(await readRaces()).toEqual([]);
  expect(mockCapture).not.toHaveBeenCalled();
  inject.mockClear();
  await act(async () => message(JSON.stringify({ type: "race-finished", race }), inject));
  await waitFor(() => expect(inject).toHaveBeenCalledWith(expect.stringContaining('"id":"race-host-1"')));
  expect((await readRaces())[0].webRace?.id).toBe(race.id);
  expect(mockCapture).toHaveBeenCalledTimes(1);
  await act(async () => message(JSON.stringify({ type: "race-finished", race }), inject));
  expect(await readRaces()).toHaveLength(1);
  expect(mockCapture).toHaveBeenCalledTimes(1);
});

it("returns a lesson-launched mini-race through both the loading header and the trusted full-screen exit bridge", async () => {
  mockParams = { fromLesson: "mini-race" };
  const view = render(<Game />);
  fireEvent.press(view.getByRole("button", { name: "Return to lesson" }));
  expect(mockDismissTo).toHaveBeenLastCalledWith({ pathname: "/bootcamp/[id]", params: { id: "mini-race" } });
  const game = await waitFor(() => view.getByTestId("local-race"));
  expect(game.props.query.fromLesson).toBe("mini-race");
  const message = game.props.onOfflineMessage;
  for (const href of ["/", "/race"]) {
    act(() => message(JSON.stringify({ type: "native-navigate", href }), jest.fn()));
    expect(mockDismissTo).toHaveBeenLastCalledWith("/bootcamp/mini-race");
  }
  for (const href of ["/history", "/replay/web-race-10"]) {
    act(() => message(JSON.stringify({ type: "native-navigate", href }), jest.fn()));
    expect(mockNavigate).toHaveBeenLastCalledWith(href);
  }
  const calls = mockNavigate.mock.calls.length;
  const dismissCalls = mockDismissTo.mock.calls.length;
  act(() => message(JSON.stringify({ type: "native-navigate", href: "/bootcamp/unknown" }), jest.fn()));
  expect(mockNavigate).toHaveBeenCalledTimes(calls);
  expect(mockDismissTo).toHaveBeenCalledTimes(dismissCalls);
});

it("the trusted Foundation race exit removes the game before the following native Back", async () => {
  mockParams = { fromLesson: "mini-race" };
  const stack = StackRouter({ initialRouteName: "bootcamp/index" });
  const config = { routeNames: ["bootcamp/index", "bootcamp/[id]", "game/index"], routeParamList: {}, routeGetIdList: {} };
  let state = stack.getInitialState(config);
  const dispatch = (action: Parameters<typeof stack.getStateForAction>[1]) => {
    const next = stack.getStateForAction(state, action, config);
    if (!next || next.stale !== false) throw new Error("Foundation race return did not return a hydrated state");
    state = next;
  };
  dispatch(StackActions.push("bootcamp/[id]", { id: "mini-race" }));
  const originalLessonKey = state.routes[state.index].key;
  dispatch(StackActions.push("game/index", { fromLesson: "mini-race" }));
  mockNavigate.mockImplementation(href => { expect(href).toBe("/bootcamp/mini-race"); dispatch(CommonActions.navigate("bootcamp/[id]", { id: "mini-race" })); });
  mockDismissTo.mockImplementation(href => { expect(href).toBe("/bootcamp/mini-race"); dispatch(StackActions.popTo("bootcamp/[id]", { id: "mini-race" })); });
  const view = render(<Game />);
  const game = await waitFor(() => view.getByTestId("local-race"));
  act(() => game.props.onOfflineMessage(JSON.stringify({ type: "native-navigate", href: "/" }), jest.fn()));
  expect(state.routes.map(route => route.name)).toEqual(["bootcamp/index", "bootcamp/[id]"]);
  expect(state.routes[state.index].key).toBe(originalLessonKey);
  expect(state.routes[state.index].params).toEqual({ id: "mini-race" });
  dispatch(CommonActions.goBack());
  expect(state.routes.map(route => route.name)).toEqual(["bootcamp/index"]);
});

it("keeps ordinary or unknown-lesson race exits at the race hub", async () => {
  mockParams = { fromLesson: "unknown" };
  const view = render(<Game />);
  const game = await waitFor(() => view.getByTestId("local-race"));
  expect(game.props.query).not.toHaveProperty("fromLesson");
  act(() => game.props.onOfflineMessage(JSON.stringify({ type: "native-navigate", href: "/race" }), jest.fn()));
  expect(mockNavigate).toHaveBeenLastCalledWith("/race");
});

it("retains Return to lesson when local race preferences fail to load", async () => {
  mockParams = { fromLesson: "mini-race" };
  (AsyncStorage.multiGet as jest.Mock).mockRejectedValueOnce(new Error("disk unavailable"));
  const view = render(<Game />);
  await waitFor(() => view.getByText(/Could not read race data/));
  expect(view.queryByTestId("local-race")).toBeNull();
  fireEvent.press(view.getByRole("button", { name: "Return to lesson" }));
  expect(mockDismissTo).toHaveBeenLastCalledWith({ pathname: "/bootcamp/[id]", params: { id: "mini-race" } });
});

it("persists every closed wind style through the preference bridge and restores it after a native relaunch", async () => {
  const view = render(<Game />);
  const game = await waitFor(() => view.getByTestId("local-race"));
  for (const windDisplay of ["off", "compass", "arrows", "both"]) {
    // F4 and F6: the coach line, first race hints, softer light and wind on the sails ride in the same assists row.
    const assists = { guidance: false, trimHints: false, rules: true, penalties: true, windDisplay, miniMap: false, coachStrip: false, firstRaceHints: false, softLight: true, sailFlow: true };
    await act(async () => game.props.onOfflineMessage(JSON.stringify({ type: "race-prefs", mode: "pro", assists }), jest.fn()));
    await waitFor(() => expect(JSON.parse(view.getByTestId("local-race").props.localStorage["regatta.race.assists.v1"])).toEqual(assists));
    expect(JSON.parse((await AsyncStorage.getItem("regatta.race.assists.v1"))!)).toEqual(assists);
  }
  await waitFor(async () => expect(await AsyncStorage.getItem("regatta.race.mode.v1")).toBe("pro"));
  view.unmount();
  const reopened = render(<Game />);
  const next = await waitFor(() => reopened.getByTestId("local-race"));
  expect(JSON.parse(next.props.localStorage["regatta.race.assists.v1"])).toEqual({ guidance: false, trimHints: false, rules: true, penalties: true, windDisplay: "both", miniMap: false, coachStrip: false, firstRaceHints: false, softLight: true, sailFlow: true });
  expect(next.props.query.mode).toBe("pro");
});

it("preserves the required legacy boolean guard and defaults optional trim and invalid wind fields", async () => {
  const key = "regatta.race.assists.v1";
  const existing = JSON.stringify({ guidance: true, trimHints: false, rules: true, penalties: false, windDisplay: "arrows" });
  await AsyncStorage.setItem(key, existing);
  const view = render(<Game />);
  const game = await waitFor(() => view.getByTestId("local-race"));
  (AsyncStorage.multiSet as jest.Mock).mockClear();
  for (const assists of [{ rules: true, penalties: false, windDisplay: "both" }, { guidance: true, rules: "true", penalties: false }, { guidance: true, rules: true }, []]) {
    await act(async () => game.props.onOfflineMessage(JSON.stringify({ type: "race-prefs", assists }), jest.fn()));
  }
  expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(key)).toBe(existing);
  await act(async () => game.props.onOfflineMessage(JSON.stringify({ type: "race-prefs", assists: { guidance: false, rules: false, penalties: true, trimHints: "false", windDisplay: "PRIVATE", privatePayload: "PRIVATE" } }), jest.fn()));
  await waitFor(() => expect(JSON.parse(view.getByTestId("local-race").props.localStorage[key])).toEqual({ guidance: false, trimHints: true, rules: false, penalties: true, windDisplay: "compass", miniMap: true, coachStrip: true, firstRaceHints: true, softLight: false, sailFlow: false }));
  expect(await AsyncStorage.getItem(key)).not.toContain("PRIVATE");
});

it("retains the old durable wind preference on a failed write and accepts an explicit retry", async () => {
  const key = "regatta.race.assists.v1";
  const existing = JSON.stringify({ guidance: true, trimHints: true, rules: true, penalties: false, windDisplay: "off" });
  await AsyncStorage.setItem(key, existing);
  const view = render(<Game />);
  const game = await waitFor(() => view.getByTestId("local-race"));
  (AsyncStorage.multiSet as jest.Mock).mockRejectedValueOnce(new Error("disk full"));
  const payload = JSON.stringify({ type: "race-prefs", assists: { guidance: true, trimHints: true, rules: true, penalties: false, windDisplay: "both" } });
  await act(async () => game.props.onOfflineMessage(payload, jest.fn()));
  await waitFor(() => expect(AsyncStorage.multiSet).toHaveBeenCalled());
  expect(await AsyncStorage.getItem(key)).toBe(existing);
  expect(view.getByTestId("local-race").props.localStorage[key]).toBe(existing);
  await act(async () => game.props.onOfflineMessage(payload, jest.fn()));
  await waitFor(() => expect(JSON.parse(view.getByTestId("local-race").props.localStorage[key]).windDisplay).toBe("both"));
  expect(JSON.parse((await AsyncStorage.getItem(key))!).windDisplay).toBe("both");
});

// A saved replay must not redirect into the live race route or inherit its intent.
it("mounts a saved replay with its own identity and dismisses back to History", async () => {
  const record = await saveNativeRace(race, "en", false);
  mockParams = { id: record.id, daily: "2026-10-26", fromLesson: "mini-race" };
  const view = render(<SharedRaceHost savedReplayId={record.id} />);
  const replay = await waitFor(() => view.getByTestId("local-race"));
  expect(replay.props.query.replayId).toBe(record.id);
  expect(replay.props.query).not.toHaveProperty("daily");
  expect(replay.props.query).not.toHaveProperty("fromLesson");
  expect(replay.props.raceReplay.id).toBe(race.id);
  expect(mockNavigate).not.toHaveBeenCalled();
  act(() => replay.props.onOfflineMessage(JSON.stringify({ type: "native-navigate", href: "/history" }), jest.fn()));
  expect(mockDismissTo).toHaveBeenCalledTimes(1);
  expect(mockDismissTo).toHaveBeenCalledWith("/history");
  expect(mockNavigate).not.toHaveBeenCalled();
});
