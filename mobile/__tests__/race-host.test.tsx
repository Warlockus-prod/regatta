jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("../assets/sailing-offline.html", () => 123);
const mockNavigate = jest.fn();
const mockCapture = jest.fn();
jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ navigate: mockNavigate, replace: mockNavigate }),
  useLocalSearchParams: () => ({}),
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
import { act, render, waitFor } from "@testing-library/react-native";
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

beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); });

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
