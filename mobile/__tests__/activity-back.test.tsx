import { fireEvent, render } from "@testing-library/react-native";
import { ActivityBack, activityHubForRoute } from "../src/navigation/ActivityBack";

let mockCanGoBack = true;
let mockPathname = "/simulator-v3";
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockRecordNativeDiagnostic = jest.fn();
jest.mock("expo-router", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ canGoBack: () => mockCanGoBack, back: mockBack, replace: mockReplace }),
}));
jest.mock("../src/diagnostics/journal", () => ({ recordNativeDiagnostic: (...args: unknown[]) => mockRecordNativeDiagnostic(...args) }));
jest.mock("../src/i18n/context", () => ({ useI18n: () => ({ tp: (_ru: string, en: string) => en }) }));
beforeEach(() => { jest.clearAllMocks(); mockCanGoBack = true; mockPathname = "/simulator-v3"; });

test("a normal entry returns to its actual previous native screen", () => {
  mockPathname = "/replay/private-race-id?name=private-name#private-position";
  const view = render(<ActivityBack fallback="/simulators" />);
  fireEvent.press(view.getByRole("button", { name: "Back" }));
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(mockReplace).not.toHaveBeenCalled();
  expect(mockRecordNativeDiagnostic.mock.calls).toEqual([[{
    type: "navigation", surface: "app", action: "back", outcome: "accepted", source: "native", from: "replay",
  }]]);
  expect(JSON.stringify(mockRecordNativeDiagnostic.mock.calls)).not.toContain("private-");
});

test("a standalone deep link has a working activity-hub exit", () => {
  mockCanGoBack = false;
  const view = render(<ActivityBack fallback="/simulators" />);
  fireEvent.press(view.getByRole("button", { name: "Back" }));
  expect(mockBack).not.toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledWith("/simulators");
  expect(mockRecordNativeDiagnostic.mock.calls).toEqual([[{
    type: "navigation", surface: "app", action: "back", outcome: "accepted", source: "native", from: "trainer", to: "practice",
  }]]);
});

test.each([
  ["simulator2/index", "/simulators"], ["game/index", "/race"],
  ["replay/[id]", "/race"], ["learn/sails/[lesson]", "/learn"],
  ["settings/index", "/menu"], ["kursy/radio", "/learn"],
])("the stack route %s has the contextual hub %s", (route, expected) => {
  expect(activityHubForRoute(route)).toBe(expected);
});
