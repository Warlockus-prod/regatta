/**
 * M1-1: the app asks the race setup once, in the Race hub. The hub's start
 * opens the shared race with the chosen setup in the route (level and wind, or
 * a mission), and raceEntryQuery hands it to the race, so the race skips its
 * own menu. Mode and venue stay in the same hub (VenuePicker).
 */
import { act, fireEvent, render, waitFor, within } from "@testing-library/react-native";
import { ScrollView } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

const mockPush = jest.fn();
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
// A focus effect runs on mount; mockRefocus() runs it again as when the
// player comes back to the Race tab (F1 lifecycle).
const mockFocusRuns = new Set<() => void>();
const mockRefocus = () => mockFocusRuns.forEach(run => run());
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return { Stack: { Screen: () => null }, useRouter: () => ({ push: mockPush, replace: jest.fn() }),
    useFocusEffect: (effect: () => void | (() => void)) => useEffect(() => {
      let cleanup = effect();
      const run = () => { if (typeof cleanup === "function") cleanup(); cleanup = effect(); };
      mockFocusRuns.add(run);
      return () => { mockFocusRuns.delete(run); if (typeof cleanup === "function") cleanup(); };
    }, [effect]) };
});
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "en-US" }] }));
jest.mock("../src/api/daily", () => ({ fetchDaily: () => Promise.resolve({ ok: false }) }));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18nProvider } from "../src/i18n/context";
import { RACE_HOME_STORAGE_KEY } from "../../src/lib/race-next-step";
import { BEST_TIMES_STORAGE_KEY } from "../../src/lib/best-times";
import { RACE_HISTORY_STORAGE_KEY, countStoredRaces } from "../src/persistence/race-history";
import { ProductHub } from "../src/navigation/ProductHub";
import { DEFAULT_HUB_SETUP, choosePreset, hubMissions, hubRaceHref } from "../src/navigation/race-setup";
import { raceEntryQuery } from "../src/navigation/race-entry";

const metrics = { insets: { top: 47, bottom: 34, left: 0, right: 0 }, frame: { x: 0, y: 0, width: 390, height: 844 } };
const hub = () => render(<SafeAreaProvider initialMetrics={metrics}><I18nProvider initialLang="en"><ProductHub section="race" /></I18nProvider></SafeAreaProvider>);
const query = (href: string) => Object.fromEntries(new URL(href, "https://app.test").searchParams);

beforeEach(async () => { mockPush.mockClear(); await AsyncStorage.clear(); });

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

  it("starts from the hub with the chosen setup and one primary start", async () => {
    const view = hub();
    fireEvent.press(await view.findByRole("button", { name: "Start your first race" }));
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

  // F5: the race's own lobby (with its "How to race") is not in the app, so the
  // hub offers it as a plain row, and the flag reaches the race page.
  it("opens the race intro from How to race, a row beside the one primary start", async () => {
    const view = hub();
    await view.findByRole("button", { name: "Start your first race" });
    fireEvent.press(view.getByRole("button", { name: /^How to race/ }));
    expect(mockPush).toHaveBeenLastCalledWith("/game?intro=1");
    expect(raceEntryQuery(query("/game?intro=1"), "simple")).toMatchObject({ intro: "1", mode: "simple" });
    expect(raceEntryQuery(query("/game?intro=yes"), "simple")).not.toHaveProperty("intro");
    view.unmount();
  });
});

/**
 * F1 (TestFlight 74 feedback): the easy preset is "First race" and the start
 * "Start your first race" only until this device has raced (the race home row,
 * a personal best or the native race history); then "Easy race" and "Start
 * the race". The one labelled start is pinned under the scroll view, above the
 * tab bar, so the race photo (also a start) is never the only visible way in.
 */
