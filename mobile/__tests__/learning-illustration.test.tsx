import { act, fireEvent, waitFor } from "@testing-library/react-native";
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-router", () => ({
  useFocusEffect: (effect: () => void | (() => void)) => jest.requireActual("react").useEffect(effect, [effect]),
  Stack: { Screen: () => null },
  useRouter: () => ({ push: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => ({ id: "how-sail-works" }),
}));
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "en-US" }] }));
import AsyncStorage from "@react-native-async-storage/async-storage";
import BootcampLesson from "../app/bootcamp/[id]";
import { renderWithProviders, settleProgress } from "../src/test-utils";
import { saveFoundationPosition } from "../src/bootcamp/lesson-position";
import { readLearningSnapshot } from "../src/home/useLearningSnapshot";
import * as diagnostics from "../src/diagnostics/journal";
import { bootcampPilots } from "../src/lessons/pilots";
import { foundationGuides } from "../../src/data/foundation-guide";
import { sailShapeContent } from "../../src/data/sail-shape";

const diagnose = jest.spyOn(diagnostics, "recordNativeDiagnostic").mockImplementation(() => null);
const visualEvents = () => diagnose.mock.calls.map(([event]) => event).filter(event => event.type === "learning.visual");
beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); });

it("native and web use the same reviewed first-lesson teaching, with complete illustration copy", () => {
  expect(bootcampPilots["wind-direction"]!.goal).toBe(foundationGuides["wind-direction"].goal);
  expect(bootcampPilots["wind-direction"]!.explanation).toBe(foundationGuides["wind-direction"].explanation);
  const { markers, frames, ...labels } = sailShapeContent;
  for (const text of [...Object.values(labels), ...markers, ...frames.flatMap(frame => [frame.label, frame.note, frame.description])]) {
    for (const lang of ["ru", "en", "pl", "es", "fr", "de", "it"] as const) {
      expect(text[lang].trim()).not.toBe("");
      if (lang !== "ru") expect(text[lang]).not.toMatch(/[А-Яа-яЁё]/);
    }
  }
});

it("switching illustration and cloth states preserves the saved force diagram and never passes the lesson", async () => {
  await saveFoundationPosition("how-sail-works", { step: "understand", diagram: 2 });
  const view = renderWithProviders(<BootcampLesson />);
  await waitFor(() => expect(view.getByTestId("diagram-state-2").props.accessibilityState.selected).toBe(true));
  fireEvent.press(view.getByRole("button", { name: "Illustration" }));
  expect(view.getByTestId("sail-shape-filled")).toBeTruthy();
  fireEvent.press(view.getByRole("button", { name: "Luffing" }));
  expect(view.getByTestId("sail-shape-luffing")).toBeTruthy();
  fireEvent.press(view.getByRole("button", { name: "Diagram" }));
  expect(view.queryByTestId("sail-shape-luffing")).toBeNull();
  expect(view.getByTestId("diagram-state-2").props.accessibilityState.selected).toBe(true);
  await settleProgress();
  expect((await readLearningSnapshot()).bootcamp.quizResults["how-sail-works"]).toBeUndefined();
  expect(visualEvents().map(event => event.action)).toEqual(["mode", "frame", "mode"]);
});

it("a failed current image returns to the working diagram, while stale errors cannot replace another frame", async () => {
  const view = renderWithProviders(<BootcampLesson />);
  await waitFor(() => view.getByTestId("diagram-state-0"));
  fireEvent.press(view.getByRole("button", { name: "Illustration" }));
  const oldError = view.getByTestId("sail-shape-filled").props.onError;
  fireEvent.press(view.getByRole("button", { name: "Luffing" }));
  act(() => oldError({ nativeEvent: { error: "PRIVATE_SENTINEL" } }));
  expect(view.getByTestId("sail-shape-luffing")).toBeTruthy();
  fireEvent(view.getByTestId("sail-shape-luffing"), "error", { nativeEvent: { error: "PRIVATE_SENTINEL" } });
  expect(view.getByText(sailShapeContent.unavailable.en)).toBeTruthy();
  expect(view.getByTestId("diagram-image")).toBeTruthy();
  expect(view.queryByTestId("sail-shape-luffing")).toBeNull();
  expect(visualEvents().filter(event => event.action === "image-error")).toHaveLength(1);
  expect(JSON.stringify(visualEvents())).not.toContain("PRIVATE_SENTINEL");
  fireEvent.press(view.getByRole("button", { name: "Illustration" }));
  expect(view.getByTestId("sail-shape-luffing")).toBeTruthy();
  await settleProgress();
});

it("records one actual image-ready result and ignores callbacks after leaving the lesson", async () => {
  const view = renderWithProviders(<BootcampLesson />);
  await waitFor(() => view.getByTestId("diagram-state-0"));
  fireEvent.press(view.getByRole("button", { name: "Illustration" }));
  const image = view.getByTestId("sail-shape-filled");
  fireEvent(image, "load"); fireEvent(image, "load");
  expect(visualEvents().filter(event => event.action === "image-ready")).toHaveLength(1);
  const lateError = image.props.onError;
  view.unmount();
  act(() => lateError({ nativeEvent: { error: "PRIVATE_SENTINEL" } }));
  expect(visualEvents().filter(event => event.action === "image-error")).toHaveLength(0);
  await settleProgress();
});
