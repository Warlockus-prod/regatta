// M1-2: on a desktop browser the race offers full screen once (a button in
// the status row during one race, never an automatic request), and the pause
// sheet keeps a full-screen entry afterwards. The native app and phones never
// see it: the app is full screen already and a phone browser rotates instead.
// The "offered" flag is a per-browser convenience in localStorage; when the
// storage is unavailable the offer simply shows again next race.

export const FULLSCREEN_OFFER_KEY = "regatta.race.fullscreen-offer.v1";

/** "unsupported" on the server, a touch device or a browser without the API. */
export type FullscreenState = "unsupported" | "off" | "on";

export function fullscreenState(): FullscreenState {
  if (typeof document === "undefined" || typeof window === "undefined") return "unsupported";
  try {
    if (!document.fullscreenEnabled || !window.matchMedia?.("(pointer: fine)").matches) return "unsupported";
  } catch { return "unsupported"; }
  return document.fullscreenElement ? "on" : "off";
}

export const fullscreenServerState = (): FullscreenState => "unsupported";

export function subscribeFullscreen(listener: () => void): () => void {
  if (typeof document === "undefined") return () => {};
  document.addEventListener("fullscreenchange", listener);
  return () => document.removeEventListener("fullscreenchange", listener);
}

/** Only from a click: browsers refuse a request without a user gesture. */
export function requestRaceFullscreen(): void {
  try {
    void document.documentElement.requestFullscreen?.().catch(() => {});
  } catch { /* A refused request keeps the race as it is. */ }
}

type FlagStorage = Pick<Storage, "getItem" | "setItem">;

function defaultStorage(): FlagStorage | null {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
}

export function fullscreenOfferAnswered(storage: FlagStorage | null = defaultStorage()): boolean {
  try { return storage?.getItem(FULLSCREEN_OFFER_KEY) === "1"; } catch { return false; }
}

export function markFullscreenOfferAnswered(storage: FlagStorage | null = defaultStorage()): void {
  try { storage?.setItem(FULLSCREEN_OFFER_KEY, "1"); } catch { /* Shown again next race. */ }
}
