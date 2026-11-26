import { fireEvent, waitFor } from "@testing-library/react-native";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
const mockPush = jest.fn();
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  // Home re-reads progress on every focus; in a test the screen is focused once.
  return { Stack: { Screen: () => null }, useRouter: () => ({ push: mockPush }), useLocalSearchParams: () => ({}), useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]) };
});
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "en-US" }] }));

import AsyncStorage from "@react-native-async-storage/async-storage";
import Home from "../../app/index";
import { renderWithProviders } from "../../src/test-utils";
import { Button } from "../../src/design-system/components";
import { bootcampLessons } from "../../src/data";
import { hasQuiz } from "../../src/bootcamp/quiz-data";
import { sailLessons } from "../../../src/data/sailing-lab/course";
import { homeEntryCopy } from "../../../src/lib/product/home-entry";
import { homeCopy } from "../../src/home/copy";
import { RACE_HUB_SETUP_KEY } from "../../src/persistence/race-hub-setup";

const BOOKMARK = "regatta.learning.bookmark.v1";
const SAIL = "regatta.sailing.theory.v1";
const bookmark = (course: string, lessonId: string | null = null) => JSON.stringify({ version: 1, course, lessonId, at: 1 });
// Package 9 (rule 11): the home has exactly one primary action.
const primaryButtons = (view: ReturnType<typeof renderWithProviders>) => view.UNSAFE_getAllByType(Button).filter(b => (b.props.variant ?? "primary") === "primary");
const firstPassed = bootcampLessons.find(l => hasQuiz(l.id))!;

beforeEach(async () => { await AsyncStorage.clear(); mockPush.mockClear(); });

describe("Home entry flows (package 9)", () => {
  it("the app home follows the website's words", () => {
    for (const key of ["value", "valueDetail", "startFromScratch", "straightToRace", "sceneCaption", "sceneAlt", "examQuestion"] as const) expect(homeCopy[key]).toBe(homeEntryCopy[key]);
  });

  it("a new learner: value line, one Start from scratch to the first lesson, a quieter Go straight to a race", async () => {
    const view = renderWithProviders(<Home />);
    await waitFor(() => view.getByRole("button", { name: "Start from scratch" }));
    expect(view.getByText("Learn to sail in a week")).toBeTruthy();
    expect(primaryButtons(view)).toHaveLength(1);
    expect(view.queryByRole("button", { name: "Continue learning" })).toBeNull();
    fireEvent.press(view.getByRole("button", { name: "Start from scratch" }));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: "/bootcamp/[id]", params: { id: "wind-direction" } });
    fireEvent.press(view.getByRole("button", { name: "Go straight to a race" }));
    expect(mockPush).toHaveBeenLastCalledWith("/game?difficulty=easy&wind=medium");
    // SRC and sternik are their own quiet entrances.
    expect(view.getByText("Preparing for an exam?")).toBeTruthy();
    fireEvent.press(view.getByRole("button", { name: /^Motorboat skipper\./ }));
    expect(mockPush).toHaveBeenLastCalledWith("/kursy/motorowodny");
  });

  it("a visit to the radio or motorboat course, or opened lessons, do not turn Home into Continue", async () => {
    await AsyncStorage.setItem(BOOKMARK, bookmark("motor"));
    await AsyncStorage.setItem("regatta.progress.bootcamp.v1", JSON.stringify(bootcampLessons.map(l => l.id)));
    await AsyncStorage.setItem("regatta.progress.bootcamp.lastViewed.v1", JSON.stringify("how-sail-works"));
    const view = renderWithProviders(<Home />);
    await waitFor(() => view.getByRole("button", { name: "Start from scratch" }));
    expect(primaryButtons(view)).toHaveLength(1);
    expect(view.queryByText("Your last course")).toBeNull();
    fireEvent.press(view.getByRole("button", { name: "Start from scratch" }));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: "/bootcamp/[id]", params: { id: "wind-direction" } });
  });

  it("after a passed lesson: continues the actual unfinished lesson, still one primary action", async () => {
    await AsyncStorage.setItem("regatta.bootcamp-quiz.v1", JSON.stringify({ [firstPassed.id]: { score: 9, total: 9, answeredAt: 1 } }));
    await AsyncStorage.setItem("regatta.progress.bootcamp.lastViewed.v1", JSON.stringify("how-sail-works"));
    const view = renderWithProviders(<Home />);
    await waitFor(() => view.getByRole("button", { name: "Continue learning" }));
    expect(primaryButtons(view)).toHaveLength(1);
    expect(view.getByText(`Passed 1 of ${bootcampLessons.length}`)).toBeTruthy();
    fireEvent.press(view.getByRole("button", { name: "Continue learning" }));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: "/bootcamp/[id]", params: { id: "how-sail-works" } });
    expect(view.getByText("Other paths")).toBeTruthy();
  });

  it("continues the sail course after a passed theory check there", async () => {
    await AsyncStorage.setItem(SAIL, JSON.stringify({ version: 1, current: sailLessons[0].id, checked: [sailLessons[0].id] }));
    await AsyncStorage.setItem(BOOKMARK, bookmark("sails", sailLessons[3]!.id));
    const view = renderWithProviders(<Home />);
    await waitFor(() => view.getByText(sailLessons[3]!.title.en));
    expect(view.getByText(`Theory checked: 1 of ${sailLessons.length}`)).toBeTruthy();
    fireEvent.press(view.getByRole("button", { name: "Continue learning" }));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: "/learn/sails/[lesson]", params: { lesson: sailLessons[3]!.id } });
  });

  it("Go straight to a race plays the Race hub's last setup", async () => {
    await AsyncStorage.setItem(RACE_HUB_SETUP_KEY, JSON.stringify({ v: 1, preset: "free", difficulty: "hard", wind: "light", missionId: null }));
    const view = renderWithProviders(<Home />);
    await waitFor(() => view.getByRole("button", { name: "Go straight to a race" }));
    await waitFor(() => { fireEvent.press(view.getByRole("button", { name: "Go straight to a race" })); expect(mockPush).toHaveBeenLastCalledWith("/game?difficulty=hard&wind=light"); });
  });

  it("honors persisted Polish language", async () => {
    await AsyncStorage.setItem("regatta.lang.v1", "pl");
    const view = renderWithProviders(<Home />);
    await waitFor(() => view.getByText("Naucz się żeglować w tydzień"));
    expect(view.getByRole("button", { name: "Zacznij od zera" })).toBeTruthy();
    expect(view.getByText("Przygotowujesz się do egzaminu?")).toBeTruthy();
  });
});
