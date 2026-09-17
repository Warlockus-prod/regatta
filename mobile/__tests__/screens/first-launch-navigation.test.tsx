import { waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "en-US" }] }));
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FirstLaunchGate } from "../../src/onboarding/first-launch-language";
import { renderWithProviders } from "../../src/test-utils";
import { useI18n } from "../../src/i18n/context";

beforeEach(async () => { await AsyncStorage.clear(); });
test.each([null, "in-tour"])("keeps navigation visible instead of resuming a promotional tour (%s)", async value => {
  if (value) await AsyncStorage.setItem("regatta.firstLaunch.v1", value);
  const view = renderWithProviders(<FirstLaunchGate><Text>Requested section</Text></FirstLaunchGate>);
  await waitFor(async () => expect(await AsyncStorage.getItem("regatta.firstLaunch.v1")).toBe("done"));
  expect(view.getByText("Requested section")).toBeTruthy();
  expect(view.queryByText("Welcome - your race-ready week")).toBeNull();
});

function LanguageProbe() { return <Text>{useI18n().lang}</Text>; }
test("preserves the selected language even if an older tour never completed", async () => {
  await AsyncStorage.setItem("regatta.lang.v1", "pl");
  const view = renderWithProviders(<FirstLaunchGate><LanguageProbe /></FirstLaunchGate>);
  await waitFor(async () => expect(await AsyncStorage.getItem("regatta.firstLaunch.v1")).toBe("done"));
  expect(view.getByText("pl")).toBeTruthy();
  expect(await AsyncStorage.getItem("regatta.lang.v1")).toBe("pl");
});
