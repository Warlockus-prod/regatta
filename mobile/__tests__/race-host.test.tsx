jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("../assets/sailing-offline.html", () => 123);
const mockNavigate = jest.fn();
const mockCapture = jest.fn();
let mockParams: Record<string, string | string[]> = {};
jest.mock("expo-router", () => ({
  Stack: { Screen: (props: { options?: { headerLeft?: () => React.ReactNode } }) => props.options?.headerLeft?.() ?? null },
  useRouter: () => ({ navigate: mockNavigate, replace: mockNavigate, canGoBack: () => false }),
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
import { readRaces } from "../src/persistence/race-history";
import type { NativeRaceSnapshot } from "../../src/lib/race-native";

const race: NativeRaceSnapshot = {
  schema: 1, id: "race-host-1", difficulty: "medium", windStrength: "medium", missionId: null,
  finishTimeSec: 10, position: 1, totalBoats: 3,
  course: { marks: [{ pos: { x: 400, y: 100 }, radius: 10, type: "windward", label: "Знак", labelEn: "Mark", labelPl: "Znak" }], startLine: { a: { x: 300, y: 1000 }, b: { x: 500, y: 1000 } }, finishLine: { a: { x: 300, y: 1000 }, b: { x: 500, y: 1000 } } },
  samples: [{ t: 0, x: 400, y: 990, heading: 45, twa: 45, speed: 4, lap: 0 }, { t: 10, x: 400, y: 1000, heading: 180, twa: 180, speed: 5, lap: 2 }],
  events: [{ type: "start", t: 0 }, { type: "finish", t: 10 }],
};

beforeEach(async () => { jest.clearAllMocks(); mockParams = {}; await AsyncStorage.clear(); });

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
  expect(mockNavigate).toHaveBeenLastCalledWith({ pathname: "/bootcamp/[id]", params: { id: "mini-race" } });
  const game = await waitFor(() => view.getByTestId("local-race"));
  expect(game.props.query.fromLesson).toBe("mini-race");
  const message = game.props.onOfflineMessage;
  for (const href of ["/", "/race"]) {
    act(() => message(JSON.stringify({ type: "native-navigate", href }), jest.fn()));
    expect(mockNavigate).toHaveBeenLastCalledWith("/bootcamp/mini-race");
  }
  for (const href of ["/history", "/replay/web-race-10"]) {
    act(() => message(JSON.stringify({ type: "native-navigate", href }), jest.fn()));
    expect(mockNavigate).toHaveBeenLastCalledWith(href);
  }
  const calls = mockNavigate.mock.calls.length;
  act(() => message(JSON.stringify({ type: "native-navigate", href: "/bootcamp/unknown" }), jest.fn()));
  expect(mockNavigate).toHaveBeenCalledTimes(calls);
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
  expect(mockNavigate).toHaveBeenLastCalledWith({ pathname: "/bootcamp/[id]", params: { id: "mini-race" } });
});
