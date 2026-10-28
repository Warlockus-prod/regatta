jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { loadRaceById, readRaces, saveRaceRecord, useRaceHistory } from "../src/persistence/race-history";
import { nativeDiagnostics } from "../src/diagnostics/journal";

const key = "regatta.race-history.v1";
const legacy = { id: "PRIVATE_SAVED_ID", courseId: "short", timeSec: 75, score: 90, finishedAt: 1,
  replay: [{ x: 160, y: 300, t: 0 }, { x: 160, y: 60, t: 40 }] };
const historyEvents = () => nativeDiagnostics.snapshot().entries.map(entry => entry.event).filter(event => event.type === "storage.operation" && event.target === "history");
const clearEvents = () => historyEvents().filter(event => event.type === "storage.operation" && event.action === "clear");

beforeEach(async () => { await nativeDiagnostics.clear(); jest.clearAllMocks(); await AsyncStorage.clear(); });
afterEach(async () => { jest.restoreAllMocks(); await nativeDiagnostics.clear(); });

it("records one actual read outcome after a delayed row read, without copying its ID or values", async () => {
  let finish!: (value: string) => void;
  (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(() => new Promise<string>(resolve => { finish = resolve; }));
  const read = loadRaceById(legacy.id);
  expect(historyEvents()).toEqual([]);
  finish(JSON.stringify([legacy]));
  expect(await read).toEqual(legacy);
  expect(historyEvents()).toEqual([{ type: "storage.operation", surface: "app", action: "read", target: "history", outcome: "accepted" }]);
  expect(JSON.stringify(nativeDiagnostics.snapshot())).not.toMatch(/PRIVATE_SAVED_ID|"replay":|"x":|"y":/);
});

it.each([
  ["unsupported", { schema: 2 }, "unsupported"],
  ["corrupt", null, "storage-invalid"],
] as const)("keeps an %s saved world row intact and records only a classified rejection", async (_kind, webRace, reason) => {
  const row = { ...legacy, webRace }, bytes = JSON.stringify([row]);
  await AsyncStorage.setItem(key, bytes);
  (AsyncStorage.setItem as jest.Mock).mockClear();
  expect(await loadRaceById(legacy.id)).toEqual(row);
  expect(historyEvents()).toEqual([{ type: "storage.operation", surface: "app", action: "read", target: "history", outcome: "rejected", reason }]);
  expect(await AsyncStorage.getItem(key)).toBe(bytes);
  expect((AsyncStorage.setItem as jest.Mock).mock.calls.filter(([storedKey]) => storedKey === key)).toEqual([]);
});

it("distinguishes missing rows from storage failure and corrupt storage without writing progress", async () => {
  expect(await loadRaceById("PRIVATE_MISSING_ID")).toBeNull();
  expect(historyEvents()).toEqual([{ type: "storage.operation", surface: "app", action: "read", target: "history", outcome: "noop", reason: "not-found" }]);
  await nativeDiagnostics.clear();
  (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error("PRIVATE_STORAGE_ERROR"));
  expect(await loadRaceById(legacy.id)).toBeNull();
  expect(historyEvents()).toEqual([{ type: "storage.operation", surface: "app", action: "read", target: "history", outcome: "failed", reason: "storage-read" }]);
  await nativeDiagnostics.clear();
  await AsyncStorage.setItem(key, "PRIVATE_CORRUPT_JSON");
  expect(await readRaces()).toEqual([]);
  expect(historyEvents()).toEqual([{ type: "storage.operation", surface: "app", action: "read", target: "history", outcome: "rejected", reason: "storage-invalid" }]);
  expect(await AsyncStorage.getItem(key)).toBe("PRIVATE_CORRUPT_JSON");
  expect(JSON.stringify(nativeDiagnostics.snapshot())).not.toMatch(/PRIVATE_/);
});

it("does not drop future rows or rewrite valid history while reading its list", async () => {
  const rows = [legacy, { ...legacy, id: "future", webRace: { schema: 9 } }], bytes = JSON.stringify(rows);
  await AsyncStorage.setItem(key, bytes);
  (AsyncStorage.setItem as jest.Mock).mockClear();
  expect(await readRaces()).toEqual(rows);
  expect(historyEvents()).toEqual([{ type: "storage.operation", surface: "app", action: "read", target: "history", outcome: "accepted" }]);
  expect(await AsyncStorage.getItem(key)).toBe(bytes);
  expect((AsyncStorage.setItem as jest.Mock).mock.calls.filter(([storedKey]) => storedKey === key)).toEqual([]);
});

it("publishes and acknowledges a clear only after the actual remove finishes", async () => {
  await AsyncStorage.setItem(key, JSON.stringify([legacy]));
  const view = renderHook(() => useRaceHistory());
  await waitFor(() => expect(view.result.current.ready).toBe(true));
  await nativeDiagnostics.clear();
  let finish!: () => Promise<void>;
  const remove = (AsyncStorage.removeItem as jest.Mock).getMockImplementation()!;
  (AsyncStorage.removeItem as jest.Mock).mockImplementationOnce((storedKey: string) => new Promise<void>(resolve => {
    finish = async () => { await remove(storedKey); resolve(); };
  }));
  let clearing!: Promise<void>;
  act(() => { clearing = view.result.current.clear(); });
  await waitFor(() => expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key));
  expect(view.result.current.races).toEqual([legacy]);
  expect(clearEvents()).toEqual([]);
  await act(async () => { await finish(); await clearing; });
  expect(await AsyncStorage.getItem(key)).toBeNull();
  expect(view.result.current.races).toEqual([]);
  expect(clearEvents()).toEqual([{ type: "storage.operation", surface: "app", action: "clear", target: "history", outcome: "accepted" }]);
});

