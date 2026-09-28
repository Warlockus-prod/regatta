import { act, fireEvent, waitFor } from "@testing-library/react-native";
import { useState } from "react";
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
  fireEvent.press(view.getByRole("button", { name: "3. On the boat" }));
  fireEvent.press(view.getByRole("button", { name: "Sail trim trainer" }));
  expect(mockPush).toHaveBeenCalledWith("/simulator-v3?study=shape");
  expect(await AsyncStorage.getItem(SAIL_PROGRESS_KEY)).toBeNull();
});
test("outhaul theory saves separately from practical competence", async () => {
  const view = renderWithProviders(<SailingCourseScreen lessonId="outhaul" />);
  await waitFor(() => expect(view.getByText("Depth changes, not chord direction")).toBeTruthy());
  fireEvent.press(view.getByRole("button", { name: "2. Check" }));
  fireEvent.press(view.getByRole("button", { name: "Lower-sail depth" }));
  await waitFor(() => expect(view.getByRole("button", { name: "Save theory check" }).props.accessibilityState.disabled).not.toBe(true));
  fireEvent.press(view.getByRole("button", { name: "Save theory check" }));
  await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem(SAIL_PROGRESS_KEY))!).checked).toEqual(["outhaul"]));
  fireEvent.press(view.getByRole("button", { name: "3. On the boat" }));
  expect(view.getByText(/No practical grade/)).toBeTruthy();
  fireEvent.press(view.getByRole("button", { name: "Flatten the foot, keep the twist" }));
  expect(mockPush).toHaveBeenCalledWith("/simulator-v3?assessment=depth");
  fireEvent.press(view.getByRole("button", { name: "Open the top, keep the boom angle" }));
  expect(mockPush).toHaveBeenCalledWith("/simulator-v3?assessment=twist");
});
test("only saves a correct theory check, never a page visit", async () => {
  const view = renderWithProviders(<SailingCourseScreen lessonId="rig-basics" />);
  fireEvent.press(view.getByRole("button", { name: "2. Check" }));
  await waitFor(() => expect(view.getByRole("button", { name: "Save theory check" }).props.accessibilityState.disabled).toBe(true));
  expect(await AsyncStorage.getItem(SAIL_PROGRESS_KEY)).toBeNull();
  fireEvent.press(view.getByRole("button", { name: "Main halyard" }));
  expect(view.getByText("Not quite. Read the explanation and try again.")).toBeTruthy();
  expect(view.getByRole("button", { name: "Save theory check" }).props.accessibilityState.disabled).toBe(true);
  fireEvent.press(view.getByRole("button", { name: "Mainsheet" }));
  await waitFor(() => expect(view.getByRole("button", { name: "Save theory check" }).props.accessibilityState.disabled).not.toBe(true));
  fireEvent.press(view.getByRole("button", { name: "Save theory check" }));
  await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem(SAIL_PROGRESS_KEY))!).checked).toEqual(["rig-basics"]));
  fireEvent.press(view.getByRole("button", { name: "3. On the boat" }));
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
  fireEvent.press(view.getByRole("button", { name: "2. Check" }));
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
  fireEvent.press(view.getByRole("button", { name: "2. Check" }));
  fireEvent.press(view.getByRole("button", { name: "No, inspect the shape at different heights" }));
  await waitFor(() => expect(view.getByRole("button", { name: "Save theory check" }).props.accessibilityState.disabled).not.toBe(true));
  fireEvent.press(view.getByRole("button", { name: "Save theory check" }));
  await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem(SAIL_PROGRESS_KEY))!).checked).toEqual(["mainsheet"]));
  fireEvent.press(view.getByRole("button", { name: "3. On the boat" }));
  expect(view.getByText(/not a practical assessment/)).toBeTruthy();
  fireEvent.press(view.getByRole("button", { name: "Sail trim trainer" }));
  expect(mockPush).toHaveBeenCalledWith("/simulator-v3?study=mainsheet");
});

