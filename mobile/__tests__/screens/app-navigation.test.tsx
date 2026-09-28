import { fireEvent, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
let mockPath = "/";
const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock("expo-router", () => ({ usePathname: () => mockPath, useRouter: () => ({ replace: mockReplace, push: mockPush }) }));
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "en-US" }] }));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppNavigation } from "../../src/navigation/AppNavigation";
import { MenuButton } from "../../src/navigation/MenuButton";
import { renderWithProviders } from "../../src/test-utils";

beforeEach(async () => { await AsyncStorage.clear(); mockPath = "/"; mockReplace.mockClear(); mockPush.mockClear(); });

function renderNavigation() {
  return renderWithProviders(<AppNavigation><Text>Current screen</Text><MenuButton /></AppNavigation>);
}

test("offers a permanent Menu tab from Home without a duplicate header action", async () => {
  const view = renderNavigation();
  await waitFor(() => expect(view.getAllByRole("tab")).toHaveLength(5));
  expect(view.queryByRole("tab", { name: "Library" })).toBeNull();
  expect(view.queryByRole("button", { name: "Menu" })).toBeNull();
  fireEvent.press(view.getByRole("tab", { name: "Menu" }));
  expect(mockReplace).toHaveBeenCalledWith("/menu");
});

test.each(["/menu", "/library", "/anatomy", "/settings"])("keeps Menu selected for %s", async path => {
  mockPath = path;
  const view = renderNavigation();
  await waitFor(() => expect(view.getByRole("tab", { name: "Menu" }).props.accessibilityState.selected).toBe(true));
  fireEvent.press(view.getByRole("tab", { name: "Home" }));
  expect(mockReplace).toHaveBeenCalledWith("/");
});

test("keeps the parent course selected on a lesson deep link", async () => {
  mockPath = "/learn/sails/winch-clutch";
  const view = renderNavigation();
  await waitFor(() => expect(view.getByRole("tab", { name: "Learn" }).props.accessibilityState.selected).toBe(true));
  await waitFor(async () => expect(JSON.parse((await AsyncStorage.getItem("regatta.learning.bookmark.v1"))!)).toEqual({ version: 1, course: "sails", lesson: "winch-clutch" }));
  expect(await AsyncStorage.getItem("regatta.sailing.theory.v1")).toBeNull();
});

test("full-screen activities retain a labelled Menu action when tabs are hidden", async () => {
  mockPath = "/simulator-v3";
  const view = renderNavigation();
  await waitFor(() => view.getByRole("button", { name: "Menu" }));
  expect(view.queryAllByRole("tab")).toHaveLength(0);
  fireEvent.press(view.getByRole("button", { name: "Menu" }));
  expect(mockPush).toHaveBeenCalledWith("/menu");
});
