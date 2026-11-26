type NativeRaceEnvironment = Window & {
  __REGATTA_RACE_NATIVE__?: boolean;
  __REGATTA_EMBED__?: { path?: string; query?: string | Record<string, string> };
  ReactNativeWebView?: { postMessage: (message: string) => void };
};

/** Asset URLs cannot carry route state: native injects the same route/query. */
export function readRaceSearch(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  const query = (window as NativeRaceEnvironment).__REGATTA_EMBED__?.query;
  return new URLSearchParams(query ?? window.location.search);
}

export function isNativeRace(): boolean {
  return typeof window !== "undefined" && (window as NativeRaceEnvironment).__REGATTA_RACE_NATIVE__ === true;
}

/** A saved replay returns to native history instead of creating another race menu. */
export function navigateNativeRace(href: "/race" | "/history"): boolean {
  if (!isNativeRace() || (href !== "/race" && href !== "/history")) return false;
  const bridge = (window as NativeRaceEnvironment).ReactNativeWebView;
  if (!bridge) return false;
  bridge.postMessage(JSON.stringify({ type: "native-navigate", href }));
  return true;
}

/** M4-2: a practice or lesson link of the finish screen inside the app. The
 * app opens only destinations it knows (isRaceFinishNativeHref in
 * src/lib/race-practice.ts, checked by mobile/src/navigation/race-entry.ts). */
export function navigateNativeRaceFinish(href: string): boolean {
  if (!isNativeRace()) return false;
  const bridge = (window as NativeRaceEnvironment).ReactNativeWebView;
  if (!bridge) return false;
  bridge.postMessage(JSON.stringify({ type: "native-navigate", href }));
  return true;
}
