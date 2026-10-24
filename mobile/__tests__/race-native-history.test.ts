jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-router", () => ({ Stack: { Screen: () => null }, useLocalSearchParams: () => mockRaceParams, useRouter: () => ({ navigate: jest.fn(), replace: jest.fn() }) }));
jest.mock("../src/i18n/context", () => ({ useI18n: () => ({ lang: "en", tp: (_ru: string, en: string) => en }) }));
jest.mock("../src/design-system/components", () => ({ Screen: ({ children }: { children: unknown }) => children, Text: () => null, Button: () => null }));
jest.mock("../src/simulator/SimWebView", () => ({ SimWebView: (props: { onOfflineMessage: (message: string, inject: (script: string) => void) => void }) => { mockRaceMessage = props.onOfflineMessage; return null; } }));
jest.mock("../src/analytics", () => ({ ...jest.requireActual("../src/analytics/events"), useAnalytics: jest.requireActual("../src/analytics/use-analytics").useAnalytics }));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createElement } from "react";
import type PostHog from "posthog-react-native";
import { act, render, renderHook, waitFor } from "@testing-library/react-native";
import Game from "../app/game";
import { AnalyticsClientContext } from "../src/analytics/context";
import { saveNativeRace } from "../src/persistence/race-native";
import { readRaces, useRaceHistory } from "../src/persistence/race-history";
import { parseRaceStorageEntries, persistRaceStorage } from "../src/persistence/race-web-storage";
import type { NativeRaceSnapshot } from "../../src/lib/race-native";

let mockRaceParams: Record<string, string> = {};
let mockRaceMessage: ((message: string, inject: (script: string) => void) => void) | null = null;

const key = "regatta.race-history.v1";
const legacy = { id: "legacy-1", courseId: "short", timeSec: 75, score: 90, finishedAt: 1, replay: [{ x: 160, y: 300, t: 0 }, { x: 160, y: 60, t: 40 }] };
const race: NativeRaceSnapshot = {
  schema: 1, id: "local-race-1", difficulty: "medium", windStrength: "medium", missionId: null,
  finishTimeSec: 10, position: 1, totalBoats: 3,
  course: { marks: [{ pos: { x: 400, y: 100 }, radius: 10, type: "windward", label: "Знак", labelEn: "Mark", labelPl: "Znak" }], startLine: { a: { x: 300, y: 1000 }, b: { x: 500, y: 1000 } }, finishLine: { a: { x: 300, y: 1000 }, b: { x: 500, y: 1000 } } },
  samples: [{ t: 0, x: 400, y: 990, heading: 45, twa: 45, speed: 4, lap: 0 }, { t: 10, x: 400, y: 1000, heading: 180, twa: 180, speed: 5, lap: 2 }],
  events: [{ type: "start", t: 0 }, { type: "finish", t: 10 }],
};

beforeEach(async () => { jest.clearAllMocks(); mockRaceParams = {}; mockRaceMessage = null; await AsyncStorage.clear(); });

it("adds world-space replay without rewriting a legacy pixel recording", async () => {
  await AsyncStorage.setItem(key, JSON.stringify([legacy]));
  const saved = await saveNativeRace(race, "en");
  expect(saved.webRace?.course).toEqual(race.course);
  expect(saved.samples).toEqual(race.samples);
  const penalized = await saveNativeRace({ ...race, id: "penalized-race", penaltySeconds: 5 }, "en");
  expect(penalized.timeSec).toBe(15);
  expect(penalized.webRace?.finishTimeSec).toBe(10);
  expect(penalized.webRace?.penaltySeconds).toBe(5);
  expect(saved.webRace?.coaching?.overall).toBeTruthy();
  expect(await readRaces()).toEqual([penalized, saved, legacy]);
  await saveNativeRace(race, "en");
  expect((await readRaces()).map(record => record.id)).toEqual([penalized.id, race.id, legacy.id]);
});

it("does not report persistence on disk failure or replace unreadable history", async () => {
  await AsyncStorage.setItem(key, JSON.stringify([legacy]));
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("disk full"));
  await expect(saveNativeRace(race, "en")).rejects.toThrow("disk full");
  expect(await readRaces()).toEqual([legacy]);
  await AsyncStorage.setItem(key, "unreadable history");
  await expect(saveNativeRace(race, "en")).rejects.toThrow();
  expect(await AsyncStorage.getItem(key)).toBe("unreadable history");
});

it("rejects malformed recordings and confines browser storage to race-owned keys", async () => {
  await expect(saveNativeRace({ ...race, samples: [] }, "en")).rejects.toThrow("invalid-race");
  expect(parseRaceStorageEntries({ "regatta.bootcamp": "erase" })).toBeNull();
  expect(parseRaceStorageEntries({ "regatta.race.mode.v1": 10 })).toBeNull();
  await persistRaceStorage({ "regatta.race.mode.v1": "pro", "regatta.race-resume.v1": null });
  expect(await AsyncStorage.getItem("regatta.race.mode.v1")).toBe("pro");
  expect(await AsyncStorage.getItem(key)).toBeNull();
});

it("refreshes a mounted history after a local scene saves and clears durably", async () => {
  const view = renderHook(() => useRaceHistory());
  await waitFor(() => expect(view.result.current.ready).toBe(true));
  expect(view.result.current.races).toEqual([]);
  await act(async () => { await saveNativeRace(race, "en"); });
  expect(view.result.current.races.map(saved => saved.id)).toEqual([race.id]);
  await act(async () => { await view.result.current.clear(); });
  expect(view.result.current.races).toEqual([]);
  expect(await readRaces()).toEqual([]);
});

it("relays one bounded start per race through the existing optional analytics client", async () => {
  const capture = jest.fn();
  render(createElement(AnalyticsClientContext.Provider, { value: { capture } as unknown as PostHog }, createElement(Game)));
  await waitFor(() => expect(mockRaceMessage).not.toBeNull());
  const start = { type: "race-started", id: "session-1", mode: "pro", difficulty: "hard", windStrength: "heavy", missionId: "clean-laps" };
  const message = (value: unknown) => act(() => mockRaceMessage!(JSON.stringify(value), jest.fn()));
  message({ ...start, mode: "unknown" });
  message({ ...start, id: "oversized", ignored: "x".repeat(1024) });
  message(start); message(start);
  expect(capture).toHaveBeenCalledTimes(1);
  expect(capture).toHaveBeenCalledWith("race_started", { course: "short", mode: "pro", difficulty: "hard", wind_strength: "heavy", mission_id: "clean-laps" });
  expect(await readRaces()).toEqual([]);
});

it("does not count a replay as a new start and works without an analytics client", async () => {
  const start = JSON.stringify({ type: "race-started", id: "session-2", mode: "simple", difficulty: "easy", windStrength: "light", missionId: null });
  const withoutClient = render(createElement(Game));
  await waitFor(() => expect(mockRaceMessage).not.toBeNull());
  expect(() => act(() => mockRaceMessage!(start, jest.fn()))).not.toThrow();
  withoutClient.unmount(); mockRaceMessage = null;
  await saveNativeRace(race, "en");
  mockRaceParams = { replayId: race.id };
  const capture = jest.fn();
  render(createElement(AnalyticsClientContext.Provider, { value: { capture } as unknown as PostHog }, createElement(Game)));
  await waitFor(() => expect(mockRaceMessage).not.toBeNull());
  act(() => mockRaceMessage!(start, jest.fn()));
  expect(capture).not.toHaveBeenCalled();
});
