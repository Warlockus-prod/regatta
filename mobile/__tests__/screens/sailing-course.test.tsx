import { act, fireEvent, waitFor } from "@testing-library/react-native";
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
const mockPush = jest.fn();
jest.mock("expo-router", () => ({ Stack: { Screen: () => null }, useRouter: () => ({ push: mockPush, replace: jest.fn(), navigate: jest.fn() }), useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]) }));
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "en-US" }] }));
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SailingCourseScreen } from "../../src/sailing/SailingCourseScreen";
import { renderWithProviders } from "../../src/test-utils";
import { SAIL_PROGRESS_KEY } from "../../../src/features/sailing-lab/lessons/progress";
import { AnalyticsClientContext } from "../../src/analytics/context";

const REVIEW_KEY = "regatta.review.v1";

beforeEach(async () => { await AsyncStorage.clear(); mockPush.mockClear(); });
test("bundled vang lesson changes the diagram and enters the ungraded shape session", async () => {
  const view = renderWithProviders(<SailingCourseScreen lessonId="vang" />);
  await waitFor(() => expect(view.getByRole("button", { name: "Eased" })).toBeTruthy());
  expect(view.getByText(/Block separation:.*2°/)).toBeTruthy();
  fireEvent.press(view.getByRole("button", { name: "Eased" }));
  expect(view.getByText(/Block separation:.*8°/)).toBeTruthy();
  fireEvent.press(view.getByRole("button", { name: "Sail trim trainer" }));
  expect(mockPush).toHaveBeenCalledWith("/simulator-v3?study=shape");
  expect(await AsyncStorage.getItem(SAIL_PROGRESS_KEY)).toBeNull();
});
test("outhaul theory saves separately from practical competence", async () => {
  const view = renderWithProviders(<SailingCourseScreen lessonId="outhaul" />);
  await waitFor(() => expect(view.getByText("Depth changes, not chord direction")).toBeTruthy());
  fireEvent.press(view.getByRole("button", { name: "Lower-sail depth" }));
  await waitFor(() => expect(view.getByRole("button", { name: "Save theory check" }).props.accessibilityState.disabled).not.toBe(true));
  fireEvent.press(view.getByRole("button", { name: "Save theory check" }));
  await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem(SAIL_PROGRESS_KEY))!).checked).toEqual(["outhaul"]));
  expect(view.getByText(/No practical grade/)).toBeTruthy();
});
test("only saves a correct theory check, never a page visit", async () => {
  const view = renderWithProviders(<SailingCourseScreen lessonId="rig-basics" />);
  await waitFor(() => expect(view.getByRole("button", { name: "Save theory check" }).props.accessibilityState.disabled).toBe(true));
  expect(await AsyncStorage.getItem(SAIL_PROGRESS_KEY)).toBeNull();
  fireEvent.press(view.getByRole("button", { name: "Main halyard" }));
  expect(view.getByText("Not quite. Read the explanation and try again.")).toBeTruthy();
  expect(view.getByRole("button", { name: "Save theory check" }).props.accessibilityState.disabled).toBe(true);
  fireEvent.press(view.getByRole("button", { name: "Mainsheet" }));
  await waitFor(() => expect(view.getByRole("button", { name: "Save theory check" }).props.accessibilityState.disabled).not.toBe(true));
  fireEvent.press(view.getByRole("button", { name: "Save theory check" }));
  await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem(SAIL_PROGRESS_KEY))!).checked).toEqual(["rig-basics"]));
  fireEvent.press(view.getByRole("button", { name: "3D Boat" }));
  expect(mockPush).toHaveBeenCalledWith("/simulator2");
});
test("resumes the next unchecked lesson and recovers an invalid deep link", async () => {
  await AsyncStorage.setItem(SAIL_PROGRESS_KEY, JSON.stringify({ version: 1, checked: ["rig-basics"], current: "rig-basics" }));
  const view = renderWithProviders(<SailingCourseScreen />);
  await waitFor(() => expect(view.getByRole("button", { name: "Which wind the sail feels" }).props.accessibilityState.disabled).not.toBe(true));
  fireEvent.press(view.getByRole("button", { name: "Which wind the sail feels" }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: "/learn/sails/[lesson]", params: { lesson: "apparent-wind" } });
  view.unmount();
  const missing = renderWithProviders(<SailingCourseScreen lessonId="bad-id" />);
  await act(async () => { await AsyncStorage.getItem(SAIL_PROGRESS_KEY); });
  expect(missing.getByRole("button", { name: "Back to lessons" })).toBeTruthy();
});

