import * as Haptics from "expo-haptics";
import { isRaceShell } from "./race-shell";

// M3-4 (owner decision #4): the race page in the WKWebView has no
// navigator.vibrate, so it posts {"type":"race-haptic","event":...} for the
// four race events (src/lib/race-haptics.ts) and the app plays them with
// expo-haptics. The message is checked strictly: exactly these two keys, one
// of four events, from a race screen (/game or /multiplayer) only. Every
// other WebView, a malformed message and anything within 300 ms of the last
// haptic are dropped. Steering never sends one, so it never vibrates.

export const NATIVE_RACE_HAPTIC_EVENTS = ["start", "mark", "contact", "finish"] as const;
export type NativeRaceHapticEvent = typeof NATIVE_RACE_HAPTIC_EVENTS[number];
/** Same limit as HAPTIC_MIN_INTERVAL_MS on the web side; the app keeps its own. */
export const NATIVE_HAPTIC_MIN_INTERVAL_MS = 300;
/** Cheap prefix test before parsing; JSON.stringify writes "type" first. */
export const RACE_HAPTIC_PREFIX = '{"type":"race-haptic"';

/** The event of a valid race-haptic message, or null. */
export function parseRaceHapticMessage(raw: unknown): NativeRaceHapticEvent | null {
  if (typeof raw !== "string" || raw.length > 64 || !raw.startsWith(RACE_HAPTIC_PREFIX)) return null;
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return null; }
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const keys = Object.keys(data);
  if (keys.length !== 2 || !keys.includes("type") || !keys.includes("event")) return null;
  const { type, event } = data as { type: unknown; event: unknown };
  if (type !== "race-haptic" || typeof event !== "string") return null;
  return (NATIVE_RACE_HAPTIC_EVENTS as readonly string[]).includes(event) ? event as NativeRaceHapticEvent : null;
}

/** expo-haptics per event: a firm gun, a medium mark, a warning for contact, success at the finish. */
export function playNativeRaceHaptic(event: NativeRaceHapticEvent): Promise<void> {
  switch (event) {
    case "start": return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    case "mark": return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    case "contact": return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    case "finish": return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

export type RaceHapticOutcome = "played" | "throttled" | "refused";

/**
 * One handler per app session. `handle` returns null when the message is not
 * a race-haptic message at all (the WebView keeps routing it), otherwise what
 * happened to it; a race-haptic message is never passed on.
 */
export function createNativeRaceHaptics(deps: { now: () => number; play: (event: NativeRaceHapticEvent) => Promise<void> } = { now: () => Date.now(), play: playNativeRaceHaptic }) {
  let last = -Infinity;
  return {
    handle(path: string, raw: string): RaceHapticOutcome | null {
      if (typeof raw !== "string" || !raw.startsWith(RACE_HAPTIC_PREFIX)) return null;
      const event = parseRaceHapticMessage(raw);
      if (!event || !isRaceShell(path)) return "refused";
      const t = deps.now();
      if (t - last < NATIVE_HAPTIC_MIN_INTERVAL_MS) return "throttled";
      last = t;
      try { void deps.play(event).catch(() => undefined); } catch { /* haptics never break the race */ }
      return "played";
    },
  };
}

/** The app-wide handler SimWebView uses. */
export const nativeRaceHaptics = createNativeRaceHaptics();
