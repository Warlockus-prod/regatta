import { act, fireEvent, waitFor } from "@testing-library/react-native";
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
const mockPush = jest.fn();
jest.mock("expo-router", () => ({ Stack: { Screen: () => null }, useRouter: () => ({ push: mockPush, replace: jest.fn(), navigate: jest.fn() }), useFocusEffect: (cb: () => void) => require("react").useEffect(cb, [cb]) }));
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "en-US" }] }));
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SailingCourseScreen } from "../../src/sailing/SailingCourseScreen";
import { renderWithProviders } from "../../src/test-utils";
import { SAIL_PROGRESS_KEY } from "../../../src/features/sailing-lab/lessons/progress";

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
