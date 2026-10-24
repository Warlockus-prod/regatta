import { examDirtyMessage, sternikEntries, STERNIK_STORAGE_KEYS } from "./model";

let examDirty = false;
let previous = "";

/** Shared exam pages already post dirty-state messages to this native bridge. */
export function installSternikBridge() {
  const original = window.ReactNativeWebView?.postMessage.bind(window.ReactNativeWebView);
  window.ReactNativeWebView = { postMessage(message: string) {
    const dirty = examDirtyMessage(message);
    if (dirty !== null) examDirty = dirty;
    original?.(message);
  } };
  try { window.localStorage.setItem("sternik.explLang.v1", "pl"); } catch { /* The host reports durable storage failures separately. */ }
  // Flush answer/exam writes immediately, including a quick native Back tap.
  try {
    const storage = window.localStorage, prototype = Object.getPrototypeOf(storage);
    for (const name of ["setItem", "removeItem"] as const) {
      const originalWrite = prototype[name];
      if (typeof originalWrite !== "function") continue;
      prototype[name] = function (this: Storage, key: string, value?: string) {
        const result = originalWrite.call(this, key, value);
        if (this === storage && STERNIK_STORAGE_KEYS.includes(key as typeof STERNIK_STORAGE_KEYS[number])) postSternikProgress();
        return result;
      };
    }
  } catch { /* The polling/pagehide fallback still works on a locked Storage prototype. */ }
}

export function canLeaveSternikExam() {
  if (!examDirty) return true;
  if (!window.confirm("Egzamin jest w toku. Opuścić go i utracić bieżące odpowiedzi?")) return false;
  examDirty = false;
  window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "exam-dirty", dirty: false }));
  return true;
}

export function collectSternikProgress() {
  const raw: Record<string, string> = {};
  try {
    for (const key of STERNIK_STORAGE_KEYS) {
      const value = window.localStorage.getItem(key);
      if (value !== null) raw[key] = value;
    }
  } catch { return null; }
  return sternikEntries(raw);
}

export function postSternikProgress(force = false) {
  const entries = collectSternikProgress();
  if (!entries) {
    window.dispatchEvent(new CustomEvent("regatta:sternik-storage-error", { detail: { code: "storage-unavailable" } }));
    return;
  }
  const serialized = JSON.stringify(entries);
  if (!force && serialized === previous) return;
  previous = serialized;
  window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "sternik-offline-progress", entries }));
}