describe("race hub wording and start after the first race (F1)", () => {
  const startBar = (view: ReturnType<typeof hub>) => view.getByTestId("race-hub-start-bar");

  it("says First race with no race on this device, with the start pinned outside the scroll", async () => {
    const view = hub();
    await waitFor(() => expect(view.getByRole("radio", { name: "First race" })).toBeTruthy());
    expect(view.queryByRole("radio", { name: "Easy race" })).toBeNull();
    const start = within(startBar(view)).getByRole("button", { name: "Start your first race" });
    // Pinned: the bar is not inside the scroll view, and it is the only start button.
    expect(within(view.UNSAFE_getByType(ScrollView)).queryByTestId("race-hub-start-bar")).toBeNull();
    expect(view.getAllByRole("button", { name: /^Start / })).toHaveLength(1);
    fireEvent.press(start);
    expect(mockPush).toHaveBeenLastCalledWith("/game?difficulty=easy&wind=medium");
    view.unmount();
  });

  const rows: Array<[string, string, string]> = [
    ["an ended race", RACE_HOME_STORAGE_KEY, JSON.stringify({ schema: 1, days: ["2026-10-31"], goal: null, dailyDone: null })],
    ["a personal best", BEST_TIMES_STORAGE_KEY, JSON.stringify({ "easy-medium": { timeSec: 101, ts: 1 } })],
    ["a saved race in the history", RACE_HISTORY_STORAGE_KEY, JSON.stringify([{ id: "r1", courseId: "short", timeSec: 200, score: 70, finishedAt: 1, replay: [] }])],
  ];
  it.each(rows)("says Easy race and Start the race after %s", async (_label, key, value) => {
    await AsyncStorage.setItem(key, value);
    const view = hub();
    await waitFor(() => expect(view.getByRole("radio", { name: "Easy race" })).toBeTruthy());
    expect(view.queryByText(/first race/i)).toBeNull();
    fireEvent.press(within(startBar(view)).getByRole("button", { name: "Start the race" }));
    expect(mockPush).toHaveBeenLastCalledWith("/game?difficulty=easy&wind=medium");
    // The race photo still starts the same race.
    fireEvent.press(view.getByRole("button", { name: /^Race\. Solo race/ }));
    expect(mockPush).toHaveBeenLastCalledWith("/game?difficulty=easy&wind=medium");
    view.unmount();
  });

  it("never shows first race to a returning player before the storage read settles", async () => {
    await AsyncStorage.setItem(RACE_HOME_STORAGE_KEY, JSON.stringify({ schema: 1, days: ["2026-10-31"], goal: null, dailyDone: null }));
    const view = hub();
    // The very first render, before AsyncStorage answers: neutral words.
    expect(view.queryByText(/first race/i)).toBeNull();
    expect(within(startBar(view)).getByRole("button", { name: "Start the race" })).toBeTruthy();
    await waitFor(() => expect(view.getByRole("radio", { name: "Easy race" })).toBeTruthy());
    expect(view.queryByText(/first race/i)).toBeNull();
    view.unmount();
  });

  it("switches to Easy race when the player comes back after the first race", async () => {
    const view = hub();
    await waitFor(() => expect(view.getByRole("radio", { name: "First race" })).toBeTruthy());
    // The race WebView ends a race and writes the race home row; the player
    // returns to the Race tab, which reads the rows again on focus.
    await AsyncStorage.setItem(RACE_HOME_STORAGE_KEY, JSON.stringify({ schema: 1, days: ["2026-11-01"], goal: null, dailyDone: null }));
    act(() => mockRefocus());
    await waitFor(() => expect(view.getByRole("radio", { name: "Easy race" })).toBeTruthy());
    expect(view.queryByText(/first race/i)).toBeNull();
    expect(within(startBar(view)).getByRole("button", { name: "Start the race" })).toBeTruthy();
    view.unmount();
  });

  it("counts only readable saved races", () => {
    expect(countStoredRaces(null)).toBe(0);
    expect(countStoredRaces("{bad")).toBe(0);
    expect(countStoredRaces("{}")).toBe(0);
    expect(countStoredRaces(JSON.stringify([null, { id: 3 }, { id: "a" }]))).toBe(1);
  });
});
