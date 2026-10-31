/**
 * M1-1: the app asks the race setup once, in the Race hub. The hub's start
 * opens the shared race with the chosen setup in the route (level and wind, or
 * a mission), and raceEntryQuery hands it to the race, so the race skips its
 * own menu. Mode and venue stay in the same hub (VenuePicker).
 */
import { fireEvent, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

const mockPush = jest.fn();
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return { Stack: { Screen: () => null }, useRouter: () => ({ push: mockPush, replace: jest.fn() }), useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]) };
});
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "en-US" }] }));
jest.mock("../src/api/daily", () => ({ fetchDaily: () => Promise.resolve({ ok: false }) }));

import { I18nProvider } from "../src/i18n/context";
import { ProductHub } from "../src/navigation/ProductHub";
import { DEFAULT_HUB_SETUP, choosePreset, hubMissions, hubRaceHref } from "../src/navigation/race-setup";
import { raceEntryQuery } from "../src/navigation/race-entry";

const metrics = { insets: { top: 47, bottom: 34, left: 0, right: 0 }, frame: { x: 0, y: 0, width: 390, height: 844 } };
const hub = () => render(<SafeAreaProvider initialMetrics={metrics}><I18nProvider initialLang="en"><ProductHub section="race" /></I18nProvider></SafeAreaProvider>);
const query = (href: string) => Object.fromEntries(new URL(href, "https://app.test").searchParams);

beforeEach(() => mockPush.mockClear());

describe("race hub setup", () => {
  it("builds one route per preset and never a dead mission start", () => {
    expect(hubRaceHref(DEFAULT_HUB_SETUP)).toBe("/game?difficulty=easy&wind=medium");
    // A first race ignores a free race's earlier choice.
    expect(hubRaceHref({ ...DEFAULT_HUB_SETUP, difficulty: "hard", wind: "heavy" })).toBe("/game?difficulty=easy&wind=medium");
    expect(hubRaceHref({ ...DEFAULT_HUB_SETUP, preset: "free", difficulty: "hard", wind: "light" })).toBe("/game?difficulty=hard&wind=light");
    const mission = choosePreset(DEFAULT_HUB_SETUP, "mission");
    expect(mission.missionId).toBe(hubMissions[0].id);
    expect(hubRaceHref(mission)).toBe(`/game?mission=${hubMissions[0].id}`);
  });

  it("hands the setup through raceEntryQuery to the race", () => {
    const free = raceEntryQuery(query("/game?difficulty=hard&wind=light"), "pro");
    expect(free).toMatchObject({ difficulty: "hard", wind: "light", mode: "pro" });
    expect(raceEntryQuery(query(`/game?mission=${hubMissions[1].id}`), "simple").mission).toBe(hubMissions[1].id);
  });

  it("starts from the hub with the chosen setup and one primary start", () => {
    const view = hub();
    fireEvent.press(view.getByRole("button", { name: "Start your first race" }));
    expect(mockPush).toHaveBeenLastCalledWith("/game?difficulty=easy&wind=medium");
    fireEvent.press(view.getByRole("radio", { name: "Free race" }));
    fireEvent.press(view.getByRole("radio", { name: "Hard" }));
    fireEvent.press(view.getByRole("radio", { name: "Strong" }));
    fireEvent.press(view.getByRole("button", { name: "Start the race" }));
    expect(mockPush).toHaveBeenLastCalledWith("/game?difficulty=hard&wind=heavy");
    // The race frame opens the same setup, not a bare race menu.
    fireEvent.press(view.getByRole("button", { name: /^Race\. Solo race/ }));
    expect(mockPush).toHaveBeenLastCalledWith("/game?difficulty=hard&wind=heavy");
    fireEvent.press(view.getByRole("radio", { name: "Mission" }));
    fireEvent.press(view.getByRole("button", { name: "Start the mission" }));
    expect(mockPush).toHaveBeenLastCalledWith(`/game?mission=${hubMissions[0].id}`);
    view.unmount();
  });
});