it("retains history after a failed clear and records no accepted deletion", async () => {
  const bytes = JSON.stringify([legacy]);
  await AsyncStorage.setItem(key, bytes);
  const view = renderHook(() => useRaceHistory());
  await waitFor(() => expect(view.result.current.ready).toBe(true));
  await nativeDiagnostics.clear();
  (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(new Error("PRIVATE_CLEAR_ERROR"));
  await act(async () => { await view.result.current.clear(); });
  expect(await AsyncStorage.getItem(key)).toBe(bytes);
  expect(view.result.current.races).toEqual([legacy]);
  expect(clearEvents()).toEqual([{ type: "storage.operation", surface: "app", action: "clear", target: "history", outcome: "failed", reason: "storage-write" }]);
  expect(JSON.stringify(nativeDiagnostics.snapshot())).not.toContain("PRIVATE_CLEAR_ERROR");
});

it("serializes clear after a pending save rather than resurrecting the saved row", async () => {
  const view = renderHook(() => useRaceHistory());
  await waitFor(() => expect(view.result.current.ready).toBe(true));
  await nativeDiagnostics.clear();
  let finish!: () => Promise<void>;
  const set = (AsyncStorage.setItem as jest.Mock).getMockImplementation()!;
  (AsyncStorage.setItem as jest.Mock).mockImplementationOnce((storedKey: string, value: string) => new Promise<void>(resolve => {
    finish = async () => { await set(storedKey, value); resolve(); };
  }));
  const saving = saveRaceRecord(legacy);
  await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalledWith(key, expect.any(String)));
  let clearing!: Promise<void>;
  act(() => { clearing = view.result.current.clear(); });
  expect(clearEvents()).toEqual([]);
  expect((AsyncStorage.removeItem as jest.Mock).mock.calls.filter(([storedKey]) => storedKey === key)).toEqual([]);
  await act(async () => { await finish(); await saving; await clearing; });
  expect(await AsyncStorage.getItem(key)).toBeNull();
  expect(view.result.current.races).toEqual([]);
  expect(clearEvents()).toEqual([{ type: "storage.operation", surface: "app", action: "clear", target: "history", outcome: "accepted" }]);
});

it("preserves actual reads and clears when the diagnostic recorder fails", async () => {
  await AsyncStorage.setItem(key, JSON.stringify([legacy]));
  const view = renderHook(() => useRaceHistory());
  await waitFor(() => expect(view.result.current.ready).toBe(true));
  const record = jest.spyOn(nativeDiagnostics, "record").mockImplementation(() => { throw new Error("diagnostic-unavailable"); });
  try {
    expect(await loadRaceById(legacy.id)).toEqual(legacy);
    await act(async () => { await view.result.current.clear(); });
    expect(await AsyncStorage.getItem(key)).toBeNull();
    expect(view.result.current.races).toEqual([]);
  } finally { record.mockRestore(); }
});
