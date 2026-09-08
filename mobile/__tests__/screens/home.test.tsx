import { fireEvent, waitFor } from "@testing-library/react-native";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
const mockPush = jest.fn();
jest.mock("expo-router", () => ({ Stack: { Screen: () => null }, useRouter: () => ({ push: mockPush }), useLocalSearchParams: () => ({}) }));
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "en-US" }] }));

import AsyncStorage from "@react-native-async-storage/async-storage";
import Home from "../../app/index";
import { renderWithProviders } from "../../src/test-utils";

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
  it("honors persisted Polish language and keeps practice reachable", async () => {
    await AsyncStorage.setItem("regatta.lang.v1", "pl");
    const view = renderWithProviders(<Home />);
    await waitFor(() => view.getByText("Żeglarstwo. Krok po kroku."));
    fireEvent.press(view.getByText("Trening"));
    expect(mockPush).toHaveBeenCalledWith("/simulators");
  });
});
