/**
 * Race haptics (M3-4, owner decision #4, 2026-10-31): a short vibration on
 * four race events only - the start gun, a mark rounding, a contact with
 * another boat and the finish. Steering, the wheels and the sheets never
 * vibrate: nothing here is called from a control.
 *
 * - The choice is its own, ON by default, stored in `regatta.race.haptics.v1`
 *   ("on" / "off") the same way as race sound (race-sound-pref.ts), and every
 *   change is recorded as the "haptics" preference in diagnostics.
 * - At most one vibration per HAPTIC_MIN_INTERVAL_MS: the throttle lives in
 *   createRaceHaptics(), the only path to a vibration, so a fake clock drives
 *   it in tests. A burst (a mark and a contact in the same tick) keeps the
 *   first event and drops the rest.
 * - Web: navigator.vibrate with a short pattern per event.
 * - iOS app: the race page runs in a WKWebView, which has no vibrate. The page
 *   posts {type:"race-haptic", event} and the app maps it to expo-haptics
 *   (mobile/src/simulator/race-haptics.ts, with its own 300 ms throttle and a
 *   strict check of the message).
 * - The switch is shown only where a vibration can happen
 *   (raceHapticsAvailable): the app WebView, or a touch browser with
 *   navigator.vibrate. The app WebView counts only when the app announced
 *   its handler with window.__REGATTA_RACE_HAPTICS__ === true (SimWebView,
 *   race screens only): an older installed build loads the same live
 *   /multiplayer page but cannot play a haptic, so it gets no switch, no
 *   race-haptic message and no "haptics" diagnostics row its parser would
 *   reject.
 */

import { recordPreferenceChange } from "@/lib/diagnostics-controls";
import type { StartSignal } from "@/lib/race-start-signals";

export const RACE_HAPTICS_KEY = "regatta.race.haptics.v1";
export const RACE_HAPTICS_EVENT = "regatta:race-haptics";
/** No two vibrations closer than this (decision #4). */
export const HAPTIC_MIN_INTERVAL_MS = 300;

export const RACE_HAPTIC_EVENTS = ["start", "mark", "contact", "finish"] as const;
export type RaceHapticEvent = typeof RACE_HAPTIC_EVENTS[number];

/**
 * navigator.vibrate patterns, milliseconds (on, off, on...). Short and
 * distinct: one firm pulse for the gun, a double tap for a mark, one longer
 * buzz for a contact, a rising triple for the finish. Each stays under 300 ms
 * of total length, so the throttle never cuts one short.
 */
export const HAPTIC_PATTERNS: Readonly<Record<RaceHapticEvent, readonly number[]>> = {
  start: [60],
  mark: [25, 50, 25],
  contact: [90],
  finish: [30, 40, 30, 40, 80],
};

/** Set by the app (mobile/src/simulator/SimWebView.tsx) on race screens whose native side plays race-haptic messages. */
export const RACE_HAPTICS_CAPABILITY = "__REGATTA_RACE_HAPTICS__";
/** The app dispatches this after injecting its flags (languageScript in SimWebView). */
const EMBED_EVENT = "regatta-embed";

type HapticWindow = Window & {
  ReactNativeWebView?: { postMessage: (message: string) => void };
  __REGATTA_RACE_HAPTICS__?: unknown;
};

/** The choice of this page when storage refused to save it; null while storage holds the truth. */
let memory: boolean | null = null;

/** True when race events may vibrate. Default on (decision #4). */
export function readRaceHaptics(): boolean {
  if (typeof window === "undefined") return false;
  if (memory !== null) return memory;
  try {
    const stored = window.localStorage.getItem(RACE_HAPTICS_KEY);
    if (stored === "off") return false;
  } catch { /* storage unavailable: the default applies */ }
  return true;
}

/** Saves the choice and records it in diagnostics. In the iOS app the race storage bridge forwards the row to AsyncStorage. */
export function writeRaceHaptics(on: boolean, surface: "race" | "multiplayer" = "race"): void {
  if (typeof window === "undefined") return;
  const previous = readRaceHaptics();
  memory = null;
  try { window.localStorage.setItem(RACE_HAPTICS_KEY, on ? "on" : "off"); } catch { memory = on; }
  try { recordPreferenceChange(surface, "haptics", on, previous); } catch { /* diagnostics never block the choice */ }
  window.dispatchEvent(new Event(RACE_HAPTICS_EVENT));
}

