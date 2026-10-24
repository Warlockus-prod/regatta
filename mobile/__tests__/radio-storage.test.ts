jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseRadioEntries, persistRadioEntries, radioBootstrap, readRadioEntries, RADIO_STORAGE_KEY } from "../src/persistence/radio-storage";

beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); });

it("bounds complete SRC snapshots to owned keys without accepting native settings commands", () => {
  const entries = { "radio.src.progress.v2": JSON.stringify(Object.fromEntries(Array.from({ length: 324 }, (_, i) => [`src-${i}`, { seen: 4, correct: 3, wrong: 1 }]))), "sternik.radio.model.v1": "m330", "regatta.radio.offline.lang.v2": "ru" };
  expect(parseRadioEntries(entries)).toEqual(entries);
  expect(parseRadioEntries({ "regatta.analytics.v1": "erase" })).toBeNull();
  expect(parseRadioEntries({ "regatta.native-radio-owned.v1": "1" })).toBeNull();
  expect(parseRadioEntries({ "radio.src.progress.v2": "x".repeat(256 * 1024 + 1) })).toBeNull();
  expect(parseRadioEntries({ "sternik.radio.cert-name.v1": "x".repeat(64 * 1024 + 1) })).toBeNull();
});

it("retains the last durable SRC snapshot after disk failure and rejects unreadable data without rewriting it", async () => {
  const entries = { "sternik.radio.progress.v1": "original" };
  await persistRadioEntries(entries);
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("disk full"));
  await expect(persistRadioEntries({})).rejects.toThrow("disk full");
  expect(await readRadioEntries()).toEqual(entries);
  await AsyncStorage.setItem(RADIO_STORAGE_KEY, "unreadable");
  await expect(readRadioEntries()).rejects.toThrow();
  expect(await AsyncStorage.getItem(RADIO_STORAGE_KEY)).toBe("unreadable");
});

it("imports old WK progress once, then restores native snapshots and prevents resurrection after Clear all data", () => {
  const values = new Map<string, string>([["sternik.radio.progress.v1", "wk-old"], ["radio.src.progress.v2", "wk-old-quiz"], ["unrelated", "keep"]]);
  const listeners = new Map<string, () => void>();
  const localStorage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
  const window = { addEventListener: (event: string, callback: () => void) => listeners.set(event, callback) };
  const run = (entries: Record<string, string> | null) => new Function("window", "localStorage", radioBootstrap(entries, "ru"))(window, localStorage);
  run(null);
  expect(values.get("sternik.radio.progress.v1")).toBe("wk-old");
  expect(values.has("regatta.native-radio-owned.v1")).toBe(false);
  // A failed save emits no saved event and does not claim the legacy copy.
  run(null);
  expect(values.get("radio.src.progress.v2")).toBe("wk-old-quiz");
  listeners.get("regatta:radio-storage-saved")!();
  run({ "sternik.radio.progress.v1": "native-new" });
  expect(values.get("sternik.radio.progress.v1")).toBe("native-new");
  expect(values.has("radio.src.progress.v2")).toBe(false);
  run(null);
  expect(values.has("sternik.radio.progress.v1")).toBe(false);
  expect(values.get("unrelated")).toBe("keep");
});
