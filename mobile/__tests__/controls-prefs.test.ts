import { DEFAULT_CONTROL_PREFS, coerceControlPrefs } from "../src/persistence/controls";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

describe("trainer control prefs in the app", () => {
  it("defaults to wheels with sound off (no vibration setting exists)", () => {
    expect(DEFAULT_CONTROL_PREFS).toEqual({ version: 1, mode: "wheels", sound: false });
    expect(coerceControlPrefs(null)).toEqual(DEFAULT_CONTROL_PREFS);
    expect(coerceControlPrefs([1, 2])).toEqual(DEFAULT_CONTROL_PREFS);
    expect(coerceControlPrefs({ mode: "sliders", sound: true })).toEqual({ version: 1, mode: "sliders", sound: true });
  });

  it("keeps known fields valid and passes the web's other fields through", () => {
    const p = coerceControlPrefs({ mode: "joystick", sound: "yes", sensitivity: 2, dock: { trainer: { favorites: ["main"] } } });
    expect(p.mode).toBe("wheels");
    expect(p.sound).toBe(false);
    expect(p.sensitivity).toBe(2);
    expect(p.dock).toEqual({ trainer: { favorites: ["main"] } });
  });
});
