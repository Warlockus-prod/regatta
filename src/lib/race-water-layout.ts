'use client';

import { useEffect } from "react";

/**
 * Package 31, owner decision R-45: the solo race with the water on the whole
 * phone screen and the helm over it. Since the owner's TestFlight notes on 81
 * (arrows and BEST VMG on the water, no blocks eating the screen, the same when
 * turned) and rule R-46 point 6 it is the race of every touch screen: the app
 * (a WKWebView reports a coarse pointer) and a phone or tablet browser. A
 * desktop with a mouse keeps the dock. ?water=1 forces it on, ?water=0 brings
 * the old dock back (for a check side by side). The trainers, the replay and
 * the live room do not read it.
 */
export function raceWaterLayoutOn(search: URLSearchParams, touch = touchScreen()): boolean {
  const asked = search.get("water");
  if (asked === "1") return true;
  if (asked === "0") return false;
  return touch;
}

/** A finger is the main pointer (phones, tablets, the app's web view). */
export function touchScreen(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  try { return window.matchMedia("(pointer: coarse)").matches; } catch { return false; }
}

/**
 * While the water layout is on screen the app's frame steps aside, so the scene
 * reaches the screen edges (the lobby and the results keep the frame). A plain
 * browser has no bridge, so this is a silent no-op there.
 *
 * Message: {"type":"race-water","on":true|false} (raceWaterMessage in
 * mobile/src/simulator/race-shell.ts).
 */
export function announceRaceWater(on: boolean): void {
  if (typeof window === "undefined") return;
  const bridge = (window as Window & { ReactNativeWebView?: { postMessage: (message: string) => void } }).ReactNativeWebView;
  try { bridge?.postMessage(JSON.stringify({ type: "race-water", on })); } catch { /* not in the app */ }
}

/**
 * A message can be lost: react-native-webview reinstalls its message handler
 * whenever an injected script changes (any stored row does that), and a message
 * posted meanwhile never arrives (seen on the simulator: the frame stayed when
 * the cockpit mounted right after the race's storage writes). So the state is
 * repeated: "on" while the cockpit is on screen, "off" a few times after it
 * leaves. The app's frame only reads the latest value, repeats change nothing.
 */
export const RACE_WATER_REPEAT_MS = 2000;
export const RACE_WATER_OFF_REPEATS_MS = [400, 1500] as const;
let pendingOff: number[] = [];

/** The cockpit's half of the message above. */
export function useRaceWaterEdges(on: boolean): void {
  useEffect(() => {
    if (!on) return undefined;
    pendingOff.forEach(id => window.clearTimeout(id));
    pendingOff = [];
    announceRaceWater(true);
    const repeat = window.setInterval(() => announceRaceWater(true), RACE_WATER_REPEAT_MS);
    return () => {
      window.clearInterval(repeat);
      announceRaceWater(false);
      pendingOff = RACE_WATER_OFF_REPEATS_MS.map(ms => window.setTimeout(() => announceRaceWater(false), ms));
    };
  }, [on]);
}
