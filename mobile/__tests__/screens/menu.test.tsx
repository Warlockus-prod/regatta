import { fireEvent, waitFor } from "@testing-library/react-native";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => {
  const { useEffect } = jest.requireActual("react");
  return { Stack: { Screen: () => null }, useRouter: () => ({ push: mockPush, replace: mockReplace }), useFocusEffect: (effect: () => void | (() => void)) => useEffect(effect, [effect]) };
});
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "en-US" }] }));

import AsyncStorage from "@react-native-async-storage/async-storage";
import Menu from "../../app/menu";
import { renderWithProviders } from "../../src/test-utils";

beforeEach(async () => { await AsyncStorage.clear(); mockPush.mockClear(); mockReplace.mockClear(); });

test("menu searches every section and opens the requested screen directly", async () => {
  const view = renderWithProviders(<Menu />);
  await waitFor(() => view.getByText("My progress"));
  fireEvent.changeText(view.getByLabelText("Search sections"), "radio");
  expect(view.queryByText("3D Boat")).toBeNull();
  fireEvent.press(view.getByText("SRC radio"));
  expect(mockPush).toHaveBeenCalledWith("/kursy/radio");
  fireEvent.press(view.getByText("Clear search"));
  await waitFor(() => view.getByText("My progress"));
  fireEvent.press(view.getByText("3D Boat"));
  expect(mockPush).toHaveBeenCalledWith("/simulator2");
});

test("menu holds the reference material and settings, each destination once", async () => {
  const view = renderWithProviders(<Menu />);
  await waitFor(() => view.getByText("My progress"));
  expect(view.getByText("Library")).toBeTruthy();
  expect(view.getByText("App")).toBeTruthy();
  for (const title of ["Sailing glossary", "Yacht anatomy", "Settings", "3D Boat", "SRC radio"]) {
    expect(view.getAllByText(title)).toHaveLength(1);
  }
  expect(view.queryByText("Main sections")).toBeNull();
  fireEvent.changeText(view.getByLabelText("Search sections"), "does not exist");
  expect(view.getByText("No matching section. Try another word.")).toBeTruthy();
});

test("menu progress names what it counts and does not count viewed lessons as passed", async () => {
  await AsyncStorage.setItem("regatta.progress.bootcamp.v1", JSON.stringify(["wind-direction", "tacking"]));
  const view = renderWithProviders(<Menu />);
  await waitFor(() => view.getByText("Passed 0 of 8"));
  expect(view.getByText("Theory checked: 0 of 12")).toBeTruthy();
  expect(view.getByText("Races saved: 0")).toBeTruthy();
  expect(view.getByText("Stored on this device.")).toBeTruthy();
});
