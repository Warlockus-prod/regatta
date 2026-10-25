import AsyncStorage from "@react-native-async-storage/async-storage";
import { createDiagnosticJournal, DIAGNOSTIC_STORAGE_KEY, DIAGNOSTIC_BATCH_MAX_BYTES, parseDiagnosticBatch, parseDiagnosticPersistence, serializeDiagnosticPersistence,
  type DiagnosticInput, type DiagnosticSurface } from "../../../src/lib/diagnostics";

export interface DiagnosticStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** Diagnostics never gate startup, commands or course persistence. */
export function createNativeDiagnosticService(storage: DiagnosticStorage, now: () => number = Date.now) {
  const journal = createDiagnosticJournal({ now });
  let boot: Promise<void> | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let tail = Promise.resolve();
  let flushing: Promise<void> | null = null;
  let flushAgain = false;
  let epoch = 0;
  let suspended = false;
  let persistenceAvailable = true;
  const stopTimer = () => { if (timer !== null) clearTimeout(timer); timer = null; };
  const initialize = (): Promise<void> => {
    if (boot) return boot;
    const ticket = epoch;
    let deadline: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => { deadline = setTimeout(() => reject(new Error("diagnostic-read-timeout")), 2000); });
    boot = Promise.race([Promise.resolve().then(() => storage.getItem(DIAGNOSTIC_STORAGE_KEY)), timeout])
      .then(raw => { if (ticket !== epoch || suspended) return; const saved = parseDiagnosticPersistence(raw, Date.now()); if (saved) journal.restore(saved); })
      .catch(() => { persistenceAvailable = false; })
      .finally(() => clearTimeout(deadline));
    return boot;
  };
  const flush = (): Promise<void> => {
    stopTimer();
    if (flushing) { flushAgain = true; return flushing; }
    const ticket = epoch;
    tail = tail.catch(() => {}).then(async () => {
      await initialize();
      if (suspended || ticket !== epoch) return;
      const snapshot = journal.snapshot();
      const serialized = serializeDiagnosticPersistence(snapshot, Date.now());
      if (!serialized) return;
      if (!snapshot.entries.length && !snapshot.dropped) await storage.removeItem(DIAGNOSTIC_STORAGE_KEY);
      else await storage.setItem(DIAGNOSTIC_STORAGE_KEY, serialized);
      // A wipe may happen while an already-issued native write is finishing.
      if (suspended || ticket !== epoch) await storage.removeItem(DIAGNOSTIC_STORAGE_KEY);
    }).catch(() => { persistenceAvailable = false; });
    flushing = tail.finally(() => {
      flushing = null;
      if (flushAgain && !suspended) { flushAgain = false; void flush(); }
    });
    return flushing;
  };
  journal.subscribe(() => {
    if (!suspended && timer === null) timer = setTimeout(() => { void flush(); }, 400);
  });
  return {
    initialize,
    snapshot: journal.snapshot,
    subscribe: journal.subscribe,
    persistenceAvailable: () => persistenceAvailable,
    record(input: DiagnosticInput) {
      void initialize();
      try { return journal.record(input); } catch { return null; }
    },
    flush,
    clear(): Promise<void> {
      epoch += 1; stopTimer(); journal.clear(); stopTimer();
      tail = tail.catch(() => {}).then(() => storage.removeItem(DIAGNOSTIC_STORAGE_KEY)).catch(() => { persistenceAvailable = false; });
      return tail;
    },
    /** Global Clear all data must not be followed by a delayed log write. */
    suspendForGlobalClear() {
      suspended = true; epoch += 1; stopTimer(); journal.clear();
      void tail.then(() => storage.removeItem(DIAGNOSTIC_STORAGE_KEY)).catch(() => {});
    },
  };
}

export const nativeDiagnostics = createNativeDiagnosticService(AsyncStorage);
export const recordNativeDiagnostic = (input: DiagnosticInput) => nativeDiagnostics.record(input);

/** Append-only bridge. Raw message contents and unrecognized fields never enter logs. */
export function handleNativeDiagnosticMessage(raw: string, surface: DiagnosticSurface): boolean {
  if (raw.length > DIAGNOSTIC_BATCH_MAX_BYTES + 128 || !raw.startsWith("{")) return false;
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return false; }
  if (!value || typeof value !== "object" || Array.isArray(value) || (value as { type?: unknown }).type !== "diagnostic-events") return false;
  const data = value as Record<string, unknown>;
  const batch = Object.keys(data).every(key => ["type", "version", "events"].includes(key)) ? parseDiagnosticBatch({ version: data.version, events: data.events }) : null;
  if (!batch) {
    recordNativeDiagnostic({ type: "embedded.lifecycle", surface, action: "error", outcome: "rejected", reason: "invalid-message", source: "native" });
    return true;
  }
  for (const event of batch.events) recordNativeDiagnostic({ ...event, surface });
  return true;
}
