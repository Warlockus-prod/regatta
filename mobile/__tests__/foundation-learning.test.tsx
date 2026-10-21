import { act, fireEvent, renderHook, waitFor } from "@testing-library/react-native";
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-router", () => ({
  useFocusEffect: (effect: () => void | (() => void)) => jest.requireActual("react").useEffect(effect, [effect]),
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => ({ id: "tacking" }),
}));
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "en-US" }] }));
import AsyncStorage from "@react-native-async-storage/async-storage";
import BootcampLesson from "../app/bootcamp/[id]";
import { renderWithProviders, settleProgress } from "../src/test-utils";
import { foundationGuides, foundationModules, foundationCopy, foundationPractice } from "../src/bootcamp/learning-guide";
import { foundationPracticeRoute, saveFoundationPosition, loadFoundationPositions, FOUNDATION_POSITION_KEY } from "../src/bootcamp/lesson-position";
import { bootcampLessons } from "../src/data";
import { bootcampPilots } from "../src/lessons/pilots";
import { renderScene, type SceneId } from "../src/lessons/graphics/drawings";
import { recordQuizResult, useBootcampQuiz, QUIZ_RESULTS_KEY } from "../src/persistence/bootcamp-quiz";

beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); });

it("every source lesson has a teaching graphic and belongs to exactly one module", () => {
  expect(foundationModules.flatMap(m => m.lessons)).toEqual(bootcampLessons.map(l => l.id));
  for (const lesson of bootcampLessons) {
    expect(foundationGuides[lesson.id] ?? bootcampPilots[lesson.id]).toBeDefined();
    for (const state of [0, 1, 2] as const) {
      const svg = renderScene(lesson.id as SceneId, state);
      expect(svg).not.toMatch(/NaN|undefined|<image|<script/);
      expect(svg).toContain("viewBox=\"0 0 900 560\"");
    }
  }
});

it("all new teaching text is complete in seven languages", () => {
  const labels = [...Object.values(foundationCopy), ...Object.values(foundationPractice).map(p => p.task), ...foundationModules.map(m => m.title), ...Object.values(foundationGuides).flatMap(g => [g.goal, g.mistake, g.limit, ...g.states, ...g.notes, ...g.legend])];
  for (const label of labels) for (const lang of ["ru", "en", "pl", "es", "fr", "de", "it"] as const) {
    expect(label[lang].trim()).not.toBe("");
    if (lang !== "ru") expect(label[lang]).not.toMatch(/[А-Яа-яЁё]/);
  }
});

it("returning to a remounted lesson restores its step and diagram without passing it", async () => {
  const first = renderWithProviders(<BootcampLesson />);
  await settleProgress();
  fireEvent.press(first.getByTestId("diagram-state-2"));
  fireEvent.press(first.getByRole("button", { name: "3. Practice" }));
  await settleProgress();
  first.unmount();
  const returned = renderWithProviders(<BootcampLesson />);
  await waitFor(() => expect(returned.getByRole("button", { name: "3. Practice" }).props.accessibilityState.selected).toBe(true));
  fireEvent.press(returned.getByRole("button", { name: "1. Understand" }));
  expect(returned.getByTestId("diagram-state-2").props.accessibilityState.selected).toBe(true);
  expect(await AsyncStorage.getItem(QUIZ_RESULTS_KEY)).toBeNull();
});

it("rapid navigation merges positions and preserves checks", async () => {
  const original = JSON.stringify({ "wind-direction": { score: 3, total: 3, answeredAt: 1 } });
  await AsyncStorage.setItem(QUIZ_RESULTS_KEY, original);
  await Promise.all([saveFoundationPosition("tacking", { step: "practice" }), saveFoundationPosition("tacking", { diagram: 2 }), saveFoundationPosition("jibing", { step: "check" })]);
  expect((await loadFoundationPositions()).tacking).toEqual({ step: "practice", diagram: 2 });
  expect(await AsyncStorage.getItem(QUIZ_RESULTS_KEY)).toBe(original);
  const get = jest.mocked(AsyncStorage.getItem);
  get.mockRejectedValueOnce(new Error("read failed"));
  await expect(saveFoundationPosition("tacking", { step: "understand" })).rejects.toThrow();
  expect(JSON.parse((await AsyncStorage.getItem(FOUNDATION_POSITION_KEY))!).lessons.tacking.step).toBe("practice");
});

it("practice return parameters preserve a destination query and fragment", () => {
  expect(foundationPracticeRoute("/courses#wind", "wind-direction")).toBe("/courses?fromLesson=wind-direction#wind");
  expect(foundationPracticeRoute("/simulator?drill=twa45", "vmg-beating")).toBe("/simulator?drill=twa45&fromLesson=vmg-beating");
  expect(foundationPracticeRoute("/rules", "unknown")).toBe("/rules");
});

it("a read failure cannot erase other quiz results", async () => {
  const stored = JSON.stringify({ tacking: { score: 2, total: 2, answeredAt: 1 } });
  await AsyncStorage.setItem(QUIZ_RESULTS_KEY, stored);
  jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error("unavailable"));
  await expect(recordQuizResult("jibing", { score: 2, total: 2, answeredAt: 2 })).rejects.toThrow();
  expect(await AsyncStorage.getItem(QUIZ_RESULTS_KEY)).toBe(stored);
});

it("failed quiz writes stay unsaved and can be retried", async () => {
  const { result } = renderHook(() => useBootcampQuiz());
  await waitFor(() => expect(result.current.ready).toBe(true));
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error("full"));
  act(() => result.current.recordResult("tacking", 2, 2));
  await waitFor(() => expect(result.current.saveError).toBe(true));
  expect(result.current.results.tacking).toBeUndefined();
  act(() => result.current.retry());
  await waitFor(() => expect(result.current.results.tacking?.score).toBe(2));
  expect(result.current.saveError).toBe(false);
});
