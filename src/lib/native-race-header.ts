'use client';

import { useEffect } from "react";

/**
 * Package 11 (audit K6, top-5): one header in the app. A race screen that draws
 * its own header (the live room's cockpit, with Menu, time and place over the
 * scene) tells the native shell, which hides its own header while it lasts;
 * leaving the cockpit (lobby, results page) shows it again. A plain browser
 * has no bridge, so this is a silent no-op there.
 *
 * Message: {"type":"race-header","own":true|false} (mobile/src/simulator/race-shell.ts
 * reads it with raceHeaderMessage).
 */
export function announceOwnRaceHeader(own: boolean): void {
  if (typeof window === "undefined") return;
  const bridge = (window as Window & { ReactNativeWebView?: { postMessage: (message: string) => void } }).ReactNativeWebView;
  try { bridge?.postMessage(JSON.stringify({ type: "race-header", own })); } catch { /* not in the app */ }
}

/** While mounted, the page's own race header stands in for the native one. */
export function useOwnRaceHeader(): void {
  useEffect(() => {
    announceOwnRaceHeader(true);
    return () => announceOwnRaceHeader(false);
  }, []);
}
