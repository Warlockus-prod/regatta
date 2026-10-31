import { useCallback, useRef } from "react";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import type { EdgeInsets } from "react-native-safe-area-context";
import { useFocus } from "./orientation";

// Native shell around a race WebView (M0-7). A race is a live activity: an
// edge swipe must not pop it, the screen must not dim, landscape controls
// must clear the Dynamic Island and the rounded corners, and a killed web
// content process brings the race back instead of leaving a blank screen.

/** Routes whose WebView hosts a running race: the local race and replay, and the live room. */
export function isRaceShell(path: string): boolean {
  return path === "/game" || path === "/multiplayer";
}

/**
 * Stack options that keep a race on screen. The iOS back swipe starts at the
 * left edge, exactly where the helm sits in landscape, so it is off for the
 * whole race route; the race leaves through its own menu and Back.
 */
export function raceShellStackOptions(path: string): { gestureEnabled?: false; fullScreenGestureEnabled?: false } {
  return isRaceShell(path) ? { gestureEnabled: false, fullScreenGestureEnabled: false } : {};
}

/**
 * Side padding for a full-screen race. The race page has no safe-area CSS of
 * its own, so the native frame keeps the WebView out of the left and right
 * insets (zero in portrait, the island and corners in landscape). The page
 * background shows in the side bands.
 */
export function raceFrameInsets(insets: Pick<EdgeInsets, "left" | "right"> | null, fullScreen: boolean): { paddingLeft: number; paddingRight: number } | null {
  if (!fullScreen || !insets) return null;
  return { paddingLeft: Math.max(0, insets.left), paddingRight: Math.max(0, insets.right) };
}

/**
 * Offsets for the native overlays (spinner, error, memory notice) over a
 * full-screen race. An absolute child is placed against the frame's edge, not
 * inside its padding, so it takes the same side insets and, once the header
 * is hidden, the top inset the frame pads by. Zero everywhere else.
 */
export function raceOverlayInsets(insets: Pick<EdgeInsets, "top" | "left" | "right"> | null, fullScreen: boolean, headerShown: boolean): { top: number; left: number; right: number } {
  if (!fullScreen || !insets) return { top: 0, left: 0, right: 0 };
  return { top: headerShown ? 0 : Math.max(0, insets.top), left: Math.max(0, insets.left), right: Math.max(0, insets.right) };
}

/** Within this time after an automatic reload, a second process loss shows Retry instead of looping. */
export const RACE_PROCESS_RELOAD_WINDOW_MS = 60_000;

/** One automatic reload per window; a repeat loss in the window is a real failure. */
export function raceProcessRecovery(lastAutoReloadAt: number | null, now: number): "reload" | "fail" {
  return lastAutoReloadAt !== null && now - lastAutoReloadAt < RACE_PROCESS_RELOAD_WINDOW_MS ? "fail" : "reload";
}

// expo-keep-awake is a declared dependency (SDK 54 pins ~15.0.x), so the
// ExpoKeepAwake pod is autolinked from the app itself rather than reached
// through the `expo` package's own copy. Each race screen holds its own tag,
// so two stacked race screens release only their own lock.
let nextKeepAwakeTag = 0;

/** Keep the display on while this screen is focused; the native module releases it in the background. */
export function useKeepAwakeWhileFocused(enabled: boolean) {
  const tag = useRef<string | null>(null);
  if (tag.current === null) tag.current = `regatta-race-${nextKeepAwakeTag++}`;
  useFocus(useCallback(() => {
    const id = tag.current;
    if (!enabled || !id) return undefined;
    void activateKeepAwakeAsync(id).catch(() => undefined);
    return () => { void deactivateKeepAwake(id).catch(() => undefined); };
  }, [enabled]));
}
