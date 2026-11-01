/**
 * M4-5: the app's race menu is the native Race hub, so the course medal and
 * its next goal show there, read from the medal row the race WebView wrote
 * through the race bridge (AsyncStorage). The line follows the course the
 * hub's start opens (first race, free race level and wind, mission) and
 * says "no medal yet" for a course without one.
 */
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return { Stack: { Screen: () => null }, useRouter: () => ({ push: jest.fn(), replace: jest.fn() }), useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]) };
});
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "en-US" }] }));
jest.mock("../src/api/daily", () => ({ fetchDaily: () => Promise.resolve({ ok: false }) }));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nProvider } from "../src/i18n/context";
import { ProductHub } from "../src/navigation/ProductHub";
import { hubMedalCourse } from "../src/navigation/RaceHubMedal";
import { DEFAULT_HUB_SETUP, hubMissions } from "../src/navigation/race-setup";
import { RACE_MEDALS_STORAGE_KEY, awardRaceMedal, medalThresholds } from "../../src/lib/race-medals";
import { LEGACY_RACE_CONTEXT } from "../../src/lib/race-context";
import { formatRecordTime } from "../../src/lib/best-times";

const metrics = { insets: { top: 47, bottom: 34, left: 0, right: 0 }, frame: { x: 0, y: 0, width: 390, height: 844 } };
const hub = () => render(<SafeAreaProvider initialMetrics={metrics}><I18nProvider initialLang="en"><ProductHub section="race" /></I18nProvider></SafeAreaProvider>);
const first = { raceContext: LEGACY_RACE_CONTEXT, difficulty: "easy" as const, windStrength: "medium" as const };

beforeEach(async () => { await AsyncStorage.clear(); });

it("maps every hub preset to the course its start opens", () => {
  expect(hubMedalCourse(DEFAULT_HUB_SETUP)).toEqual(first);
  expect(hubMedalCourse({ ...DEFAULT_HUB_SETUP, difficulty: "hard", wind: "light" })).toEqual(first);
  expect(hubMedalCourse({ ...DEFAULT_HUB_SETUP, preset: "free", difficulty: "hard", wind: "light" })).toMatchObject({ difficulty: "hard", windStrength: "light" });
  const mission = hubMissions[1];
  expect(hubMedalCourse({ ...DEFAULT_HUB_SETUP, preset: "mission", missionId: mission.id })).toMatchObject({ difficulty: mission.difficulty, windStrength: mission.windStrength });
});

it("shows the stored course medal and its next goal, and no medal for another course", async () => {
  const t = medalThresholds(first)!;
  await AsyncStorage.setItem(RACE_MEDALS_STORAGE_KEY, JSON.stringify(awardRaceMedal({}, first, t.silverSec, true)!.store));
  const view = hub();
  await waitFor(() => expect(view.getByText("Course medal: Silver")).toBeTruthy());
  expect(view.getByText("Easy, medium wind")).toBeTruthy();
  expect(view.getByText(`Next, gold: finish faster than ${formatRecordTime(t.goldSec)} with "Route and hints" off in the race settings`)).toBeTruthy();
  await act(async () => { fireEvent.press(view.getByRole("radio", { name: "Free race" })); });
  fireEvent.press(view.getByRole("radio", { name: "Hard" }));
  fireEvent.press(view.getByRole("radio", { name: "Strong" }));
  expect(view.getByText("No medal on this course yet")).toBeTruthy();
  expect(view.getByText("Hard, strong wind")).toBeTruthy();
  expect(view.getByText("Bronze for any finish")).toBeTruthy();
});

it("reads a corrupt row as no medal", async () => {
  await AsyncStorage.setItem(RACE_MEDALS_STORAGE_KEY, "{not json");
  const view = hub();
  await waitFor(() => expect(view.getByText("No medal on this course yet")).toBeTruthy());
});
