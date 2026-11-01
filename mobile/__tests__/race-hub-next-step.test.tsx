/**
 * M4-6: the app's Race hub shows ONE next-step card on top, from the rows the
 * race WebView wrote through the race bridge: the last race's goal with its
 * practice (an in-app destination), else the course medal line with its next
 * medal (not a second time below), else today's daily race (then no second
 * daily row); plus the record, the medal progress and the days with a race
 * this week (no line at zero, never a streak). The hub keeps one primary start.
 */
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

const mockPush = jest.fn();
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return { Stack: { Screen: () => null }, useRouter: () => ({ push: mockPush, replace: jest.fn() }), useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]) };
});
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "en-US" }] }));
jest.mock("../src/api/daily", () => ({ fetchDaily: () => Promise.resolve({ ok: false }) }));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nProvider } from "../src/i18n/context";
import { ProductHub } from "../src/navigation/ProductHub";
import { RACE_MEDALS_STORAGE_KEY, awardRaceMedal } from "../../src/lib/race-medals";
import { RACE_HOME_STORAGE_KEY, dailyRaceDay, localDay } from "../../src/lib/race-next-step";
import { BEST_TIMES_STORAGE_KEY } from "../../src/lib/best-times";
import { LEGACY_RACE_CONTEXT } from "../../src/lib/race-context";

const metrics = { insets: { top: 47, bottom: 34, left: 0, right: 0 }, frame: { x: 0, y: 0, width: 390, height: 844 } };
const hub = () => render(<SafeAreaProvider initialMetrics={metrics}><I18nProvider initialLang="en"><ProductHub section="race" /></I18nProvider></SafeAreaProvider>);
const first = { raceContext: LEGACY_RACE_CONTEXT, difficulty: "easy" as const, windStrength: "medium" as const };
const home = (patch: Record<string, unknown>) => AsyncStorage.setItem(RACE_HOME_STORAGE_KEY, JSON.stringify({ schema: 1, days: [], goal: null, dailyDone: null, ...patch }));

beforeEach(async () => { await AsyncStorage.clear(); mockPush.mockClear(); });

it("shows the last race's goal with its practice, then the record, the medals and the days", async () => {
  await home({ goal: "no-go", days: [localDay(new Date())] });
  await AsyncStorage.setItem(BEST_TIMES_STORAGE_KEY, JSON.stringify({ "easy-medium": { timeSec: 101, ts: 1 } }));
  const view = hub();
  await waitFor(() => expect(view.getByText("Stay out of the no-go zone")).toBeTruthy());
  expect(view.getByText("Next step")).toBeTruthy();
  expect(view.getByText("Record on this course: 1:41")).toBeTruthy();
  expect(view.getByText("Courses with a medal: 0 of 9")).toBeTruthy();
  expect(view.getByText("Days with a solo race this week: 1")).toBeTruthy();
  // The course medal line stays below the card, once.
  expect(view.getAllByTestId("race-hub-medal")).toHaveLength(1);
  await act(async () => { fireEvent.press(view.getByText(/^Practise: Lesson 1\./)); });
  expect(mockPush).toHaveBeenCalledWith("/bootcamp/wind-direction");
});

it("puts the course medal line in the card when the last race left no goal, without a days line at zero", async () => {
  const view = hub();
  await waitFor(() => expect(view.getByText("Next step")).toBeTruthy());
  expect(view.getAllByTestId("race-hub-medal")).toHaveLength(1);
  expect(view.getByText("No medal on this course yet")).toBeTruthy();
  expect(view.queryByText(/this week/)).toBeNull();
  expect(view.queryByText(/streak/i)).toBeNull();
  // The daily race stays reachable from its own row.
  expect(view.getByText("Daily race")).toBeTruthy();
});

it("offers today's daily race once the course has gold, with no second daily row", async () => {
  await AsyncStorage.setItem(RACE_MEDALS_STORAGE_KEY, JSON.stringify(awardRaceMedal({}, first, 60, false)!.store));
  const view = hub();
  await waitFor(() => expect(view.getByText("Go to the daily race")).toBeTruthy());
  expect(view.getAllByText("Daily race")).toHaveLength(1);
  await act(async () => { fireEvent.press(view.getByText("Go to the daily race")); });
  expect(mockPush).toHaveBeenCalledWith(`/game?daily=${dailyRaceDay(new Date())}`);
});
