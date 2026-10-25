import { fireEvent, waitFor } from "@testing-library/react-native";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Diagnostics from "../../app/diagnostics";
import { renderWithProviders } from "../../src/test-utils";
import { nativeDiagnostics } from "../../src/diagnostics/journal";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-router", () => ({ Stack: { Screen: () => null } }));
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "en-US" }] }));
jest.mock("expo-clipboard", () => ({ setStringAsync: jest.fn() }));
beforeEach(async () => { await nativeDiagnostics.clear(); jest.clearAllMocks(); });
it("renders real outcomes, filters failures and clears only diagnostics", async () => {
  await AsyncStorage.setItem("regatta.progress.bootcamp.v1", "PRESERVED_PROGRESS");
  nativeDiagnostics.record({ type: "radio.command", surface: "radio", action: "dial-push", outcome: "accepted" });
  nativeDiagnostics.record({ type: "embedded.lifecycle", surface: "radio", action: "error", outcome: "failed", reason: "webview-load" });
  const view = renderWithProviders(<Diagnostics />);
  await waitFor(() => view.getByText("Accepted"));
  fireEvent.press(view.getByRole("button", { name: "Errors and rejections" }));
  expect(view.queryByText("Accepted")).toBeNull(); expect(view.getByText("Failed")).toBeTruthy();
  fireEvent.press(view.getByRole("button", { name: "Clear journal" }));
  await waitFor(() => expect(nativeDiagnostics.snapshot().entries).toHaveLength(0));
  expect(await AsyncStorage.getItem("regatta.progress.bootcamp.v1")).toBe("PRESERVED_PROGRESS");
});
it("reports copy success only after native clipboard confirms, and handles failure", async () => {
  nativeDiagnostics.record({ type: "radio.command", surface: "radio", action: "dial-push", outcome: "accepted" });
  const view = renderWithProviders(<Diagnostics />);
  const copy = await waitFor(() => view.getByRole("button", { name: "Copy journal" }));
  (Clipboard.setStringAsync as jest.Mock).mockResolvedValueOnce(true);
  fireEvent.press(copy); await waitFor(() => view.getByText("Copied"));
  expect(JSON.parse((Clipboard.setStringAsync as jest.Mock).mock.calls[0][0]).entries[0].event.action).toBe("dial-push");
  (Clipboard.setStringAsync as jest.Mock).mockRejectedValueOnce(new Error("unavailable"));
  fireEvent.press(copy); await waitFor(() => view.getByText("Could not copy"));
});
