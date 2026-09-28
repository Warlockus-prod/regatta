import { fireEvent, waitFor } from "@testing-library/react-native";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
const mockPush = jest.fn();
jest.mock("expo-router", () => ({ Stack: { Screen: () => null }, useRouter: () => ({ push: mockPush }), useLocalSearchParams: () => ({}), useFocusEffect: (fn: () => (() => void)) => require("react").useEffect(fn, [fn]) }));
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "en-US" }] }));

import AsyncStorage from "@react-native-async-storage/async-storage";
import Home from "../../app/index";
import { renderWithProviders } from "../../src/test-utils";

beforeEach(async () => { await AsyncStorage.clear(); mockPush.mockClear(); });

describe("Home entry flows", () => {
  it("keeps course shortcuts without duplicating the global Menu tab in the header", async () => {
    const view = renderWithProviders(<Home />);
    await waitFor(() => view.getByText("Working with sails"));
    expect(view.queryByRole("button", { name: "Menu" })).toBeNull();
    fireEvent.press(view.getByText("Working with sails"));
    expect(mockPush).toHaveBeenCalledWith("/learn/sails");
  });
  it("takes a new learner directly to the first lesson", async () => {
    const view = renderWithProviders(<Home />);
    await waitFor(() => expect(view.getByRole("button", { name: "Start the first lesson" }).props.accessibilityState.disabled).not.toBe(true));
    fireEvent.press(view.getByRole("button", { name: "Start the first lesson" }));
    expect(mockPush).toHaveBeenCalledWith("/bootcamp/wind-direction");
  });
  it("resumes the actual unfinished lesson with nonsequential progress", async () => {
    await AsyncStorage.setItem("regatta.progress.bootcamp.v1", JSON.stringify(["wind-direction", "tacking"]));
    await AsyncStorage.setItem("regatta.progress.bootcamp.lastViewed.v1", JSON.stringify("how-sail-works"));
    const view = renderWithProviders(<Home />);
    await waitFor(() => view.getByRole("button", { name: "Continue learning" }));
    fireEvent.press(view.getByRole("button", { name: "Continue learning" }));
    expect(mockPush).toHaveBeenCalledWith("/bootcamp/how-sail-works");
  });
  it("honors persisted Polish language without duplicating bottom navigation", async () => {
    await AsyncStorage.setItem("regatta.lang.v1", "pl");
    const view = renderWithProviders(<Home />);
    await waitFor(() => view.getByText("Twoja nauka"));
    expect(view.queryByText("Trening")).toBeNull();
    fireEvent.press(view.getByText("Radio SRC"));
    expect(mockPush).toHaveBeenCalledWith("/kursy/radio");
  });
  it("resumes a sail lesson without claiming its theory is passed", async () => {
    await AsyncStorage.setItem("regatta.learning.bookmark.v1", JSON.stringify({ version: 1, course: "sails", lesson: "winch-clutch" }));
    const view = renderWithProviders(<Home />);
    await waitFor(() => view.getByRole("button", { name: "Continue learning" }));
    expect(view.getByRole("progressbar").props.accessibilityValue.now).toBe(0);
    fireEvent.press(view.getByRole("button", { name: "Continue learning" }));
    expect(mockPush).toHaveBeenCalledWith("/learn/sails/winch-clutch");
  });
  it("shows retry and all courses if reading storage fails", async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error("Unavailable"));
    const view = renderWithProviders(<Home />);
    await waitFor(() => view.getByRole("button", { name: "Try again" }));
    expect(view.queryByRole("button", { name: "Start the first lesson" })).toBeNull();
    expect(view.getByText("SRC radio")).toBeTruthy();
    fireEvent.press(view.getByRole("button", { name: "Try again" }));
    await waitFor(() => view.getByRole("button", { name: "Start the first lesson" }));
  });
});