test("separates reading, checking and observation without granting progress", async () => {
  const view = renderWithProviders(<SailingCourseScreen lessonId="apparent-wind" />);
  await act(async () => { await AsyncStorage.getItem(SAIL_PROGRESS_KEY); });
  expect(view.queryByRole("button", { name: "Save theory check" })).toBeNull();
  expect(view.queryByText("AWA / AWS · apparent wind")).toBeNull();
  fireEvent.press(view.getByRole("button", { name: "Terms in this lesson" }));
  expect(view.getByText("AWA / AWS · apparent wind")).toBeTruthy();
  expect(view.getByText("TWA / TWS · true wind")).toBeTruthy();
  fireEvent.press(view.getByRole("button", { name: "3. On the boat" }));
  expect(view.queryByText("AWA / AWS · apparent wind")).toBeNull();
  expect(view.getByText("Observation, not a skill assessment")).toBeTruthy();
  fireEvent.press(view.getByRole("button", { name: "1. Understand" }));
  expect(view.getByText("AWA / AWS · apparent wind")).toBeTruthy();
  expect(await AsyncStorage.getItem(SAIL_PROGRESS_KEY)).toBeNull();
});

test("keeps answers within a lesson but resets them on a different lesson", async () => {
  let changeLesson: (id: string) => void = () => {};
  function TestCourse() {
    const [id, setId] = useState("rig-basics");
    changeLesson = setId;
    return <SailingCourseScreen lessonId={id} />;
  }
  const view = renderWithProviders(<TestCourse />);
  fireEvent.press(view.getByRole("button", { name: "2. Check" }));
  fireEvent.press(view.getByRole("button", { name: "Mainsheet" }));
  fireEvent.press(view.getByRole("button", { name: "1. Understand" }));
  fireEvent.press(view.getByRole("button", { name: "2. Check" }));
  await waitFor(() => expect(view.getByRole("button", { name: "Save theory check" }).props.accessibilityState.disabled).not.toBe(true));
  await act(async () => { changeLesson("apparent-wind"); });
  expect(view.queryByRole("button", { name: "Save theory check" })).toBeNull();
  fireEvent.press(view.getByRole("button", { name: "2. Check" }));
  expect(view.getByRole("button", { name: "Save theory check" }).props.accessibilityState.disabled).toBe(true);
  await act(async () => { await AsyncStorage.getItem(SAIL_PROGRESS_KEY); });
});

test("runs the offline equipment bench with load interlocks and no manufactured theory result", async () => {
  const view = renderWithProviders(<SailingCourseScreen lessonId="winch-clutch" />);
  await act(async () => { await AsyncStorage.getItem(SAIL_PROGRESS_KEY); });
  fireEvent.press(view.getByRole("button", { name: "3. On the boat" }));
  expect(view.getByText("Load held by: Clutch")).toBeTruthy();
  expect(view.queryByRole("button", { name: "Sail trim trainer" })).toBeNull();
  fireEvent.press(view.getByRole("button", { name: "Try another action" }));
  fireEvent.press(view.getByRole("button", { name: "Open the clutch fully" }));
  expect(view.getByText("Training interlock")).toBeTruthy();
  expect(view.getByText("Load held by: Clutch")).toBeTruthy();
  fireEvent.press(view.getByRole("button", { name: "Try another action" }));
  for (const action of ["Lay 3 clockwise wraps", "Control the tail", "Insert the handle", "Take up slack and take the load", "Stow the handle", "Lift the lever: first stage", "Open the clutch fully", "Ease 10 cm under control", "Close the clutch lever", "Transfer the load and check the clutch", "Remove the wraps"]) {
    fireEvent.press(view.getByRole("button", { name: action }));
  }
  expect(view.getByText(/The clutch holds the load again/)).toBeTruthy();
  expect(view.getByText("Eased: 10 cm")).toBeTruthy();
  expect(await AsyncStorage.getItem(SAIL_PROGRESS_KEY)).toBeNull();
  expect(mockPush).not.toHaveBeenCalled();
  fireEvent.press(view.getByRole("button", { name: "Start again" }));
  expect(view.getByText("Eased: 0 cm")).toBeTruthy();
  expect(view.getByRole("button", { name: "Lay 3 clockwise wraps" })).toBeTruthy();
});
