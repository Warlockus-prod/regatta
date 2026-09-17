import { fireEvent, waitFor } from "@testing-library/react-native";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({ Stack: { Screen: () => null }, useRouter: () => ({ push: mockPush, replace: mockReplace }) }));
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "en-US" }] }));

import AsyncStorage from "@react-native-async-storage/async-storage";
import Menu from "../../app/menu";
import { renderWithProviders } from "../../src/test-utils";

beforeEach(async () => { await AsyncStorage.clear(); mockPush.mockClear(); mockReplace.mockClear(); });

test("menu searches every section and opens the requested screen directly", async () => {
  const view = renderWithProviders(<Menu />);
  await waitFor(() => view.getByText("Main sections"));
  fireEvent.changeText(view.getByLabelText("Search sections"), "radio");
  expect(view.queryByText("3D Boat")).toBeNull();
  fireEvent.press(view.getByText("SRC radio"));
  expect(mockPush).toHaveBeenCalledWith("/kursy/radio");
  fireEvent.press(view.getByText("Clear search"));
  fireEvent.press(view.getByText("3D Boat"));
  expect(mockPush).toHaveBeenCalledWith("/simulator2");
});

test("menu provides a way home and an understandable empty result", async () => {
  const view = renderWithProviders(<Menu />);
  await waitFor(() => view.getByText("Main sections"));
  fireEvent.press(view.getByText("Home"));
  expect(mockReplace).toHaveBeenCalledWith("/");
  fireEvent.changeText(view.getByLabelText("Search sections"), "does not exist");
  expect(view.getByText("No matching section. Try another word.")).toBeTruthy();
});
