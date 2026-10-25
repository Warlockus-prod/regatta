jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { parseSternikEntries, persistSternikEntries, readSternikEntries, sternikBootstrap, sternikHref, STERNIK_STORAGE_KEY } from "../src/persistence/sternik-storage";

beforeEach(async () => { jest.clearAllMocks(); await AsyncStorage.clear(); });

it("accepts a full question history and 50 exam attempts without an unbounded storage bridge", () => {
  const progress = JSON.stringify({ v: 1, q: Object.fromEntries(Array.from({ length: 879 }, (_, i) => [`sternik-question-${i}`, { seen: 3, correct: 2, wrong: 1, streak: 2, lastTs: 1792850000000, lastCorrect: true }])), exams: Array.from({ length: 50 }, () => ({ ts: 1792850000000, correct: 65, total: 75, passed: true, durationSec: 4000, wrongIds: Array.from({ length: 75 }, (_, i) => `sternik-question-${i}`) })) });
  expect(progress.length).toBeGreaterThan(64 * 1024);
  expect(parseSternikEntries({ "sternik.progress.v1": progress, "sternik.explLang.v1": "ru" })).toEqual({ "sternik.progress.v1": progress, "sternik.explLang.v1": "pl" });
  expect(parseSternikEntries({ "regatta.analytics.v1": "erase" })).toBeNull();
  expect(parseSternikEntries({ "sternik.examBase.v1": "x".repeat(64 * 1024 + 1) })).toBeNull();
  expect(parseSternikEntries({ "sternik.progress.v1": "x".repeat(256 * 1024 + 1) })).toBeNull();
});

it("saves durably and does not replace existing progress after a failed or unreadable native store", async () => {
  const original = { "sternik.progress.v1": '{"v":1,"q":{},"exams":[]}' };
  await persistSternikEntries(original);
  (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error("disk full"));
  await expect(persistSternikEntries({ "sternik.examBase.v1": "internet" })).rejects.toThrow("disk full");
  expect(await readSternikEntries()).toEqual(original);
  await AsyncStorage.setItem(STERNIK_STORAGE_KEY, "unreadable");
  await expect(readSternikEntries()).rejects.toThrow();
  expect(await AsyncStorage.getItem(STERNIK_STORAGE_KEY)).toBe("unreadable");
});

it("imports legacy origin data once, marks ownership only after ack, and does not resurrect cleared data", () => {
  const values = new Map<string, string>([["sternik.progress.v1", "legacy-progress"], ["unrelated", "keep"]]);
  const listeners = new Map<string, () => void>();
  const localStorage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
  const window = { addEventListener: (event: string, callback: () => void) => listeners.set(event, callback) };
  const run = (entries: Record<string, string> | null) => new Function("window", "localStorage", sternikBootstrap(entries, "/sternik/test?cat=locja"))(window, localStorage);
  run(null);
  expect(values.get("sternik.progress.v1")).toBe("legacy-progress");
  expect(values.has("sternik.offline.native-owned.v1")).toBe(false);
  listeners.get("regatta:sternik-storage-saved")!();
  run(null);
  expect(values.has("sternik.progress.v1")).toBe(false);
  expect(values.get("unrelated")).toBe("keep");
  run({ "sternik.progress.v1": "native-authoritative", "sternik.explLang.v1": "pl" });
  expect(values.get("sternik.progress.v1")).toBe("native-authoritative");
  expect(values.get("sternik.explLang.v1")).toBe("pl");
});

it("keeps only known local subroutes and forces the Polish course", () => {
  expect(sternikHref("/sternik/test?cat=locja&lang=ru")).toBe("/sternik/test?cat=locja&lang=pl&embed=1");
  for (const href of ["https://evil.test/sternik", "//evil.test/sternik", "/sternik-else", "/sternik/../../settings", "/sternik/chat", "/sternik?" + "x".repeat(600)]) expect(sternikHref(href)).toBeNull();
});