export function subscribeRaceHaptics(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => { if (e.key === RACE_HAPTICS_KEY) { memory = null; onChange(); } };
  window.addEventListener(RACE_HAPTICS_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(RACE_HAPTICS_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** The app bridge, only when the app announced a native race-haptic handler for this screen. */
function nativeBridge(w: HapticWindow): HapticWindow["ReactNativeWebView"] | null {
  if (w[RACE_HAPTICS_CAPABILITY] !== true) return null;
  const bridge = w.ReactNativeWebView;
  return bridge && typeof bridge.postMessage === "function" ? bridge : null;
}

function webVibrate(w: Window): ((pattern: number[]) => boolean) | null {
  const nav = w.navigator as Navigator | undefined;
  if (!nav || typeof nav.vibrate !== "function") return null;
  // Desktop Chrome has the function but no motor: only a touch device can vibrate.
  const touch = (nav.maxTouchPoints ?? 0) > 0 || (typeof w.matchMedia === "function" && w.matchMedia("(pointer: coarse)").matches);
  return touch ? (pattern: number[]) => nav.vibrate(pattern) : null;
}

/** Where a race event can actually vibrate: inside the app WebView, or a touch browser with navigator.vibrate. */
export function raceHapticsAvailable(): boolean {
  if (typeof window === "undefined") return false;
  try { return Boolean(nativeBridge(window as HapticWindow) || webVibrate(window)); } catch { return false; }
}

/** Availability changes only when the app (re)injects its flags; the switch listens for that. */
export function subscribeRaceHapticsAvailable(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(EMBED_EVENT, onChange);
  return () => window.removeEventListener(EMBED_EVENT, onChange);
}

export interface RaceHapticsDeps {
  now: () => number;
  enabled: () => boolean;
  /** The app bridge, or null in a browser. */
  post: ((message: string) => void) | null;
  /** navigator.vibrate on a touch device, or null. */
  vibrate: ((pattern: number[]) => boolean) | null;
}

/**
 * The one path to a vibration. Returns true when a vibration was asked for.
 * Unknown events, the switch off, no output and anything within
 * HAPTIC_MIN_INTERVAL_MS of the last vibration are dropped.
 */
export function createRaceHaptics(deps: RaceHapticsDeps) {
  let last = -Infinity;
  return {
    fire(event: RaceHapticEvent): boolean {
      if (!(RACE_HAPTIC_EVENTS as readonly string[]).includes(event)) return false;
      if (!deps.enabled() || (!deps.post && !deps.vibrate)) return false;
      const t = deps.now();
      if (t - last < HAPTIC_MIN_INTERVAL_MS) return false;
      try {
        if (deps.post) deps.post(JSON.stringify({ type: "race-haptic", event }));
        else deps.vibrate!([...HAPTIC_PATTERNS[event]]);
      } catch { return false; }
      last = t;
      return true;
    },
  };
}

function windowDeps(): RaceHapticsDeps {
  const w = typeof window === "undefined" ? null : window as HapticWindow;
  const bridge = w ? nativeBridge(w) : null;
  return {
    now: () => (typeof performance !== "undefined" ? performance.now() : Date.now()),
    enabled: readRaceHaptics,
    post: bridge ? (message: string) => bridge.postMessage(message) : null,
    vibrate: w && !bridge ? webVibrate(w) : null,
  };
}

let shared: ReturnType<typeof createRaceHaptics> | null = null;

/** A race event happened for the player's boat: vibrate if the switch is on and the device can. */
export function raceHaptic(event: RaceHapticEvent): void {
  if (typeof window === "undefined") return;
  try { (shared ??= createRaceHaptics(windowDeps())).fire(event); } catch { /* haptics never break the race */ }
}

/** The start gun of the start signals (race-start-signals.ts) vibrates; the horn and the short signals do not. */
export function raceStartHaptic(signal: StartSignal | null | undefined): void {
  if (signal === "start") raceHaptic("start");
}

/** Tests only: forget the shared instance (its clock and output). */
export function resetRaceHapticsForTests(): void { shared = null; memory = null; }
