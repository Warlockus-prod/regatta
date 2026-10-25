jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createDiagnosticJournal, DIAGNOSTIC_BATCH_MAX_BYTES, DIAGNOSTIC_MAX_ENTRIES, DIAGNOSTIC_STORAGE_KEY, parseDiagnosticPersistence, serializeDiagnosticPersistence, type DiagnosticInput } from "../../../src/lib/diagnostics";
import { createNativeDiagnosticService, handleNativeDiagnosticMessage, nativeDiagnostics } from "./journal";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    storage: {
      getItem: jest.fn(async (key: string): Promise<string | null> => values.get(key) ?? null),
      setItem: jest.fn(async (key: string, value: string): Promise<void> => { values.set(key, value); }),
      removeItem: jest.fn(async (key: string): Promise<void> => { values.delete(key); }),
    },
  };
}
const command: DiagnosticInput = { type: "radio.command", surface: "radio", action: "dial-push", outcome: "accepted", model: "M330", screenFrom: "standby", screenTo: "volume", power: true, volume: 16, squelch: 4, channel: 16 };
const persisted = () => {
  const journal = createDiagnosticJournal({ now: () => 0 });
  journal.record({ type: "navigation", surface: "app", action: "request", outcome: "accepted", from: "home", to: "practice" });
  return serializeDiagnosticPersistence(journal.snapshot(), Date.now())!;
};
const settle = async () => { for (let turn = 0; turn < 12; turn++) await Promise.resolve(); };

beforeEach(async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-25T12:00:00Z"));
  await nativeDiagnostics.clear();
  await AsyncStorage.clear();
});
afterEach(async () => {
  await nativeDiagnostics.initialize();
  await nativeDiagnostics.clear();
  jest.clearAllTimers();
  jest.useRealTimers();
});

