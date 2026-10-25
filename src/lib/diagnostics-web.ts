import { createDiagnosticJournal, DIAGNOSTIC_STORAGE_KEY, EMPTY_DIAGNOSTIC_SNAPSHOT, parseDiagnosticBatch, parseDiagnosticPersistence, serializeDiagnosticPersistence,
  type DiagnosticInput, type DiagnosticJournal } from "./diagnostics";

const DEBOUNCE_MS = 400;
const serverJournal: DiagnosticJournal = Object.freeze({ record: () => null, snapshot: () => EMPTY_DIAGNOSTIC_SNAPSHOT,
  subscribe: () => () => {}, clear: () => {}, restore: () => false });
interface WebState { owner: Window; journal: DiagnosticJournal; initialized: boolean; timer: ReturnType<typeof setTimeout> | null; inputs: Set<(input: Readonly<DiagnosticInput>) => void> }
const states = new WeakMap<Window, WebState>();
function browserState(): WebState | null {
  if (typeof window === "undefined") return null;
  let state = states.get(window);
  if (!state) {
    const owner = window;
    state = { owner, journal: createDiagnosticJournal({ now: () => owner.performance?.now() ?? 0 }), initialized: false, timer: null, inputs: new Set() };
    states.set(owner, state);
  }
  return state;
}
function nativeHost(owner: Window): boolean { return Boolean((owner as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView); }
function flush(state: WebState): boolean {
  if (state.timer !== null) { clearTimeout(state.timer); state.timer = null; }
  // Native AsyncStorage is authoritative; Clear all must not revive WK rows.
  if (nativeHost(state.owner)) return true;
  try {
    const snapshot = state.journal.snapshot();
    if (!snapshot.entries.length && !snapshot.dropped) { state.owner.localStorage.removeItem(DIAGNOSTIC_STORAGE_KEY); return true; }
    const serialized = serializeDiagnosticPersistence(snapshot, Date.now());
    if (!serialized) return false;
    state.owner.localStorage.setItem(DIAGNOSTIC_STORAGE_KEY, serialized);
    return true;
  } catch { return false; }
}

/** Initialization is idempotent and cannot gate app startup or user commands. */
export function initializeWebDiagnostics(): DiagnosticJournal {
  const state = browserState();
  if (!state) return serverJournal;
  if (!state.initialized) {
    state.initialized = true;
    try {
      const saved = nativeHost(state.owner) ? null : parseDiagnosticPersistence(state.owner.localStorage.getItem(DIAGNOSTIC_STORAGE_KEY), Date.now());
      if (saved) state.journal.restore(saved);
    } catch { /* Private mode, corrupt data or unavailable storage: use memory. */ }
    state.journal.subscribe(() => {
      if (state.timer === null) state.timer = setTimeout(() => { flush(state); }, DEBOUNCE_MS);
    });
    try { state.owner.addEventListener?.("pagehide", () => { flush(state); }); } catch { /* Optional lifecycle hook cannot block startup. */ }
  }
  return state.journal;
}
export function getWebDiagnosticJournal(): DiagnosticJournal { return initializeWebDiagnostics(); }
export function recordWebDiagnostic(input: DiagnosticInput) {
  const journal = initializeWebDiagnostics(), state = browserState();
  // Emit original validated inputs, never a cumulative coalesced entry.
  const safe = parseDiagnosticBatch({ version: 1, events: [input] })?.events[0];
  const entry = journal.record(safe ?? input);
  if (state && entry && safe) for (const listener of state.inputs) { try { listener(safe); } catch { /* A bridge failure cannot break controls. */ } }
  return entry;
}
/** Inputs from recordWebDiagnostic only, excluding restore and clear. */
export function subscribeWebDiagnosticInput(listener: (input: Readonly<DiagnosticInput>) => void): () => void {
  initializeWebDiagnostics();
  const state = browserState();
  if (!state) return () => {};
  state.inputs.add(listener);
  return () => { state.inputs.delete(listener); };
}
export function flushWebDiagnostics(): boolean {
  const state = browserState();
  if (!state) return false;
  initializeWebDiagnostics();
  return flush(state);
}