test("keeps the save action available after a storage failure", async () => {
  const view = renderWithProviders(<SailingCourseScreen lessonId="rig-basics" />);
  fireEvent.press(view.getByRole("button", { name: "Mainsheet" }));
  await waitFor(() => expect(view.getByRole("button", { name: "Save theory check" }).props.accessibilityState.disabled).not.toBe(true));
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error("Storage unavailable"));
  fireEvent.press(view.getByRole("button", { name: "Save theory check" }));
  await waitFor(() => expect(view.getByRole("alert")).toBeTruthy());
  expect(await AsyncStorage.getItem(SAIL_PROGRESS_KEY)).toBeNull();
  fireEvent.press(view.getByRole("button", { name: "Save theory check" }));
  await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem(SAIL_PROGRESS_KEY))!).checked).toEqual(["rig-basics"]));
  expect(view.queryByRole("alert")).toBeNull();
});

test("a failed save is not a completion: no lesson_completed and no review win until it saves", async () => {
  const capture = jest.fn();
  const view = renderWithProviders(
    <AnalyticsClientContext.Provider value={{ capture } as never}>
      <SailingCourseScreen lessonId="rig-basics" />
    </AnalyticsClientContext.Provider>,
  );
  fireEvent.press(view.getByRole("button", { name: "Mainsheet" }));
  await waitFor(() => expect(view.getByRole("button", { name: "Save theory check" }).props.accessibilityState.disabled).not.toBe(true));
  jest.mocked(AsyncStorage.setItem).mockRejectedValueOnce(new Error("Storage unavailable"));
  fireEvent.press(view.getByRole("button", { name: "Save theory check" }));
  await waitFor(() => expect(view.getByRole("alert")).toBeTruthy());
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  expect(capture).not.toHaveBeenCalled();
  expect(await AsyncStorage.getItem(REVIEW_KEY)).toBeNull();
  // The retry saves: now it counts, exactly once.
  fireEvent.press(view.getByRole("button", { name: "Save theory check" }));
  await waitFor(() => expect(capture).toHaveBeenCalledTimes(1));
  expect(capture).toHaveBeenCalledWith("lesson_completed", { course: "sails", lesson_id: "rig-basics" });
  await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem(REVIEW_KEY))!).wins).toBe(1));
});

test("mainsheet comparison works from bundled content and does not claim practical completion", async () => {
  const view = renderWithProviders(<SailingCourseScreen lessonId="mainsheet" />);
  await waitFor(() => expect(view.getByRole("button", { name: "Shorter sheet, centered car" })).toBeTruthy());
  expect(view.getByText(/Boom rise: 1°/)).toBeTruthy();
  fireEvent.press(view.getByRole("button", { name: "Longer sheet, car to windward" }));
  expect(view.getByText(/Boom rise: 5°/)).toBeTruthy();
  fireEvent.press(view.getByRole("button", { name: "No, inspect the shape at different heights" }));
  await waitFor(() => expect(view.getByRole("button", { name: "Save theory check" }).props.accessibilityState.disabled).not.toBe(true));
  fireEvent.press(view.getByRole("button", { name: "Save theory check" }));
  await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem(SAIL_PROGRESS_KEY))!).checked).toEqual(["mainsheet"]));
  expect(view.getByText(/not a practical assessment/)).toBeTruthy();
  fireEvent.press(view.getByRole("button", { name: "Sail trim trainer" }));
  expect(mockPush).toHaveBeenCalledWith("/simulator-v3?study=mainsheet");
});
