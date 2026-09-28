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
import { bootcampLessons } from "../../src/data";
import { sailLessons } from "../../../src/data/sailing-lab/course";

const BOOKMARK = "regatta.learning.bookmark.v1";
const bookmark = (course: string, lessonId: string | null = null) => JSON.stringify({ version: 1, course, lessonId, at: 1 });

beforeEach(async () => { await AsyncStorage.clear(); mockPush.mockClear(); });

describe("Home entry flows", () => {
  it("takes a new learner directly to the first lesson", async () => {
    const view = renderWithProviders(<Home />);
    await waitFor(() => expect(view.getByRole("button", { name: "Start the first lesson" }).props.accessibilityState.disabled).not.toBe(true));
    fireEvent.press(view.getByRole("button", { name: "Start the first lesson" }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/bootcamp/[id]", params: { id: "wind-direction" } });
  });

  it("resumes the actual unfinished lesson with nonsequential progress", async () => {
    await AsyncStorage.setItem("regatta.progress.bootcamp.v1", JSON.stringify(["wind-direction", "tacking"]));
    await AsyncStorage.setItem("regatta.progress.bootcamp.lastViewed.v1", JSON.stringify("how-sail-works"));
    const view = renderWithProviders(<Home />);
    await waitFor(() => view.getByRole("button", { name: "Continue learning" }));
    fireEvent.press(view.getByRole("button", { name: "Continue learning" }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/bootcamp/[id]", params: { id: "how-sail-works" } });
  });

  it("continues the sail course when the learner was there last", async () => {
    const lesson = sailLessons[3]!;
    await AsyncStorage.setItem("regatta.progress.bootcamp.lastViewed.v1", JSON.stringify("points-of-sail"));
    await AsyncStorage.setItem(BOOKMARK, bookmark("sails", lesson.id));
    const view = renderWithProviders(<Home />);
    await waitFor(() => view.getByText(lesson.title.en));
    expect(view.getByText(`Theory checked: 0 of ${sailLessons.length}`)).toBeTruthy();
    fireEvent.press(view.getByRole("button", { name: "Continue learning" }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/learn/sails/[lesson]", params: { lesson: lesson.id } });
  });

  it("reopens the radio course itself when it was the last course", async () => {
    await AsyncStorage.setItem(BOOKMARK, bookmark("radio"));
    const view = renderWithProviders(<Home />);
    await waitFor(() => view.getByText("Your last course"));
    fireEvent.press(view.getByRole("button", { name: "Continue learning" }));
    expect(mockPush).toHaveBeenCalledWith("/kursy/radio");
  });

  it("does not count opened lessons as passed", async () => {
    await AsyncStorage.setItem("regatta.progress.bootcamp.v1", JSON.stringify(bootcampLessons.map(l => l.id)));
    const view = renderWithProviders(<Home />);
    await waitFor(() => view.getByText("Passed 0 of 8"));
    fireEvent.press(view.getByRole("button", { name: "Continue learning" }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/bootcamp/[id]", params: { id: "wind-direction" } });
  });

  it("honors persisted Polish language and offers the other paths", async () => {
    await AsyncStorage.setItem("regatta.lang.v1", "pl");
    const view = renderWithProviders(<Home />);
    await waitFor(() => view.getByText("Żeglarstwo. Krok po kroku."));
    expect(view.getByText("Inne ścieżki")).toBeTruthy();
    fireEvent.press(view.getByText("Przepisy regatowe"));
    expect(mockPush).toHaveBeenCalledWith("/rules");
  });
});