describe("the actual native diagnostic persistence service", () => {
  it("records immediately during a delayed read, then merges saved entries without losing the live event", async () => {
    const { storage } = memoryStorage(), read = deferred<string | null>();
    storage.getItem.mockImplementation(() => read.promise);
    const service = createNativeDiagnosticService(storage, () => 0);
    expect(service.record(command)).not.toBeNull();
    expect(service.snapshot().entries.map(entry => entry.event.type)).toEqual(["radio.command"]);
    expect(storage.setItem).not.toHaveBeenCalled();
    read.resolve(persisted());
    await service.initialize();
    expect(service.snapshot().entries.map(entry => entry.event.type)).toEqual(["navigation", "radio.command"]);
    expect(new Set(service.snapshot().entries.map(entry => entry.seq)).size).toBe(2);
    expect(storage.getItem).toHaveBeenCalledTimes(1);
    await service.flush();
  });

  it("does not resurrect a delayed saved read after global Clear all data", async () => {
    const { storage, values } = memoryStorage(), read = deferred<string | null>();
    storage.getItem.mockImplementation(() => read.promise);
    const service = createNativeDiagnosticService(storage);
    service.record(command);
    const boot = service.initialize();
    service.suspendForGlobalClear();
    values.clear();
    read.resolve(persisted());
    await boot; await service.flush(); await settle();
    expect(service.snapshot().entries).toEqual([]);
    expect(values.has(DIAGNOSTIC_STORAGE_KEY)).toBe(false);
    expect(storage.setItem).not.toHaveBeenCalled();
    service.record(command); // New memory-only events cannot re-enable a suspended writer.
    await jest.advanceTimersByTimeAsync(1000); await service.flush();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("removes an already-issued delayed write which finishes after global Clear all data", async () => {
    const { storage, values } = memoryStorage(), write = deferred<void>();
    storage.setItem.mockImplementation(async (key, value) => { await write.promise; values.set(key, value); });
    const service = createNativeDiagnosticService(storage);
    await service.initialize(); service.record(command);
    const flush = service.flush();
    await settle(); expect(storage.setItem).toHaveBeenCalledTimes(1);
    for (let request = 0; request < 40; request++) expect(service.flush()).toBe(flush);
    service.suspendForGlobalClear(); values.clear();
    write.resolve(undefined);
    await flush; await settle();
    expect(values.has(DIAGNOSTIC_STORAGE_KEY)).toBe(false);
    expect(storage.removeItem).toHaveBeenCalled();
    expect(service.snapshot().entries).toEqual([]);
    await service.flush(); expect(storage.setItem).toHaveBeenCalledTimes(1);
  });

  it("coalesces many flushes behind one stalled write and persists one latest follow-up snapshot", async () => {
    const { storage, values } = memoryStorage(), write = deferred<void>();
    storage.setItem.mockImplementationOnce(async (key, value) => { await write.promise; values.set(key, value); });
    const service = createNativeDiagnosticService(storage);
    await service.initialize(); service.record(command);
    const first = service.flush(); await settle();
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    for (let request = 0; request < 50; request++) {
      service.record({ type: "radio.command", surface: "radio", action: "dial-rotate", direction: 1, outcome: "accepted", volume: request % 21 });
      expect(service.flush()).toBe(first);
    }
    service.record({ type: "storage.operation", surface: "radio", action: "write", target: "course", outcome: "failed", reason: "storage-write" });
    expect(service.flush()).toBe(first);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    write.resolve(undefined); await first; await settle();
    expect(storage.setItem).toHaveBeenCalledTimes(2);
    const saved = parseDiagnosticPersistence(values.get(DIAGNOSTIC_STORAGE_KEY), Date.now());
    expect(saved?.entries.at(-1)?.event).toMatchObject({ type: "storage.operation", outcome: "failed", reason: "storage-write" });
    await jest.advanceTimersByTimeAsync(1000);
    expect(storage.setItem).toHaveBeenCalledTimes(2);
  });

  it("puts the latest coalesced write after an intervening clear barrier without restoring the old entry", async () => {
    const { storage, values } = memoryStorage(), write = deferred<void>();
    storage.setItem.mockImplementationOnce(async (key, value) => { await write.promise; values.set(key, value); });
    const service = createNativeDiagnosticService(storage);
    await service.initialize(); service.record(command);
    const first = service.flush(); await settle();
    expect(service.flush()).toBe(first);
    const clearing = service.clear();
    service.record({ type: "navigation", surface: "app", action: "back", outcome: "accepted", to: "home" });
    expect(service.flush()).toBe(first);
    write.resolve(undefined); await Promise.all([first, clearing]); await settle();
    expect(storage.setItem).toHaveBeenCalledTimes(2);
    const saved = parseDiagnosticPersistence(values.get(DIAGNOSTIC_STORAGE_KEY), Date.now());
    expect(saved?.entries).toHaveLength(1);
    expect(saved?.entries[0].event).toMatchObject({ type: "navigation", action: "back" });
  });

  it("clear invalidates the old read but allows a genuinely new command to persist afterwards", async () => {
    const { storage, values } = memoryStorage(), read = deferred<string | null>();
    storage.getItem.mockImplementation(() => read.promise);
    const service = createNativeDiagnosticService(storage);
    service.record(command); const boot = service.initialize();
    await service.clear(); read.resolve(persisted()); await boot;
    expect(service.snapshot().entries).toEqual([]);
    service.record({ type: "navigation", surface: "app", action: "back", outcome: "accepted", to: "home" });
    await service.flush();
    const saved = parseDiagnosticPersistence(values.get(DIAGNOSTIC_STORAGE_KEY), Date.now());
    expect(saved?.entries).toHaveLength(1);
    expect(saved?.entries[0].event).toMatchObject({ type: "navigation", action: "back" });
  });

  it("bounds a stalled read and refuses its late data while memory recording remains usable", async () => {
    const { storage } = memoryStorage(), read = deferred<string | null>();
    storage.getItem.mockImplementation(() => read.promise);
    const service = createNativeDiagnosticService(storage);
    service.record(command); const boot = service.initialize();
    await settle(); await jest.advanceTimersByTimeAsync(2000); await boot;
    expect(service.persistenceAvailable()).toBe(false);
    read.resolve(persisted()); await settle();
    expect(service.snapshot().entries.map(entry => entry.event.type)).toEqual(["radio.command"]);
    expect(service.record(command)).not.toBeNull();
    await service.flush();
  });

  it("keeps storage read/write/remove exceptions out of commands and out of stored diagnostics", async () => {
    const { storage } = memoryStorage();
    storage.getItem.mockRejectedValue(new Error("PRIVATE_READ_PAYLOAD"));
    storage.setItem.mockRejectedValue(new Error("PRIVATE_WRITE_PAYLOAD"));
    storage.removeItem.mockRejectedValue(new Error("PRIVATE_REMOVE_PAYLOAD"));
    const service = createNativeDiagnosticService(storage);
    await expect(service.initialize()).resolves.toBeUndefined();
    expect(service.record(command)).not.toBeNull();
    await expect(service.flush()).resolves.toBeUndefined();
    expect(service.persistenceAvailable()).toBe(false);
    expect(JSON.stringify(service.snapshot())).not.toContain("PRIVATE_");
    await expect(service.clear()).resolves.toBeUndefined();
    expect(service.snapshot().entries).toEqual([]);
  });

  it("bounds the actual service ring before persistence", async () => {
    const { storage, values } = memoryStorage();
    let clock = 0;
    const service = createNativeDiagnosticService(storage, () => clock);
    for (let index = 0; index < DIAGNOSTIC_MAX_ENTRIES + 30; index++) {
      clock += 300;
      service.record({ type: "navigation", surface: "app", action: "request", outcome: "accepted", from: "home", to: "practice" });
    }
    expect(service.snapshot().entries).toHaveLength(DIAGNOSTIC_MAX_ENTRIES);
    expect(service.snapshot().dropped).toBe(30);
    await service.flush();
    expect(parseDiagnosticPersistence(values.get(DIAGNOSTIC_STORAGE_KEY), Date.now())?.entries).toHaveLength(DIAGNOSTIC_MAX_ENTRIES);
  });
});

describe("the actual append-only native diagnostic bridge", () => {
  it("accepts a valid bounded batch but assigns its trusted host surface", () => {
    const raw = JSON.stringify({ type: "diagnostic-events", version: 1, events: [command] });
    expect(handleNativeDiagnosticMessage(raw, "trainer")).toBe(true);
    expect(nativeDiagnostics.snapshot().entries).toHaveLength(1);
    expect(nativeDiagnostics.snapshot().entries[0].event).toMatchObject({ type: "radio.command", surface: "trainer", action: "dial-push" });
  });

  it("accepts every event in the maximum16-event batch without trusting sender sequence metadata", () => {
    const raw = JSON.stringify({ type: "diagnostic-events", version: 1, events: Array.from({ length: 16 }, () => command) });
    expect(handleNativeDiagnosticMessage(raw, "radio")).toBe(true);
    const entries = nativeDiagnostics.snapshot().entries;
    expect(entries).toHaveLength(16);
    expect(new Set(entries.map(entry => entry.seq)).size).toBe(16);
    expect(entries.every(entry => entry.event.surface === "radio")).toBe(true);
  });

  it("does not consume unrelated, malformed or oversized messages", () => {
    for (const raw of ["not-json", "{", "[]", JSON.stringify({ type: "radio-exit" }), "{" + "x".repeat(DIAGNOSTIC_BATCH_MAX_BYTES + 128)]) expect(handleNativeDiagnosticMessage(raw, "radio")).toBe(false);
    expect(nativeDiagnostics.snapshot().entries).toEqual([]);
  });

  it("rejects unknown event fields without retaining private text or accepting a partial batch", () => {
    const privateEvent = { ...command, text: "PRIVATE_NAME_MMSI_POSITION_TRANSCRIPT" };
    expect(handleNativeDiagnosticMessage(JSON.stringify({ type: "diagnostic-events", version: 1, events: [command, privateEvent] }), "radio")).toBe(true);
    expect(nativeDiagnostics.snapshot().entries.map(entry => entry.event)).toEqual([{ type: "embedded.lifecycle", surface: "radio", action: "error", outcome: "rejected", reason: "invalid-message", source: "native" }]);
    expect(JSON.stringify(nativeDiagnostics.snapshot())).not.toContain("PRIVATE_");
  });

  it("refuses excess events, invalid versions and envelope metadata", () => {
    const invalid = [
      { type: "diagnostic-events", version: 1, events: Array.from({ length: 17 }, () => command) },
      { type: "diagnostic-events", version: 2, events: [command] },
      { type: "diagnostic-events", version: 1, events: [command], seq: 42, private: "PRIVATE_URL" },
    ];
    for (const message of invalid) expect(handleNativeDiagnosticMessage(JSON.stringify(message), "radio")).toBe(true);
    expect(nativeDiagnostics.snapshot().entries).toHaveLength(3);
    expect(nativeDiagnostics.snapshot().entries.every(entry => entry.event.outcome === "rejected")).toBe(true);
    expect(JSON.stringify(nativeDiagnostics.snapshot())).not.toContain("PRIVATE_");
  });
});
