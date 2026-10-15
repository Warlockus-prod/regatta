import { STORAGE_CHANNEL, STORAGE_LIMIT, TRAINER_STORAGE_KEY, type StorageReply, type StorageRequest } from "./storage-protocol";
import { PRACTICE_RESULTS_KEY, mergePracticeResults, readPracticeResults } from "../lessons/practice-results";

declare global { interface Window {
  __REGATTA_SAILING_STORAGE__?: boolean;
  ReactNativeWebView?: { postMessage(message: string): void };
} }
let requestId = 0;

/** Native uses AsyncStorage: file-origin localStorage is not a reliable
 * upgrade-stable location for a bundled WKWebView. Never silently fall back
 * to a different store if the native bridge fails or times out.
 */
async function access(action: StorageRequest["action"], raw?: string, store?: "practice"): Promise<string | null> {
  if (raw && raw.length > STORAGE_LIMIT) throw new RangeError("Checkpoint too large");
  if (!window.__REGATTA_SAILING_STORAGE__) {
    const key = store === "practice" ? PRACTICE_RESULTS_KEY : TRAINER_STORAGE_KEY;
    if (action === "write") {
      const value = store === "practice" ? JSON.stringify(mergePracticeResults(readPracticeResults(window.localStorage.getItem(key)), readPracticeResults(raw!))) : raw!;
      window.localStorage.setItem(key, value);
    }
    return action === "read" ? window.localStorage.getItem(key) : null;
  }
  return new Promise((resolve, reject) => {
    const id = `${Date.now()}-${++requestId}`;
    const cleanup = () => { clearTimeout(timeout); window.removeEventListener(STORAGE_CHANNEL, receive); };
    const receive = (event: Event) => {
      const result = (event as CustomEvent<StorageReply>).detail;
      if (!result || result.id !== id) return;
      cleanup();
      if (result.ok && (result.raw === null || (typeof result.raw === "string" && result.raw.length <= STORAGE_LIMIT))) resolve(result.raw);
      else reject(new Error("Checkpoint storage unavailable"));
    };
    const timeout = setTimeout(() => { cleanup(); reject(new Error("Checkpoint storage timed out")); }, 5000);
    window.addEventListener(STORAGE_CHANNEL, receive);
    try {
      if (!window.ReactNativeWebView) throw new Error("Missing native storage bridge");
      window.ReactNativeWebView.postMessage(JSON.stringify({ channel: STORAGE_CHANNEL, id, action, raw, store } satisfies StorageRequest));
    } catch (error) { cleanup(); reject(error); }
  });
}
export const checkpointStorage = { read: () => access("read"), write: (raw: string) => access("write", raw) };
export const practiceStorage = { read: () => access("read", undefined, "practice"), write: (raw: string) => access("write", raw, "practice") };
