jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseRadioEntries, persistRadioEntries, radioBootstrap, readRadioEntries, RADIO_STORAGE_KEY } from "../src/persistence/radio-storage";

beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); });

// Released build 48 (50a4cf7) collected these prefixes, then saved the resulting
// object unchanged in RADIO_STORAGE_KEY. This fixture models its actual
// language picker, quiz and scenario records, not the new key allowlist.
const RELEASED48_PREFIXES = ["radio.", "sternik.radio.", "sternik.expl", "sternik.exam", "regatta.radio."];
const released48Values = () => new Map([
  ["regatta.radio.offline.lang.v1", "ru"],
  ["radio.src.progress.v1", '{"src-1-1":{"seen":2,"correct":1,"streak":1}}'],
  ["sternik.radio.progress.v1", '{"fire-mayday":{"best":80}}'],
  ["sternik.radio.guide.v2", '{"M330":4,"M323":1}'],
  ["unrelated", "keep"],
]);
function collectReleased48(values: Map<string, string>): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const [key, value] of values) {
    if (RELEASED48_PREFIXES.some(prefix => key.startsWith(prefix))) entries[key] = value;
  }
  return entries;
}

it("bounds complete SRC snapshots to owned keys without accepting native settings commands", () => {
  const entries = { "radio.src.progress.v2": JSON.stringify(Object.fromEntries(Array.from({ length: 324 }, (_, i) => [`src-${i}`, { seen: 4, correct: 3, wrong: 1 }]))), "sternik.radio.model.v1": "m330", "regatta.radio.offline.lang.v2": "ru" };
  expect(parseRadioEntries(entries)).toEqual(entries);
  expect(parseRadioEntries({ "regatta.analytics.v1": "erase" })).toBeNull();
  expect(parseRadioEntries({ "regatta.native-radio-owned.v1": "1" })).toBeNull();
  expect(parseRadioEntries({ "regatta.radio.offline.future.v9": "unknown" })).toBeNull();
  expect(parseRadioEntries({ "regatta.radio.offline.lang.v1": "x".repeat(64 * 1024 + 1) })).toBeNull();
  expect(parseRadioEntries({ "radio.src.progress.v2": "x".repeat(256 * 1024 + 1) })).toBeNull();
  expect(parseRadioEntries({ "sternik.radio.cert-name.v1": "x".repeat(64 * 1024 + 1) })).toBeNull();
  expect(parseRadioEntries({ "radio.src.progress.v1": "a".repeat(256 * 1024), "radio.src.progress.v2": "b".repeat(256 * 1024), "regatta.radio.offline.lang.v1": "ru" })).toBeNull();
});

it("opens released48 snapshots on retry without rewriting them and preserves progress through bootstrap and the next save", async () => {
  const entries = collectReleased48(released48Values());
  expect(entries["regatta.radio.offline.lang.v1"]).toBe("ru");
  expect(entries.unrelated).toBeUndefined();
  const raw = JSON.stringify(entries);
  await AsyncStorage.setItem(RADIO_STORAGE_KEY, raw);
  (AsyncStorage.setItem as jest.Mock).mockClear();
  (AsyncStorage.removeItem as jest.Mock).mockClear();
  const values = new Map<string, string>([["unrelated", "keep"], ["regatta.radio.offline.lang.v2", "pl"]]);
  const window: { __REGATTA_APP_LANG__?: string; addEventListener: () => void } = { addEventListener: () => {} };
  const localStorage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
  for (let retry = 0; retry < 3; retry++) {
    const restored = await readRadioEntries();
    expect(restored).toEqual(entries);
    new Function("window", "localStorage", radioBootstrap(restored, "en"))(window, localStorage);
    expect(window.__REGATTA_APP_LANG__).toBe("en");
    for (const [key, value] of Object.entries(entries)) expect(values.get(key)).toBe(value);
    expect(values.has("regatta.radio.offline.lang.v2")).toBe(false);
    expect(await AsyncStorage.getItem(RADIO_STORAGE_KEY)).toBe(raw);
  }
  expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
  expect(values.get("unrelated")).toBe("keep");
  // The same prefix collector is still used by the installed page. Its next
  // snapshot must accept the retired key too, rather than fail saving progress.
  const next = collectReleased48(values);
  expect(next).toEqual(entries);
  await expect(persistRadioEntries(next)).resolves.toEqual(entries);
  const saved = JSON.parse((await AsyncStorage.getItem(RADIO_STORAGE_KEY))!);
  expect(saved).toEqual(entries);
  for (const [key, value] of Object.entries(entries)) expect(saved[key]).toBe(value);
});

it("preserves an explicit v2 preference while the injected app language takes priority over the retired key", async () => {
  const entries = { ...collectReleased48(released48Values()), "regatta.radio.offline.lang.v2": "de" };
  await AsyncStorage.setItem(RADIO_STORAGE_KEY, JSON.stringify(entries));
  const restored = await readRadioEntries();
  const values = new Map<string, string>();
  const window: { __REGATTA_APP_LANG__?: string; addEventListener: () => void } = { addEventListener: () => {} };
  const localStorage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
  new Function("window", "localStorage", radioBootstrap(restored, "en"))(window, localStorage);
  expect(window.__REGATTA_APP_LANG__).toBe("en");
  expect(values.get("regatta.radio.offline.lang.v2")).toBe("de");
  expect(values.get("regatta.radio.offline.lang.v1")).toBe("ru");
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
  const values = new Map<string, string>([["sternik.radio.progress.v1", "wk-old"], ["radio.src.progress.v2", "wk-old-quiz"], ["regatta.radio.offline.lang.v1", "pl"], ["regatta.radio.offline.lang.v2", "de"], ["unrelated", "keep"]]);
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
  expect(values.get("regatta.radio.offline.lang.v1")).toBe("pl");
  listeners.get("regatta:radio-storage-saved")!();
  run({ "sternik.radio.progress.v1": "native-new", "regatta.radio.offline.lang.v1": "ru", "regatta.radio.offline.lang.v2": "en" });
  expect(values.get("sternik.radio.progress.v1")).toBe("native-new");
  expect(values.has("radio.src.progress.v2")).toBe(false);
  expect(values.get("regatta.radio.offline.lang.v1")).toBe("ru");
  run(null);
  expect(values.has("sternik.radio.progress.v1")).toBe(false);
  expect(values.has("regatta.radio.offline.lang.v1")).toBe(false);
  expect(values.has("regatta.radio.offline.lang.v2")).toBe(false);
  expect(values.get("unrelated")).toBe("keep");
});
