import { fireEvent, render } from "@testing-library/react-native";
import { ActivityBack, activityHubForRoute } from "../src/navigation/ActivityBack";

let mockCanGoBack = true;
const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ canGoBack: () => mockCanGoBack, back: mockBack, replace: mockReplace }) }));
jest.mock("../src/i18n/context", () => ({ useI18n: () => ({ tp: (_ru: string, en: string) => en }) }));
beforeEach(() => { jest.clearAllMocks(); mockCanGoBack = true; });

test("a normal entry returns to its actual previous native screen", () => {
  const view = render(<ActivityBack fallback="/simulators" />);
  fireEvent.press(view.getByRole("button", { name: "Back" }));
  expect(mockBack).toHaveBeenCalledTimes(1);
  expect(mockReplace).not.toHaveBeenCalled();
});

test("a standalone deep link has a working activity-hub exit", () => {
  mockCanGoBack = false;
  const view = render(<ActivityBack fallback="/simulators" />);
  fireEvent.press(view.getByRole("button", { name: "Back" }));
  expect(mockBack).not.toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledWith("/simulators");
});

test.each([
  ["simulator2/index", "/simulators"], ["game/index", "/race"],
  ["replay/[id]", "/race"], ["learn/sails/[lesson]", "/learn"],
  ["settings/index", "/menu"], ["kursy/radio", "/learn"],
])("the stack route %s has the contextual hub %s", (route, expected) => {
  expect(activityHubForRoute(route)).toBe(expected);
});
